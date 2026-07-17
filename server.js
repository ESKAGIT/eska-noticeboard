const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "noticeboard.json");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const ADMIN_PIN = process.env.ADMIN_PIN || "";
const MAX_BODY = 60 * 1024 * 1024;
const MAX_UPLOAD = Number(process.env.MAX_UPLOAD_BYTES || 500 * 1024 * 1024);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime"
};

function ensureData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const seed = fs.readFileSync(path.join(__dirname, "data", "noticeboard.json"), "utf8");
    fs.writeFileSync(DATA_FILE, seed);
  }
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store"
  });
  res.end(body);
}

function sendJson(res, status, data) {
  send(res, status, JSON.stringify(data), "application/json; charset=utf-8");
}

function sendDownload(res, filename, body) {
  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "content-disposition": `attachment; filename="${filename}"`,
    "cache-control": "no-store"
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY) {
        reject(new Error("Request body is too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function isAuthorized(req) {
  if (!ADMIN_PIN) return true;
  return req.headers["x-admin-pin"] === ADMIN_PIN;
}

function safeName(name = "upload") {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "upload";
}

function extensionFromType(type = "") {
  if (type.includes("png")) return ".png";
  if (type.includes("webp")) return ".webp";
  if (type.includes("gif")) return ".gif";
  if (type.includes("svg")) return ".svg";
  if (type.includes("quicktime")) return ".mov";
  if (type.includes("video")) return ".mp4";
  return ".jpg";
}

function streamUpload(req, filePath) {
  return new Promise((resolve, reject) => {
    let total = 0;
    let rejected = false;
    const output = fs.createWriteStream(filePath);

    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > MAX_UPLOAD && !rejected) {
        rejected = true;
        output.destroy();
        req.destroy(new Error("Upload is too large."));
      }
    });

    req.on("error", (error) => {
      output.destroy();
      fs.rm(filePath, { force: true }, () => reject(error));
    });

    output.on("error", (error) => {
      fs.rm(filePath, { force: true }, () => reject(error));
    });

    output.on("finish", () => {
      if (rejected) {
        fs.rm(filePath, { force: true }, () => reject(new Error("Upload is too large.")));
        return;
      }
      resolve(total);
    });

    req.pipe(output);
  });
}

function serveFile(res, baseDir, requestPath) {
  const cleanPath = decodeURIComponent(requestPath.split("?")[0]).replace(/^\/+/, "");
  const filePath = path.normalize(path.join(baseDir, cleanPath));
  if (!filePath.startsWith(baseDir)) {
    send(res, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      send(res, 404, "Not found", "text/plain; charset=utf-8");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "content-type": MIME[ext] || "application/octet-stream",
      "cache-control": ext === ".html" ? "no-store" : "public, max-age=3600"
    });
    res.end(content);
  });
}

ensureData();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/noticeboard") {
      send(res, 200, fs.readFileSync(DATA_FILE, "utf8"));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/backup") {
      if (!isAuthorized(req)) {
        sendJson(res, 401, { error: "Admin PIN required." });
        return;
      }
      const stamp = new Date().toISOString().slice(0, 10);
      sendDownload(res, `eska-noticeboard-backup-${stamp}.json`, fs.readFileSync(DATA_FILE, "utf8"));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/restore") {
      if (!isAuthorized(req)) {
        sendJson(res, 401, { error: "Admin PIN required." });
        return;
      }
      const body = await readBody(req);
      const parsed = JSON.parse(body);
      if (!parsed || !Array.isArray(parsed.slides) || !parsed.brand || !parsed.settings) {
        sendJson(res, 400, { error: "That backup file does not look like an ESKA noticeboard backup." });
        return;
      }
      parsed.updatedAt = new Date().toISOString();
      fs.writeFileSync(DATA_FILE, JSON.stringify(parsed, null, 2));
      sendJson(res, 200, { ok: true, updatedAt: parsed.updatedAt });
      return;
    }

    if (req.method === "PUT" && url.pathname === "/api/noticeboard") {
      if (!isAuthorized(req)) {
        sendJson(res, 401, { error: "Admin PIN required." });
        return;
      }
      const body = await readBody(req);
      const parsed = JSON.parse(body);
      parsed.updatedAt = new Date().toISOString();
      fs.writeFileSync(DATA_FILE, JSON.stringify(parsed, null, 2));
      sendJson(res, 200, { ok: true, updatedAt: parsed.updatedAt });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/media") {
      if (!isAuthorized(req)) {
        sendJson(res, 401, { error: "Admin PIN required." });
        return;
      }
      const { filename, dataUrl } = JSON.parse(await readBody(req));
      const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || "");
      if (!match) {
        sendJson(res, 400, { error: "Expected a browser data URL." });
        return;
      }
      const extFromType = match[1].includes("video") ? ".mp4" : ".jpg";
      const ext = path.extname(filename || "") || extFromType;
      const stored = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${safeName(path.basename(filename || "media", ext))}${ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, stored), Buffer.from(match[2], "base64"));
      sendJson(res, 201, { url: `/uploads/${stored}` });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/upload") {
      if (!isAuthorized(req)) {
        sendJson(res, 401, { error: "Admin PIN required." });
        return;
      }
      const type = String(req.headers["content-type"] || "application/octet-stream");
      const rawName = String(req.headers["x-file-name"] || "media").slice(0, 180);
      const ext = path.extname(rawName) || extensionFromType(type);
      if (type.includes("webm") || ext.toLowerCase() === ".webm") {
        sendJson(res, 415, { error: "WebM video is not supported for Apple TV signage. Please upload an MP4 video." });
        return;
      }
      const stored = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${safeName(path.basename(rawName || "media", ext))}${ext}`;
      const target = path.join(UPLOAD_DIR, stored);
      const size = await streamUpload(req, target);
      sendJson(res, 201, { url: `/uploads/${stored}`, size });
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/uploads/")) {
      serveFile(res, UPLOAD_DIR, url.pathname.replace("/uploads/", ""));
      return;
    }

    if (req.method === "GET" && ["/", "/screen", "/admin", "/templates", "/export"].includes(url.pathname)) {
      serveFile(res, PUBLIC_DIR, "index.html");
      return;
    }

    if (req.method === "GET") {
      serveFile(res, PUBLIC_DIR, url.pathname);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed." });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Server error." });
  }
});

server.listen(PORT, () => {
  console.log(`ESKA noticeboard running on http://localhost:${PORT}`);
});
