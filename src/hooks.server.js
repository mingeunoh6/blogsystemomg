/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    // CORS 헤더 추가
    if (event.request.method === "OPTIONS") {
        return new Response(null, {
            headers: {
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
            },
        });
    }

    const response = await resolve(event);

    // 모든 응답에 CORS 헤더 추가
    response.headers.append("Access-Control-Allow-Origin", "*");

    return response;
}