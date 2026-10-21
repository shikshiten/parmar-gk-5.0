/**
 * Parmar GK 5.0 - Cloudflare Worker Edge Handler
 * 
 * Serves the web app and static assets cleanly via Cloudflare ASSETS.
 */

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
      return new Response(JSON.stringify({ status: 'ok', service: 'parmar-gk-5.0', timestamp: Date.now() }), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Pass through to static assets
    return env.ASSETS.fetch(request);
  }
};
