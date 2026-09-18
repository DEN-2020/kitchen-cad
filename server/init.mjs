import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const target = resolve(".env.local");
if (existsSync(target)) {
  console.log(".env.local already exists; nothing changed.");
  process.exit(0);
}

const token = randomBytes(36).toString("base64url");
const contents = [
  "# Local-only secrets for the Kitchen CAD sync server.",
  `KITCHEN_CAD_SYNC_TOKEN=${token}`,
  "KITCHEN_CAD_SYNC_HOST=127.0.0.1",
  "KITCHEN_CAD_SYNC_PORT=8787",
  "KITCHEN_CAD_ALLOWED_ORIGINS=https://kitchen-cad.pages.dev,https://den-2020.github.io,http://localhost:5173,http://127.0.0.1:5173",
  "",
].join("\n");
await writeFile(target, contents, { encoding: "utf8", mode: 0o600, flag: "wx" });
console.log("Created .env.local with a new private sync token.");
console.log("The token was not printed. Keep this file outside Git.");
