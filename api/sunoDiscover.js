import fetch from "node-fetch";

export default async function handler(req, res) {
  const cookie = process.env.SUNO_COOKIE;
  if (!cookie) return res.status(400).json({ error: "SUNO_COOKIE missing" });

  try {
    // STEP 1 — Get JWT
    const clerkRes = await fetch(
      "https://clerk.suno.com/v1/client?__clerk_api_version=2025-11-10&_clerk_js_version=5.108.0",
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "*/*",
          Cookie: cookie,
          Origin: "https://suno.com",
          Referer: "https://suno.com/",
        },
      }
    );

    const clerk = await clerkRes.json();
    const jwt = clerk?.response?.sessions?.[0]?.last_active_token?.jwt;

    if (!jwt) {
      return res.status(401).json({ error: "JWT missing or expired" });
    }

    // STEP 2 — Browser token
    const browserToken = {
      token: JSON.stringify({ timestamp: Date.now() }),
    };

    // STEP 3 — Request body
    const bodyData = {
      page: 0,
      page_size: 50,     // 50 songs
      list_type: "trending",  // trending/public
    };

    const bodyString = JSON.stringify(bodyData);

    // STEP 4 — CALL DISCOVER API
    const discoverRes = await fetch(
      "https://studio-api.prod.suno.com/api/discover/",
      {
        method: "POST",
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "*/*",
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
          "Content-Length": bodyString.length.toString(), // REQUIRED
          "device-id": "suno-public",
          "browser-token": JSON.stringify(browserToken),
          Origin: "https://suno.com",
          Referer: "https://suno.com/",
        },
        body: bodyString, // REQUIRED
      }
    );

    const data = await discoverRes.json();

    return res.status(200).json({
      ok: true,
      total: data?.results?.length || 0,
      results: data?.results || [],
    });
  } catch (err) {
    return res.status(500).json({
      error: "Discover API failed",
      details: err.message,
    });
  }
}
