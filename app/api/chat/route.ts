import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const backendUrl =
    process.env.DRAWIO_API_URL || "http://localhost:6002";

  const body = await request.json();

  const apiKey = request.headers.get("x-ai-api-key") || "";
  const aiProvider = request.headers.get("x-ai-provider") || "anthropic";
  const aiModel =
    request.headers.get("x-ai-model") || "claude-sonnet-4-20250514";

  try {
    const response = await fetch(`${backendUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ai-provider": aiProvider,
        "x-ai-api-key": apiKey,
        "x-ai-model": aiModel,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: `Backend error: ${response.status} ${response.statusText}`,
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ストリームレスポンスをそのまま転送
    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Failed to connect to backend",
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
