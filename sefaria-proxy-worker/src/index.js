export default {
	async fetch(request, env, ctx) {
		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
					'Access-Control-Max-Age': '86400',
				},
			});
		}

		// Get the URL from the request
		const url = new URL(request.url);
		
		// Extract the path after /proxy/
		const sefariaPath = url.pathname.replace('/proxy', '');
		
		// Construct the Sefaria API URL
		const sefariaUrl = `https://www.sefaria.org${sefariaPath}${url.search}`;
		
		try {
			// Forward the request to Sefaria
			const response = await fetch(sefariaUrl, {
				method: request.method,
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json',
				},
			});

			// Get the response data
			const data = await response.json();

			// Return the response with CORS headers
			return new Response(JSON.stringify(data), {
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
				},
			});
		} catch (error) {
			// Handle errors
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			});
		}
	},
}; 