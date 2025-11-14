// api/sunoDiscoverAll.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  const cookie = process.env.SUNO_COOKIE;
  if (!cookie) {
    return res.status(400).json({ error: "SUNO_COOKIE missing" });
  }

  try {
    //
    // STEP 1 — Get JWT from Clerk
    //
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

    const clerkJson = await clerkRes.json();
    const jwt =
      clerkJson?.response?.sessions?.[0]?.last_active_token?.jwt;

    if (!jwt) {
      return res.status(401).json({ error: "JWT not found (Cookie expired)" });
    }

    //
    // STEP 2 — Build Suno Browser Token
    //
    const browserToken = {
      token: JSON.stringify({
        timestamp: Date.now(),
      }),
    };

    //
    // STEP 3 — Fetch PUBLIC Songs
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

          // Required headers from browser traffic
          "device-id": "public-scraper",
          "browser-token": JSON.stringify(browserToken),

          Origin: "https://suno.com",
          Referer: "https://suno.com/",
        },

        // You can customize categories, filtering, page, size, etc.
        body: JSON.stringify({
          page: 0,
          page_size: 100,   // fetch 100 songs at once
          list_type: "trending", // "new", "for_you", etc.
        }),
      }
    );

    const discoverJson = await discoverRes.json();

    return res.status(200).json({
      ok: true,
      total: discoverJson?.results?.length,
      songs: discoverJson.results,
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch discover songs",
      details: err.message,
    });
  }
}
