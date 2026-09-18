const REGISTRY_KEY = "active-quick-tunnel";
const REGISTRY_TTL_SECONDS = 60 * 60;
const MAX_REGISTRATION_BYTES = 2_048;
const MAX_PROJECT_BYTES = 1_250_000;

type SyncRegistryRecord = {
  origin: string;
  registeredAt: string;
};

type FunctionContext = EventContext<Cloudflare.Env, string, Record<string, unknown>>;

function json(body: unknown, status = 200, extraHeaders: HeadersInit = {}) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}

function routePath(value: string | string[] | undefined) {
  return Array.isArray(value) ? value.join("/") : value || "";
}

function bearerToken(request: Request) {
  const header = request.headers.get("Authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

async function tokenMatches(provided: string, expected: string) {
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const subtle = crypto.subtle as SubtleCrypto & {
    timingSafeEqual(left: ArrayBuffer, right: ArrayBuffer): boolean;
  };
  return subtle.timingSafeEqual(providedHash, expectedHash);
}

function validQuickTunnelOrigin(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !url.hostname.endsWith(".trycloudflare.com") ||
      url.hostname === "trycloudflare.com" ||
      url.port ||
      url.username ||
      url.password ||
      (url.pathname !== "/" && url.pathname !== "") ||
      url.search ||
      url.hash
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

async function readRegistration(request: Request) {
  const declared = Number(request.headers.get("Content-Length") || 0);
  if (declared > MAX_REGISTRATION_BYTES)
    throw Object.assign(new Error("registration_too_large"), { status: 413 });
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_REGISTRATION_BYTES)
    throw Object.assign(new Error("registration_too_large"), { status: 413 });
  try {
    return JSON.parse(text) as { origin?: unknown };
  } catch {
    throw Object.assign(new Error("invalid_json"), { status: 400 });
  }
}

async function registerTunnel(context: FunctionContext) {
  if (context.request.method !== "POST")
    return json({ error: "method_not_allowed" }, 405, { Allow: "POST" });
  if (
    !(await tokenMatches(
      bearerToken(context.request),
      context.env.KITCHEN_CAD_REGISTRATION_TOKEN,
    ))
  )
    return json({ error: "unauthorized" }, 401);

  const body = await readRegistration(context.request);
  const origin = validQuickTunnelOrigin(body.origin);
  if (!origin) return json({ error: "invalid_quick_tunnel_origin" }, 400);
  const record: SyncRegistryRecord = {
    origin,
    registeredAt: new Date().toISOString(),
  };
  await context.env.KITCHEN_CAD_SYNC_REGISTRY.put(REGISTRY_KEY, JSON.stringify(record), {
    expirationTtl: REGISTRY_TTL_SECONDS,
  });
  console.log(JSON.stringify({ event: "sync_tunnel_registered", registeredAt: record.registeredAt }));
  return json({ ok: true, registeredAt: record.registeredAt });
}

async function tunnelStatus(context: FunctionContext) {
  if (context.request.method !== "GET")
    return json({ error: "method_not_allowed" }, 405, { Allow: "GET" });
  const record = await context.env.KITCHEN_CAD_SYNC_REGISTRY.get<SyncRegistryRecord>(
    REGISTRY_KEY,
    "json",
  );
  return json({ online: Boolean(record), registeredAt: record?.registeredAt || null });
}

async function proxyProjectRequest(context: FunctionContext, path: string) {
  const { request } = context;
  const requestUrl = new URL(request.url);
  const requestOrigin = request.headers.get("Origin");
  if (requestOrigin && requestOrigin !== requestUrl.origin)
    return json({ error: "origin_not_allowed" }, 403);
  const pairingRequest = path === "api/pair";
  if (!pairingRequest && !path.startsWith("api/projects/"))
    return json({ error: "not_found" }, 404);
  const allowedMethods = pairingRequest ? ["POST", "OPTIONS"] : ["GET", "PUT", "OPTIONS"];
  if (!allowedMethods.includes(request.method))
    return json({ error: "method_not_allowed" }, 405, { Allow: allowedMethods.join(",") });
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (!pairingRequest && !bearerToken(request)) return json({ error: "unauthorized" }, 401);

  const declared = Number(request.headers.get("Content-Length") || 0);
  if (declared > MAX_PROJECT_BYTES) return json({ error: "request_too_large" }, 413);

  const record = await context.env.KITCHEN_CAD_SYNC_REGISTRY.get<SyncRegistryRecord>(
    REGISTRY_KEY,
    "json",
  );
  if (!record?.origin) return json({ error: "local_pc_offline" }, 503);

  const target = new URL(record.origin);
  target.pathname = `/${path}`;
  target.search = requestUrl.search;
  const headers = new Headers();
  if (!pairingRequest)
    headers.set("Authorization", request.headers.get("Authorization") || "");
  headers.set("Origin", requestUrl.origin);
  const contentType = request.headers.get("Content-Type");
  if (contentType) headers.set("Content-Type", contentType);

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === "GET" ? null : request.body,
    redirect: "manual",
    signal: AbortSignal.timeout(20_000),
  });
  const responseHeaders = new Headers({
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });
  const upstreamContentType = upstream.headers.get("Content-Type");
  if (upstreamContentType) responseHeaders.set("Content-Type", upstreamContentType);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const onRequest: PagesFunction<Cloudflare.Env> = async (context) => {
  const path = routePath(context.params.path as string | string[] | undefined);
  try {
    if (path === "register") return await registerTunnel(context);
    if (path === "status") return await tunnelStatus(context);
    return await proxyProjectRequest(context, path);
  } catch (error) {
    const status = Number((error as { status?: number })?.status) || 500;
    console.error(
      JSON.stringify({
        event: "sync_gateway_error",
        status,
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    return json(
      { error: status >= 500 ? "sync_gateway_unavailable" : (error as Error).message },
      status,
    );
  }
};
