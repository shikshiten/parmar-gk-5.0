/**
 * Parmar GK 5.0 - Video Resolver & HLS Proxy (Cloudflare Worker)
 *
 * Endpoints:
 *   GET /api/resolve?code=VIDEO_CODE
 *       -> resolves a Vidmoly embed page into a playable HLS manifest URL.
 *   GET /api/hls?u=<encoded-url>[&all=1]
 *       -> proxies HLS playlists/segments (adds Referer, rewrites playlists,
 *          forwards Range requests, exposes CORS headers).
 *
 * Everything else falls through to the static assets in ./public.
 */

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/* Only proxy known Vidmoly / partner CDN hosts (prevents open-proxy abuse). */
const ALLOWED_HOST_SUFFIXES = [
  'vmpx.online',
  'vmcld.space',
  'vidmoly.biz',
  'vidmoly.me',
  'vidmoly.to',
  'vidmoly.net',
  'vidmoly.org',
  'staticmoly.me',
  'moly.to',
  'vmsky.space',
  'vmeas.space',
  'vmeas.cloud',
  'vbcdn.net'
];

const resolveCache = new Map(); // code -> { at, data }
const RESOLVE_TTL = 8 * 60 * 1000;

function corsHeaders(extra = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
    ...extra
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    })
  });
}

function isAllowedTarget(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const host = u.hostname.toLowerCase();
    return ALLOWED_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith('.' + suffix)
    );
  } catch (e) {
    return false;
  }
}

function extractStreamUrl(html) {
  const patterns = [
    /sources\s*:\s*\[\s*\{[^}]*?file\s*:\s*['"]([^'"]+)['"]/s,
    /file\s*:\s*['"](https?:[^'"]+\.m3u8[^'"]*)['"]/,
    /['"](https?:[^'"]+\/master\.m3u8[^'"]*)['"]/,
    /['"](https?:[^'"]+\.m3u8[^'"]*)['"]/
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) {
      return m[1].replace(/\\\//g, '/').replace(/&amp;/g, '&');
    }
  }
  return null;
}

function extractPoster(html) {
  const m = html.match(/image\s*:\s*['"]([^'"]+)['"]/);
  return m && m[1] ? m[1].replace(/\\\//g, '/') : null;
}

function rewritePlaylist(text, baseUrl, proxyAll) {
  const toProxy = (absolute) =>
    '/api/hls?u=' + encodeURIComponent(absolute) + (proxyAll ? '&all=1' : '');

  const shouldProxy = (absolute) =>
    proxyAll || /\.m3u8(\?|#|$)/i.test(absolute);

  // Rewrite URI="..." attributes (EXT-X-KEY, EXT-X-MAP, EXT-X-MEDIA, EXT-X-I-FRAME...)
  let out = text.replace(/URI="([^"]+)"/g, (whole, uri) => {
    try {
      const abs = new URL(uri, baseUrl).toString();
      return shouldProxy(abs) ? `URI="${toProxy(abs)}"` : `URI="${abs}"`;
    } catch (e) {
      return whole;
    }
  });

  const lines = out.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    try {
      const abs = new URL(line, baseUrl).toString();
      lines[i] = shouldProxy(abs) ? toProxy(abs) : abs;
    } catch (e) {
      /* leave malformed line untouched */
    }
  }
  return lines.join('\n');
}

async function handleResolve(url) {
  const code = (url.searchParams.get('code') || '').trim();
  if (!/^[A-Za-z0-9]{4,32}$/.test(code)) {
    return json({ error: 'Invalid video code' }, 400);
  }

  const cached = resolveCache.get(code);
  if (cached && Date.now() - cached.at < RESOLVE_TTL) {
    return json(cached.data);
  }

  let html = '';
  let lastStatus = 0;

  for (const host of ['https://vidmoly.biz', 'https://vidmoly.me']) {
    try {
      const res = await fetch(`${host}/embed-${code}.html`, {
        headers: {
          'User-Agent': UA,
          Referer: `${host}/`,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        redirect: 'follow'
      });
      lastStatus = res.status;
      if (!res.ok) continue;
      const text = await res.text();
      if (text && /m3u8|sources\s*:/.test(text)) {
        html = text;
        break;
      }
    } catch (e) {
      /* try the next mirror */
    }
  }

  if (!html) {
    return json({ error: 'Could not load the video page', status: lastStatus }, 502);
  }

  const streamUrl = extractStreamUrl(html);
  if (!streamUrl) {
    return json({ error: 'Video stream not found' }, 404);
  }

  const data = {
    success: true,
    code,
    streamUrl,
    proxyUrl: '/api/hls?u=' + encodeURIComponent(streamUrl),
    poster: extractPoster(html)
  };

  resolveCache.set(code, { at: Date.now(), data });
  return json(data);
}

async function handleHls(request, url) {
  const target = url.searchParams.get('u');
  if (!target) return json({ error: 'Missing stream url' }, 400);
  if (!isAllowedTarget(target)) return json({ error: 'Host not allowed' }, 403);

  const proxyAll = url.searchParams.get('all') === '1';

  const upstreamHeaders = {
    'User-Agent': UA,
    Referer: 'https://vidmoly.biz/',
    Origin: 'https://vidmoly.biz',
    Accept: '*/*'
  };
  const range = request.headers.get('Range');
  if (range) upstreamHeaders.Range = range;

  let upstream;
  try {
    upstream = await fetch(target, {
      method: 'GET',
      headers: upstreamHeaders,
      redirect: 'follow'
    });
  } catch (e) {
    return json({ error: 'Upstream fetch failed' }, 502);
  }

  const contentType = upstream.headers.get('Content-Type') || '';
  const isManifest =
    /mpegurl|m3u8/i.test(contentType) || /\.m3u8(\?|#|$)/i.test(target);

  if (isManifest) {
    const text = await upstream.text();
    const headers = corsHeaders({
      'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    if (!text.trim().startsWith('#EXTM3U')) {
      return new Response(text, { status: upstream.status, headers });
    }
    return new Response(rewritePlaylist(text, target, proxyAll), {
      status: 200,
      headers
    });
  }

  const headers = new Headers(corsHeaders());
  const passthrough = [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'cache-control',
    'etag',
    'last-modified'
  ];
  for (const name of passthrough) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (!headers.has('Accept-Ranges')) headers.set('Accept-Ranges', 'bytes');

  return new Response(upstream.body, {
    status: upstream.status,
    headers
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (url.pathname === '/api/resolve' || url.pathname === '/api/stream') {
      return handleResolve(url);
    }
    if (url.pathname === '/api/hls') {
      return handleHls(request, url);
    }
    if (url.pathname.startsWith('/api/')) {
      return json({ error: 'Not found' }, 404);
    }

    return env.ASSETS.fetch(request);
  }
};
