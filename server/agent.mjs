import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ProjectStorage } from "./storage.mjs";
import { createSyncServer, parseAllowedOrigins } from "./index.mjs";

const QUICK_TUNNEL_PATTERN = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/gi;
const REGISTER_EVERY_MS = 15 * 60 * 1_000;

function findCloudflared() {
  const configured = process.env.KITCHEN_CAD_CLOUDFLARED_PATH?.trim();
  if (configured) {
    if (!existsSync(configured)) throw new Error(`cloudflared not found: ${configured}`);
    return configured;
  }
  const command = process.platform === "win32" ? "where.exe" : "which";
  const found = spawnSync(command, ["cloudflared"], { encoding: "utf8", windowsHide: true });
  const first = found.stdout?.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  if (first && existsSync(first)) return first;
  throw new Error("cloudflared is not installed or KITCHEN_CAD_CLOUDFLARED_PATH is missing");
}

async function registerOrigin(origin) {
  const endpoint =
    process.env.KITCHEN_CAD_REGISTER_URL ||
    "https://kitchen-cad.pages.dev/api/sync/register";
  const token = process.env.KITCHEN_CAD_REGISTRATION_TOKEN || "";
  if (token.length < 32)
    throw new Error("KITCHEN_CAD_REGISTRATION_TOKEN must contain at least 32 characters");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ origin }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`tunnel registration failed with HTTP ${response.status}`);
  console.log(`Quick Tunnel registered at ${new Date().toISOString()}`);
}

function listen(server, port, host) {
  return new Promise((resolveListen, reject) => {
    const onError = (error) => reject(error);
    server.once("error", onError);
    server.listen(port, host, () => {
      server.off("error", onError);
      resolveListen();
    });
  });
}

async function main() {
  const syncToken = process.env.KITCHEN_CAD_SYNC_TOKEN || "";
  if (syncToken.length < 32)
    throw new Error("KITCHEN_CAD_SYNC_TOKEN must contain at least 32 characters");
  const host = process.env.KITCHEN_CAD_SYNC_HOST || "127.0.0.1";
  const port = Number(process.env.KITCHEN_CAD_SYNC_PORT || 8787);
  const storage = new ProjectStorage();
  const pairingCode = randomBytes(9).toString("base64url");
  const pairingExpiresAt = Date.now() + 2 * 60 * 60 * 1_000;
  const pairingFile = join(storage.dataDirectory, "pairing-code.json");
  writeFileSync(
    pairingFile,
    JSON.stringify({ code: pairingCode, expiresAt: new Date(pairingExpiresAt).toISOString() }),
    { encoding: "utf8", mode: 0o600 },
  );
  const server = createSyncServer({
    storage,
    token: syncToken,
    allowedOrigins: parseAllowedOrigins(),
    pairingCode,
    pairingExpiresAt,
    onPairingConsumed: () => {
      try {
        unlinkSync(pairingFile);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    },
  });
  await listen(server, port, host);
  console.log(`Kitchen CAD local database is listening on http://${host}:${port}`);
  console.log(`SQLite: ${storage.databasePath}`);

  const cloudflared = findCloudflared();
  const config = resolve("cloudflared", "quick-tunnel.yml");
  let child = null;
  let refreshTimer = null;
  let stopping = false;
  let restartDelay = 2_000;

  const stop = () => {
    if (stopping) return;
    stopping = true;
    if (refreshTimer) clearInterval(refreshTimer);
    child?.kill();
    server.close(() => {
      storage.close();
      process.exit(0);
    });
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  const launch = () => {
    if (stopping) return;
    let activeOrigin = "";
    child = spawn(
      cloudflared,
      [
        "tunnel",
        "--config",
        config,
        "--url",
        `http://${host}:${port}`,
        "--no-autoupdate",
        "--loglevel",
        "info",
      ],
      { cwd: resolve("."), windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    );

    const inspect = (chunk) => {
      const output = chunk.toString("utf8");
      const match = output.match(QUICK_TUNNEL_PATTERN)?.[0];
      if (!match || match === activeOrigin) return;
      activeOrigin = match;
      restartDelay = 2_000;
      console.log(`Quick Tunnel is online: ${activeOrigin}`);
      const refresh = () =>
        registerOrigin(activeOrigin).catch((error) =>
          console.error(`Quick Tunnel registration retry: ${error.message}`),
        );
      void refresh();
      if (refreshTimer) clearInterval(refreshTimer);
      refreshTimer = setInterval(refresh, REGISTER_EVERY_MS);
    };
    child.stdout.on("data", inspect);
    child.stderr.on("data", inspect);
    child.on("error", (error) => console.error(`cloudflared failed: ${error.message}`));
    child.on("exit", (code) => {
      child = null;
      if (refreshTimer) clearInterval(refreshTimer);
      refreshTimer = null;
      if (stopping) return;
      console.error(`cloudflared exited with code ${code}; restarting in ${restartDelay / 1_000}s`);
      setTimeout(launch, restartDelay);
      restartDelay = Math.min(restartDelay * 2, 60_000);
    });
  };

  launch();
}

await main();
