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
          Cookie: cookie,
          Origin: "https://suno.com",
          Referer: "https://suno.com/",
          Accept: "*/*",
        },
      }
    );

    const clerkJson = await clerkRes.json();
    const jwt =
      clerkJson?.response?.sessions?.[0]?.last_active_token?.jwt;

    if (!jwt) return res.status(401).json({ error: "JWT missing" });

    // Browser-token
    const browserToken = {
      token: JSON.stringify({ timestamp: Date.now() }),
    };

    // Request body
    const body = JSON.stringify({
      page: 0,
      page_size: 20,
      list_type: "trending", // public feed
    });

    // STEP 2 — Discover API request (fully mimicked)
    const discoverRes = await fetch(
      "https://studio-api.prod.suno.com/api/discover/",
      {
        method: "POST",
        headers: {
          "User-Agent": "Mozilla/5.0",

          Accept: "*/*",
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
          "Content-Length": body.length.toString(),

          "device-id": "9df77292-efb5-4c1e-bb9c-9cf771c61254",
          "browser-token": JSON.stringify(browserToken),

          // 🔥 These 4 headers FIX THE ISSUE:
          "x-suno-client": "web",
          "x-requested-with": "XMLHttpRequest",
          "sec-fetch-site": "same-site",
          "sec-fetch-mode": "cors",
          "sec-fetch-dest": "empty",

          Origin: "https://suno.com",
          Referer: "https://suno.com/",
        },
        body,
      }
    );

    const discoverJson = await discoverRes.json();

    return res.status(200).json({
      ok: true,
      total: discoverJson?.results?.length || 0,
      results: discoverJson?.results || [],
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed",
      details: err.message,
    });
  }
}
