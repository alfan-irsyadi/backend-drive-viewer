const express = require("express");
// For node-fetch v3+, use ESM import or this workaround:
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const app = express();

app.get("/thumbnail", async (req, res) => {
  const { url, token } = req.query;
  if (!url || !token) {
    return res.status(400).send("Missing url or token");
  }
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      const text = await response.text();
      console.error("Failed to fetch thumbnail:", response.status, text);
      return res.status(response.status).send("Failed to fetch thumbnail: " + text);
    }
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Content-Type", response.headers.get("content-type"));
    response.body.pipe(res);
  } catch (e) {
    console.error("Proxy error:", e);
    res.status(500).send("Proxy error: " + e.message);
  }
});

app.listen(3001, () => console.log("Proxy running on http://localhost:3001"));