export default {
  async fetch(request, env, ctx) {
    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Get the path after /proxy/
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/proxy/, '');

    // Only allow Sefaria API endpoints
    const sefariaApiBase = 'https://www.sefaria.org';
    const targetUrl = sefariaApiBase + path + (url.search || '');

    // Forward the request to Sefaria
    const apiResponse = await fetch(targetUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    // Copy the response, but add CORS headers
    const responseBody = apiResponse.body;
    const responseHeaders = new Headers(apiResponse.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type');

    return new Response(responseBody, {
      status: apiResponse.status,
      statusText: apiResponse.statusText,
      headers: responseHeaders,
    });
  },
}; 