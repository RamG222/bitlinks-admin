// server.js
import express from "express";
import multer from "multer";
import AWS from "aws-sdk";
import { query } from "./db.js";
import { v4 as uuidv4 } from "uuid";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = 3000;

// R2 Config
const s3 = new AWS.S3({
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  signatureVersion: "v4",
});

// Middleware
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

// Form Page
app.get("/", (req, res) => {
  res.render("form", { message: null });
});

// Handle News Submission
app.post("/add", upload.single("image"), async (req, res) => {
  try {
    const { slug, title, source_url, description } = req.body;
    const file = req.file;
    let imageUrl = null;

    if (file) {
      const key = `${Date.now()}-${file.originalname}`;
      await s3
        .putObject({
          Bucket: process.env.R2_BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
        .promise();

      imageUrl = `${process.env.CDN_URL}/${encodeURIComponent(key)}`;
    }

    const id = uuidv4();
    //check "slug" before inserting
    const existing = await query("SELECT id FROM news WHERE slug = $1", [slug]);
    if (existing.rows.length > 0) {
      throw new Error("Slug already exists. Please choose a different one.");
    }
    // Insert into DB
    await query(
      `INSERT INTO news (id, slug, image, title, source_url, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, slug, imageUrl, title, source_url, description]
    );

    res.render("form", { message: "✅ News added successfully!" });
  } catch (err) {
    console.error(err);
    res.render("form", { message: "❌ Error: " + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
