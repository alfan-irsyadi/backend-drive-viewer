const express = require("express");
const { google } = require("googleapis");
const cors = require("cors");
const app = express();

app.use(cors());

const serviceAccountBase64 = process.env.GOOGLE_SERVICE;

if (!serviceAccountBase64) {
  throw new Error("GOOGLE_SERVICE_JSON is not defined.");
}

const serviceAccount = JSON.parse(
  Buffer.from(serviceAccountBase64, 'base64').toString('utf8')
);

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});
const drive = google.drive({ version: "v3", auth });

app.get("/api/thumbnail", async (req, res) => {
  const { fileId } = req.query;
  if (!fileId) return res.status(400).send("Missing fileId");
  try {
    const file = await drive.files.get({
      fileId,
      fields: "thumbnailLink",
    });
    const thumbnailUrl = file.data.thumbnailLink;
    if (!thumbnailUrl) return res.status(404).send("No thumbnail");

    const token = await auth.getAccessToken();
    const response = await fetch(thumbnailUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      return res.status(response.status).send("Failed to fetch thumbnail");
    }
    const contentType = response.headers.get("content-type");
    const buffer = Buffer.from(await response.arrayBuffer());
    res.set("Content-Type", contentType);
    res.end(buffer);
  } catch (e) {
    console.error("Thumbnail proxy error:", e);
    res.status(500).send("Proxy error: " + e.message);
  }
});

app.get("/api/files", async (req, res) => {
  const folderId = req.query.folderId; // Pass folderId as a query param
  if (!folderId) return res.status(400).send("Missing folderId");
  try {
    const result = await drive.files.list({
      q: `'${folderId}' in parents`,
      fields: "files(id, name, mimeType, thumbnailLink, webViewLink, iconLink)",
    });
    res.json(result.data.files);
    console.log(result);
  } catch (e) {
    console.error(e);
    res.status(500).send("Failed to fetch files");
  }
});

app.get("/api/folder-name", async (req, res) => {
    const folderId = req.query.folderId; // Pass folderId as a query param
    if (!folderId) return res.status(400).send("Missing folderId");
    try {
        const parentRes = await drive.files.get({
            fileId: folderId,
            fields: 'name',
        });
        res.json({ name: parentRes.data.name });
        console.log(`Parent folder name: ${parentRes.data.name}`);
    }
    catch (error) {
        console.error('Error:', error.message);
        res.status(500).send("Failed to fetch parent folder name");
    }
});



const PORT = process.env.PORT || 3000;;
app.listen(PORT, () => console.log(`Drive API proxy running on http://localhost:${PORT}`));