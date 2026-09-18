import { createHash, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { ProjectStorage } from "./storage.mjs";

const DEFAULT_ORIGINS = [
  "https://kitchen-cad.pages.dev",
  "https://den-2020.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];
const MAX_BODY_BYTES = 1_250_000;
const PROJECT_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

function tokenDigest(value) {
  return createHash("sha256").update(String(value)).digest();
}

function tokenMatches(expected, supplied) {
  return timingSafeEqual(tokenDigest(expected), tokenDigest(supplied));
}

function bearerToken(request) {
  const header = request.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function json(response, status, body, headers = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    const chunks = [];
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      if (!tooLarge) chunks.push(chunk);
    });
    request.on("end", () => {
      if (tooLarge) {
        reject(Object.assign(new Error("Request body is too large"), { status: 413 }));
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(Object.assign(new Error("Invalid JSON"), { status: 400 }));
      }
    });
    request.on("error", reject);
  });
}

function validateProject(project) {
  if (!project || typeof project !== "object" || Array.isArray(project))
    throw Object.assign(new Error("Project must be a JSON object"), { status: 400 });
  if (project.schemaVersion !== 1)
    throw Object.assign(new Error("Unsupported project schema"), { status: 400 });
  if (!project.room || !project.ui || !project.defaults || !Array.isArray(project.modules))
    throw Object.assign(new Error("Incomplete Kitchen CAD project"), { status: 400 });
  const serialized = JSON.stringify(project);
  if (Buffer.byteLength(serialized, "utf8") > 1_000_000)
    throw Object.assign(new Error("Project is larger than 1 MB"), { status: 413 });
}

export function parseAllowedOrigins(value = process.env.KITCHEN_CAD_ALLOWED_ORIGINS) {
  return new Set(
    (value ? value.split(",") : DEFAULT_ORIGINS)
      .map((origin) => origin.trim().replace(/\/$/, ""))
      .filter(Boolean),
  );
}

export function createSyncServer({
  storage,
  token,
  allowedOrigins = parseAllowedOrigins(),
} = {}) {
  if (!storage) throw new Error("Project storage is required");
  if (!token || token.length < 32)
    throw new Error("KITCHEN_CAD_SYNC_TOKEN must contain at least 32 characters");

  return createServer(async (request, response) => {
    const origin = request.headers.origin?.replace(/\/$/, "");
    const corsHeaders = origin && allowedOrigins.has(origin)
      ? {
          "Access-Control-Allow-Origin": origin,
          Vary: "Origin",
          "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
          "Access-Control-Allow-Headers": "Authorization,Content-Type",
          "Access-Control-Max-Age": "600",
        }
      : {};

    if (origin && !allowedOrigins.has(origin)) {
      json(response, 403, { error: "origin_not_allowed" });
      return;
    }
    if (request.method === "OPTIONS") {
      response.writeHead(204, corsHeaders);
      response.end();
      return;
    }

    const url = new URL(request.url || "/", "http://localhost");
    if (request.method === "GET" && url.pathname === "/health") {
      json(response, 200, { ok: true, service: "kitchen-cad-sync" }, corsHeaders);
      return;
    }
    if (!url.pathname.startsWith("/api/") || !tokenMatches(token, bearerToken(request))) {
      json(response, 401, { error: "unauthorized" }, corsHeaders);
      return;
    }

    const match = url.pathname.match(/^\/api\/projects\/([^/]+)(?:\/(versions))?$/);
    if (!match) {
      json(response, 404, { error: "not_found" }, corsHeaders);
      return;
    }
    let id = "";
    try {
      id = decodeURIComponent(match[1]);
    } catch {
      json(response, 400, { error: "invalid_project_id" }, corsHeaders);
      return;
    }
    if (!PROJECT_ID_PATTERN.test(id)) {
      json(response, 400, { error: "invalid_project_id" }, corsHeaders);
      return;
    }

    try {
      if (request.method === "GET" && match[2] === "versions") {
        json(
          response,
          200,
          { id, versions: storage.listVersions(id, url.searchParams.get("limit")) },
          corsHeaders,
        );
        return;
      }
      if (request.method === "GET") {
        const project = storage.getProject(id);
        if (!project) {
          json(response, 404, { error: "project_not_found", id }, corsHeaders);
          return;
        }
        json(response, 200, project, corsHeaders);
        return;
      }
      if (request.method === "PUT" && !match[2]) {
        const body = await readJson(request);
        const expectedRevision = Number(body?.expectedRevision);
        if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
          json(response, 400, { error: "invalid_expected_revision" }, corsHeaders);
          return;
        }
        validateProject(body?.project);
        const result = storage.putProject(id, body.project, expectedRevision);
        if (result.conflict) {
          json(response, 409, { error: "revision_conflict", ...result }, corsHeaders);
          return;
        }
        json(response, 200, result, corsHeaders);
        return;
      }
      json(response, 405, { error: "method_not_allowed" }, {
        Allow: "GET,PUT,OPTIONS",
        ...corsHeaders,
      });
    } catch (error) {
      const status = Number(error?.status) || 500;
      if (status >= 500) console.error("Kitchen CAD sync request failed", error);
      json(
        response,
        status,
        { error: status >= 500 ? "internal_error" : error.message },
        corsHeaders,
      );
    }
  });
}

async function main() {
  const token = process.env.KITCHEN_CAD_SYNC_TOKEN || "";
  const host = process.env.KITCHEN_CAD_SYNC_HOST || "127.0.0.1";
  const port = Number(process.env.KITCHEN_CAD_SYNC_PORT || 8787);
  const storage = new ProjectStorage();
  const server = createSyncServer({ storage, token });
  server.listen(port, host, () => {
    console.log(`Kitchen CAD sync server: http://${host}:${port}`);
    console.log(`SQLite: ${storage.databasePath}`);
  });
  const stop = () => {
    server.close(() => {
      storage.close();
      process.exit(0);
    });
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
