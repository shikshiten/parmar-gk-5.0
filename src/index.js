/**
 * Test endpoint to see if Cloudflare Worker can fetch Vidmoly master.m3u8
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/test-cf') {
      try {
        const embedRes = await fetch('https://vidmoly.biz/embed-s2ddtw7woydo.html', {
          headers: { 'User-Agent': UA, 'Referer': 'https://vidmoly.biz/' }
        });
        const html = await embedRes.text();
        const m = html.match(/file\s*:\s*['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/);
        if (!m) return new Response(JSON.stringify({ error: 'No stream found in HTML', len: html.length }), { headers: { 'Content-Type': 'application/json' } });
        
        const streamUrl = m[1];
        
        // Test fetching stream from CF worker
        const streamRes = await fetch(streamUrl, {
          headers: { 'User-Agent': UA, 'Referer': 'https://vidmoly.biz/' }
        });
        
        return new Response(JSON.stringify({
          embedStatus: embedRes.status,
          streamUrl: streamUrl,
          streamStatus: streamRes.status,
          streamHeaders: Object.fromEntries(streamRes.headers.entries())
        }), { headers: { 'Content-Type': 'application/json' } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message, stack: e.stack }), { headers: { 'Content-Type': 'application/json' } });
      }
    }

    return env.ASSETS.fetch(request);
  }
};
