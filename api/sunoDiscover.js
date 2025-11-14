import fetch from "node-fetch";

export default async function handler(req, res) {
  const cookie = process.env.SUNO_COOKIE;
  if (!cookie) return res.status(400).json({ error: "SUNO_COOKIE missing" });

  try {
    //
    // STEP 1 — Get JWT from Clerk
    //
    const clerkRes = await fetch(
      "https://clerk.suno.com/v1/client?__clerk_api_version=2025-11-10&_clerk_js_version=5.108.0",
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Cookie: cookie,
          Origin: "https://suno.com",
          Referer: "https://suno.com/",
          Accept: "*/*"
        }
      }
    );

    const clerkJson = await clerkRes.json();
    const jwt = clerkJson?.response?.sessions?.[0]?.last_active_token?.jwt;

    if (!jwt) return res.status(401).json({ error: "JWT missing (bad or expired cookie)" });

    //
    // STEP 2 — Build browser-token EXACTLY like Suno
    //
    const browserToken = {
      token: JSON.stringify({
        timestamp: Date.now()
      })
    };

    //
    // STEP 3 — Build request body (Suno requires this format)
    //
    const body = JSON.stringify({
      page: 0,
      page_size: 50,
      list_type: "trending"
    });

    //
    // STEP 4 — FULL Suno headers (All required)
    //
    const discoverRes = await fetch(
      "https://studio-api.prod.suno.com/api/discover/",
      {
        method: "POST",
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "*/*",
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",

          // MUST MATCH your browser
          "device-id": "9df77292-efb5-4c1e-bb9c-9cf771c61254",
          "browser-token": JSON.stringify(browserToken),

          // CRITICAL HEADERS (missing before):
          "x-suno-client": "web",
          "client-version": "v1.0.0",
          "app-platform": "web",

          "x-requested-with": "XMLHttpRequest",
          "sec-fetch-site": "same-site",
          "sec-fetch-mode": "cors",
          "sec-fetch-dest": "empty",

          Origin: "https://suno.com",
          Referer: "https://suno.com/"
        },
        body
      }
    );

    //
    // STEP 5 — Parse JSON safely
    //
    const text = await discoverRes.text();

    // handle HTML error responses
    if (text.startsWith("<")) {
      return res.status(502).json({
        error: "Suno returned HTML instead of JSON",
        html: text.substring(0, 200)
      });
    }

    const json = JSON.parse(text);

    return res.status(200).json({
      ok: true,
      total: json?.results?.length || 0,
      results: json?.results || []
    });

  } catch (err) {
    return res.status(500).json({
      error: "Failed",
      details: err.message
    });
  }
}
