// api/sunoClient.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  const cookie = process.env.SUNO_COOKIE;

  if (!cookie) {
    return res.status(400).json({ error: "SUNO_COOKIE not set" });
  }

  const url =
    "https://clerk.suno.com/v1/client?__clerk_api_version=2025-11-10&_clerk_js_version=5.108.0";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
        Accept: "*/*",
        Origin: "https://suno.com",
        Referer: "https://suno.com/",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: cookie,
      },
    });

    const text = await response.text();
    res.status(200).send(text);
  } catch (error) {
    res.status(500).json({
      error: "Request failed",
      details: error.message,
    });
  }
}
