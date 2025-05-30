export default {
	async fetch(request, env, ctx) {
	  // Only allow GET requests
	  if (request.method !== 'GET') {
		return new Response('Method Not Allowed', { status: 405 });
	  }
  
	  // Get the path after /proxy/
	  const url = new URL(request.url);
	  console.log('Original URL:', request.url);
	  console.log('Pathname:', url.pathname);
  
	  // Remove /proxy from the path
	  let path = url.pathname.replace(/^\/proxy/, '');
	  console.log('Path after /proxy removal:', path);
  
	  // Only allow Sefaria API endpoints
	  const sefariaApiBase = 'https://www.sefaria.org';
	  const targetUrl = sefariaApiBase + path + (url.search || '');
  
	  console.log('Proxying request to:', targetUrl);
  
	  try {
		// Forward the request to Sefaria
		const apiResponse = await fetch(targetUrl, {
		  headers: {
			'Accept': 'application/json',
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
		  },
		});
  
		console.log('Sefaria API response status:', apiResponse.status);
  
		// Get the response body
		const responseBody = await apiResponse.text();
		console.log('Response body preview:', responseBody.substring(0, 200));
  
		// Create new headers
		const responseHeaders = new Headers({
		  'Access-Control-Allow-Origin': '*',
		  'Access-Control-Allow-Methods': 'GET, OPTIONS',
		  'Access-Control-Allow-Headers': 'Content-Type',
		  'Content-Type': 'application/json'
		});
  
		// Return the response
		return new Response(responseBody, {
		  status: apiResponse.status,
		  statusText: apiResponse.statusText,
		  headers: responseHeaders,
		});
	  } catch (error) {
		console.error('Error in proxy:', error);
		return new Response(JSON.stringify({ 
		  error: error.message,
		  details: {
			url: targetUrl,
			path: path,
			originalUrl: request.url
		  }
		}), {
		  status: 500,
		  headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*'
		  }
		});
	  }
	},
  }; 