#!/usr/bin/env node
/**
 * Parmar GK 5.0 - Local Development Server
 *
 * Serves the static site from ./public and provides the same video
 * resolver / HLS proxy API as the Cloudflare Worker (src/index.js).
 *
 * Usage:
 *   node server.js                 -> http://localhost:8080
 *   node server.js --port 3000
 *   node server.js --no-open
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { Readable } = require('node:stream');
const { exec } = require('node:child_process');

const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT) || readFlag('--port') || 8080;
const HOST = process.env.HOST || '0.0.0.0';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

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

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.map': 'application/json; charset=utf-8'
};

const resolveCache = new Map();
const RESOLVE_TTL = 8 * 60 * 1000;

function readFlag(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  return value && !value.startsWith('--') ? value : true;
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
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

async function handleResolve(req, res, url) {
  const code = (url.searchParams.get('code') || '').trim();
  if (!/^[A-Za-z0-9]{4,32}$/.test(code)) {
    return sendJson(res, 400, { error: 'Invalid video code' });
  }

  const cached = resolveCache.get(code);
  if (cached && Date.now() - cached.at < RESOLVE_TTL) {
    return sendJson(res, 200, cached.data);
  }

  let html = '';
  let lastStatus = 0;

  for (const host of ['https://vidmoly.biz', 'https://vidmoly.me']) {
    try {
      const upstream = await fetch(`${host}/embed-${code}.html`, {
        headers: {
          'User-Agent': UA,
          Referer: `${host}/`,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        redirect: 'follow'
      });
      lastStatus = upstream.status;
      if (!upstream.ok) continue;
      const text = await upstream.text();
      if (text && /m3u8|sources\s*:/.test(text)) {
        html = text;
        break;
      }
    } catch (e) {
      /* try the next mirror */
    }
  }

  if (!html) {
    return sendJson(res, 502, {
      error: 'Could not load the video page',
      status: lastStatus
    });
  }

  const streamUrl = extractStreamUrl(html);
  if (!streamUrl) {
    return sendJson(res, 404, { error: 'Video stream not found' });
  }

  const data = {
    success: true,
    code,
    streamUrl,
    proxyUrl: '/api/hls?u=' + encodeURIComponent(streamUrl),
    poster: extractPoster(html)
  };

  resolveCache.set(code, { at: Date.now(), data });
  console.log(`[resolve] ${code} -> ${streamUrl.slice(0, 90)}...`);
  return sendJson(res, 200, data);
}

async function handleHls(req, res, url) {
  const target = url.searchParams.get('u');
  if (!target) return sendJson(res, 400, { error: 'Missing stream url' });
  if (!isAllowedTarget(target)) {
    return sendJson(res, 403, { error: 'Host not allowed' });
  }

  const proxyAll = url.searchParams.get('all') === '1';

  const upstreamHeaders = {
    'User-Agent': UA,
    Referer: 'https://vidmoly.biz/',
    Origin: 'https://vidmoly.biz',
    Accept: '*/*'
  };
  if (req.headers.range) upstreamHeaders.Range = req.headers.range;

  let upstream;
  try {
    upstream = await fetch(target, {
      method: 'GET',
      headers: upstreamHeaders,
      redirect: 'follow'
    });
  } catch (e) {
    console.error('[hls] fetch failed:', e.message);
    return sendJson(res, 502, { error: 'Upstream fetch failed' });
  }

  const contentType = upstream.headers.get('content-type') || '';
  const isManifest =
    /mpegurl|m3u8/i.test(contentType) || /\.m3u8(\?|#|$)/i.test(target);

  if (isManifest) {
    const text = await upstream.text();
    const headers = {
      'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    };
    if (!text.trim().startsWith('#EXTM3U')) {
      res.writeHead(upstream.status, headers);
      return res.end(text);
    }
    res.writeHead(200, headers);
    return res.end(rewritePlaylist(text, target, proxyAll));
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges'
  };
  for (const name of [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'cache-control',
    'etag',
    'last-modified'
  ]) {
    const value = upstream.headers.get(name);
    if (value) headers[name] = value;
  }
  if (!headers['accept-ranges'] && !headers['Accept-Ranges']) {
    headers['Accept-Ranges'] = 'bytes';
  }

  res.writeHead(upstream.status, headers);
  if (!upstream.body) return res.end();

  Readable.fromWeb(upstream.body)
    .on('error', () => res.destroy())
    .pipe(res);
}

function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/' || pathname === '') pathname = '/index.html';

  const filePath = path.normalize(path.join(PUBLIC_DIR, pathname));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // SPA-style fallback
      const fallback = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(fallback, (fallbackErr, data) => {
        if (fallbackErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('Not found');
        }
        res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] });
        res.end(data);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const headers = {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control':
        ext === '.html'
          ? 'no-cache'
          : ext === '.js' || ext === '.css'
            ? 'public, max-age=300'
            : 'public, max-age=3600'
    };

    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath)
      .on('error', () => res.destroy())
      .pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges'
    });
    return res.end();
  }

  if (url.pathname === '/api/resolve' || url.pathname === '/api/stream') {
    return handleResolve(req, res, url).catch((err) => {
      console.error('[resolve] error:', err);
      if (!res.headersSent) sendJson(res, 500, { error: 'Resolver error' });
    });
  }

  if (url.pathname === '/api/hls') {
    return handleHls(req, res, url).catch((err) => {
      console.error('[hls] error:', err);
      if (!res.headersSent) sendJson(res, 500, { error: 'Proxy error' });
    });
  }

  if (url.pathname.startsWith('/api/')) {
    return sendJson(res, 404, { error: 'Not found' });
  }

  serveStatic(req, res, url);
});

function lanAddresses() {
  const list = [];
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        list.push(`http://${iface.address}:${PORT}`);
      }
    }
  }
  return list;
}

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('========================================================');
  console.log("  𝑷𝑨𝑹𝑴𝑨𝑹'𝑺 𝑮𝑲 𝟓.𝟎 𝑻𝑶𝑷𝑷𝑬𝑹𝑺 𝑩𝑨𝑻𝑪𝑯 - Local Server");
  console.log('  Dedicated player + HLS proxy API enabled');
  console.log('========================================================');
  console.log(`  Local:   http://localhost:${PORT}`);
  for (const addr of lanAddresses()) {
    console.log(`  Network: ${addr}`);
  }
  console.log('');
  console.log('  Press Ctrl+C to stop.');
  console.log('');

  if (process.argv.indexOf('--no-open') === -1) {
    const target = `http://localhost:${PORT}`;
    if (process.platform === 'win32') {
      exec(`start "" "${target}"`);
    } else if (process.platform === 'darwin') {
      exec(`open "${target}"`);
    } else {
      exec(`xdg-open "${target}"`);
    }
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} is already in use. Try: node server.js --port 8081\n`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
