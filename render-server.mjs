import http from "node:http";
import { Readable } from "node:stream";
import { Buffer } from "node:buffer";
import { promises as fs } from "node:fs";
import path from "node:path";
import server from "./dist/server/server.js";

function getFirstHeader(value) {
  if (Array.isArray(value)) return value[0];
  return value ?? "";
}

async function readBody(req) {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return undefined;
  return Buffer.concat(chunks);
}

function toRequest(req, bodyBuffer) {
  const host = getFirstHeader(req.headers.host) || "localhost";
  const proto = getFirstHeader(req.headers["x-forwarded-proto"]) || "http";
  const url = new URL(req.url ?? "/", `${proto}://${host}`);

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v == null) continue;
    if (Array.isArray(v)) for (const vv of v) headers.append(k, vv);
    else headers.set(k, String(v));
  }

  const init = {
    method: req.method,
    headers,
    body: bodyBuffer,
    duplex: "half",
  };
  return new Request(url, init);
}

async function writeResponse(nodeRes, response) {
  nodeRes.statusCode = response.status;
  nodeRes.statusMessage = response.statusText || nodeRes.statusMessage;

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    nodeRes.setHeader(key, value);
  });

  const setCookie = response.headers.getSetCookie?.();
  if (setCookie?.length) nodeRes.setHeader("set-cookie", setCookie);
  else {
    const single = response.headers.get("set-cookie");
    if (single) nodeRes.setHeader("set-cookie", single);
  }

  if (!response.body) {
    nodeRes.end();
    return;
  }

  const readable = Readable.fromWeb(response.body);
  readable.pipe(nodeRes);
}

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";

const ROOT = process.cwd();
const CLIENT_DIR = path.join(ROOT, "dist", "client");
const ASSETS_DIR = path.join(CLIENT_DIR, "assets");

const MIME = new Map([
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"],
  [".txt", "text/plain; charset=utf-8"],
]);

function safeResolve(baseDir, requestPath) {
  const p = requestPath.replace(/^\//, "");
  const resolved = path.resolve(baseDir, p);
  if (!resolved.startsWith(path.resolve(baseDir) + path.sep)) return null;
  return resolved;
}

async function tryServeStatic(req, res) {
  const url = new URL(req.url ?? "/", "http://local");
  const pathname = url.pathname;

  let filePath = null;
  if (pathname.startsWith("/assets/")) {
    const rel = pathname.slice("/assets/".length);
    filePath = safeResolve(ASSETS_DIR, rel);
  } else if (pathname === "/manifest.webmanifest") {
    filePath = path.join(CLIENT_DIR, "manifest.webmanifest");
  }

  if (!filePath) return false;

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return false;
    const ext = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader("content-type", MIME.get(ext) ?? "application/octet-stream");
    res.setHeader("content-length", String(stat.size));
    res.setHeader(
      "cache-control",
      pathname.startsWith("/assets/")
        ? "public, max-age=31536000, immutable"
        : "public, max-age=3600",
    );
    if (req.method === "HEAD") {
      res.end();
      return true;
    }
    const buf = await fs.readFile(filePath);
    res.end(buf);
    return true;
  } catch {
    return false;
  }
}

const httpServer = http.createServer(async (req, res) => {
  try {
    if (await tryServeStatic(req, res)) return;
    const body = await readBody(req);
    const request = toRequest(req, body);
    const response = await server.fetch(request, process.env, {});
    await writeResponse(res, response);
  } catch {
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Internal Server Error");
  }
});

httpServer.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
});

