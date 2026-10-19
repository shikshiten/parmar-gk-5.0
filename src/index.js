export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API route to resolve stream dynamically from Vidmoly
    if (url.pathname === '/api/stream') {
      const code = url.searchParams.get('code');
      if (!code) {
        return new Response(JSON.stringify({ error: 'Missing video code' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      try {
        const embedRes = await fetch(`https://vidmoly.biz/embed-${code}.html`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://vidmoly.biz/'
          }
        });
        const html = await embedRes.text();
        let streamUrl = null;
        const match = html.match(/sources:\s*\[\{\s*file:\s*['"]([^'"]+)['"]/);
        if (match && match[1]) {
          streamUrl = match[1];
        } else {
          const m3u8Match = html.match(/['"](https?:\/\/[^'"]+master\.m3u8[^'"]*)['"]/);
          if (m3u8Match && m3u8Match[1]) {
            streamUrl = m3u8Match[1];
          }
        }

        if (streamUrl) {
          return new Response(JSON.stringify({ success: true, streamUrl }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        return new Response(JSON.stringify({ error: 'Stream not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // Serve static assets from public/
    return env.ASSETS.fetch(request);
  }
};
