const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

/**
 * Stateless token mint: each POST forwards to HeyGen and returns a new JWT.
 * No in-process cache or singleton token — safe for concurrent users / tabs.
 *
 * HeyGen `POST /v1/streaming.create_token` issues a short-lived JWT for the SDK.
 * Per HeyGen OpenAPI, the body is effectively `{}` — there is **no** quality or
 * resolution parameter on this endpoint. Video quality is set later on
 * `streaming.new` via `StartAvatarRequest.quality` (low / medium / high).
 */
export async function POST() {
  try {
    if (!HEYGEN_API_KEY) {
      throw new Error("API key is missing from .env");
    }
    const baseApiUrl = process.env.NEXT_PUBLIC_BASE_API_URL;

    const res = await fetch(`${baseApiUrl}/v1/streaming.create_token`, {
      method: "POST",
      headers: {
        "x-api-key": HEYGEN_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("HeyGen create_token failed:", res.status, errText);
      return new Response("Failed to retrieve access token", { status: res.status });
    }

    const data: unknown = await res.json();
    const token =
      typeof data === "object" &&
      data !== null &&
      "data" in data &&
      typeof (data as { data: unknown }).data === "object" &&
      (data as { data: { token?: unknown } }).data !== null &&
      typeof (data as { data: { token?: unknown } }).data.token === "string"
        ? (data as { data: { token: string } }).data.token
        : typeof data === "object" &&
            data !== null &&
            "token" in data &&
            typeof (data as { token: unknown }).token === "string"
          ? (data as { token: string }).token
          : null;

    if (!token?.trim()) {
      console.error("HeyGen create_token: missing token in body", data);
      return new Response("Invalid token payload from HeyGen", { status: 502 });
    }

    return new Response(token.trim(), {
      status: 200,
    });
  } catch (error) {
    console.error("Error retrieving access token:", error);

    return new Response("Failed to retrieve access token", {
      status: 500,
    });
  }
}
