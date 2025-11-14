import fetch from "node-fetch";

export default async function handler(req, res) {
  const cookie = process.env.SUNO_COOKIE;

  if (!cookie) {
    return res.status(400).json({ error: "SUNO_COOKIE not set" });
  }

  try {
    //
    // STEP 1 — Get Clerk client to extract the JWT token
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
      return res.status(401).json({ error: "JWT not found (cookie expired)" });
    }

    //
    // STEP 2 — Build browser-token like Suno does
    //
    const browserToken = {
      token: JSON.stringify({
        timestamp: Date.now(),
      }),
    };

    //
    // STEP 3 — Call Discover API
    //
    const discoverRes = await fetch(
      "https://studio-api.prod.suno.com/api/discover/",
      {
        method: "POST",
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "*/*",
          Authorization: "Bearer " + jwt,

          // required headers from browser request
          "device-id": "9df77292-efb5-4c1e-bb9c-9cf771c61254",
          "browser-token": JSON.stringify(browserToken),
          Origin: "https://suno.com",
          Referer: "https://suno.com/",
          "Content-Type": "application/json",
        },

        // pagination, etc. You can change page, size, filters...
        body: JSON.stringify({
          page: 0,
          page_size: 20,
          list_type: "trending", 
        }),
      }
    );

    const discoverJson = await discoverRes.json();

    return res.status(200).json({
      ok: true,
      count: discoverJson?.results?.length,
      results: discoverJson.results,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Failed to fetch discover",
      details: err.message,
    });
  }
}
