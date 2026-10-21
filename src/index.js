/**
 * Parmar GK 5.0 - Cloudflare Worker Edge Handler
 * 
 * Serves the web app and provides high-speed direct stream resolution.
 */

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store'
    }
  });
}

async function handleResolve(url) {
  const code = url.searchParams.get('code');
  if (!code) return json({ error: 'Missing video code' }, 400);

  const mirrors = ['https://vidmoly.biz', 'https://vidmoly.org', 'https://vidmoly.me'];
  for (const host of mirrors) {
    try {
      const res = await fetch(`${host}/embed-${code}.html`, {
        headers: {
          'User-Agent': UA,
          'Referer': `${host}/`,
          'Accept': 'text/html'
        }
      });
      if (!res.ok) continue;
      const html = await res.text();
      const m = html.match(/file\s*:\s*['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/) ||
                html.match(/['"](https?:\/\/[^'"]+\/master\.m3u8[^'"]*)['"]/);
      if (m && m[1]) {
        const imgMatch = html.match(/image\s*:\s*['"]([^'"]+)['"]/);
        return json({
          success: true,
          code,
          streamUrl: m[1].replace(/\\\//g, '/').replace(/&amp;/g, '&'),
          poster: imgMatch ? imgMatch[1].replace(/\\\//g, '/') : null
        });
      }
    } catch (e) {}
  }
  return json({ error: 'Stream not found' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': '*'
        }
      });
    }

    // Health check endpoint
    if (url.pathname === '/api/health') {
      return json({ status: 'ok', service: 'parmar-gk-5.0', timestamp: Date.now() });
    }

    // Stream resolver (returns direct m3u8 stream URL, does not proxy segments)
    if (url.pathname === '/api/resolve') {
      return handleResolve(url);
    }

    // Pass through to static assets
    return env.ASSETS.fetch(request);
  }
};
