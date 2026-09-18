import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const target = resolve(".env.local");
const existing = existsSync(target) ? await readFile(target, "utf8") : "";
const names = new Set(
  existing
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z0-9_]+)=/)?.[1])
    .filter(Boolean),
);
const lines = existing.trimEnd()
  ? [existing.trimEnd()]
  : ["# Local-only secrets for Kitchen CAD sync."];
const add = (name, value) => {
  if (!names.has(name)) lines.push(`${name}=${value}`);
};
add("KITCHEN_CAD_SYNC_TOKEN", randomBytes(36).toString("base64url"));
add("KITCHEN_CAD_REGISTRATION_TOKEN", randomBytes(36).toString("base64url"));
add("KITCHEN_CAD_SYNC_HOST", "127.0.0.1");
add("KITCHEN_CAD_SYNC_PORT", "8787");
add(
  "KITCHEN_CAD_ALLOWED_ORIGINS",
  "https://kitchen-cad.pages.dev,https://den-2020.github.io,http://localhost:5173,http://127.0.0.1:5173",
);
add("KITCHEN_CAD_REGISTER_URL", "https://kitchen-cad.pages.dev/api/sync/register");
if (process.env.KITCHEN_CAD_CLOUDFLARED_PATH)
  add("KITCHEN_CAD_CLOUDFLARED_PATH", process.env.KITCHEN_CAD_CLOUDFLARED_PATH);
await writeFile(target, `${lines.join("\n")}\n`, { encoding: "utf8", mode: 0o600 });
console.log(existing ? "Updated .env.local with missing sync settings." : "Created .env.local.");
console.log("Private tokens were not printed. Keep this file outside Git.");
