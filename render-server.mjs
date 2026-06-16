import http from "node:http";
import { Readable } from "node:stream";
import { Buffer } from "node:buffer";
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

const httpServer = http.createServer(async (req, res) => {
  try {
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

