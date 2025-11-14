import fetch from "node-fetch";

export default async function handler(req, res) {
  const cookie = process.env.SUNO_COOKIE;

  if (!cookie) {
    return res.status(400).json({ error: "SUNO_COOKIE not set" });
  }

  try {
    // Step 1: Get Clerk client (to get JWT)
    const clerkRes = await fetch(
      "https://clerk.suno.com/v1/client?__clerk_api_version=2025-11-10&_clerk_js_version=5.108.0",
      {
        method: "GET",
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
      return res.status(401).json({
        error: "JWT not found — your cookie might be expired.",
      });
    }

    // Step 2: Use the JWT to fetch your songs
    const songsRes = await fetch(
      "https://studio-api.suno.ai/api/mymusic",
      {
        headers: {
          Authorization: "Bearer " + jwt,
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    const songsJson = await songsRes.json();

    return res.status(200).json({
      ok: true,
      total_songs: songsJson.length,
      songs: songsJson,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Failed to fetch songs",
      details: err.message,
    });
  }
}
