import { handler as fanApiHandler } from "./server/index.mjs";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const rawPath = url.pathname.replace(/^\/api(?=\/|$)/, "") || "/";
    const queryStringParameters = Object.fromEntries(url.searchParams.entries());
    const headers = Object.fromEntries(request.headers.entries());
    const body = request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS"
      ? undefined
      : await request.text();

    const result = await fanApiHandler({
      rawPath,
      headers,
      body,
      queryStringParameters,
      requestContext: {
        http: { method: request.method },
        requestId: crypto.randomUUID(),
      },
    });

    return new Response(result.statusCode === 204 ? null : result.body, {
      status: result.statusCode,
      headers: result.headers,
    });
  },
};
