import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { createSyncServer } from "../server/index.mjs";
import { ProjectStorage } from "../server/storage.mjs";

const TOKEN = "test-token-that-is-longer-than-thirty-two-characters";
const PAIRING_CODE = "one-time-code-123";
const ORIGIN = "https://kitchen-cad.pages.dev";
const project = {
  schemaVersion: 1,
  name: "Test kitchen",
  room: { width: 2000, depth: 3000, height: 2700 },
  ui: { language: "ru" },
  defaults: { board: 18 },
  modules: [],
};

describe("local SQLite sync server", () => {
  const dataDirectory = mkdtempSync(join(tmpdir(), "kitchen-cad-sync-"));
  const storage = new ProjectStorage({ dataDirectory, maxVersions: 3 });
  let pairingConsumed = 0;
  const server = createSyncServer({
    storage,
    token: TOKEN,
    allowedOrigins: new Set([ORIGIN]),
    pairingCode: PAIRING_CODE,
    pairingExpiresAt: Date.now() + 60_000,
    onPairingConsumed: () => {
      pairingConsumed += 1;
    },
  });
  let baseUrl = "";

  before(async () => {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    storage.close();
    rmSync(dataDirectory, { recursive: true, force: true });
  });

  it("keeps health public but protects project data", async () => {
    const health = await fetch(`${baseUrl}/health`, { headers: { Origin: ORIGIN } });
    assert.equal(health.status, 200);
    assert.equal((await health.json()).ok, true);

    const unauthorized = await fetch(`${baseUrl}/api/projects/main`, {
      headers: { Origin: ORIGIN },
    });
    assert.equal(unauthorized.status, 401);
  });

  it("exchanges a one-time pairing code for the sync token only once", async () => {
    const paired = await fetch(`${baseUrl}/api/pair`, {
      method: "POST",
      headers: { Origin: ORIGIN, "Content-Type": "application/json" },
      body: JSON.stringify({ code: PAIRING_CODE }),
    });
    assert.equal(paired.status, 200);
    assert.equal((await paired.json()).token, TOKEN);
    assert.equal(pairingConsumed, 1);

    const reused = await fetch(`${baseUrl}/api/pair`, {
      method: "POST",
      headers: { Origin: ORIGIN, "Content-Type": "application/json" },
      body: JSON.stringify({ code: PAIRING_CODE }),
    });
    assert.equal(reused.status, 410);
  });

  it("rejects browser origins outside the allowlist", async () => {
    const response = await fetch(`${baseUrl}/api/projects/main`, {
      headers: {
        Origin: "https://attacker.example",
        Authorization: `Bearer ${TOKEN}`,
      },
    });
    assert.equal(response.status, 403);
  });

  it("creates, reads, versions, and detects concurrent writes", async () => {
    const headers = {
      Origin: ORIGIN,
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    };
    const create = await fetch(`${baseUrl}/api/projects/main`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ expectedRevision: 0, project }),
    });
    assert.equal(create.status, 200);
    assert.equal((await create.json()).revision, 1);
    assert.equal(readdirSync(join(dataDirectory, "backups")).length, 1);

    const read = await fetch(`${baseUrl}/api/projects/main`, { headers });
    const saved = await read.json();
    assert.equal(saved.revision, 1);
    assert.equal(saved.project.name, "Test kitchen");

    const conflict = await fetch(`${baseUrl}/api/projects/main`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ expectedRevision: 0, project: { ...project, name: "Old" } }),
    });
    assert.equal(conflict.status, 409);
    assert.equal((await conflict.json()).currentRevision, 1);

    const update = await fetch(`${baseUrl}/api/projects/main`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        expectedRevision: 1,
        project: { ...project, name: "Updated kitchen" },
      }),
    });
    assert.equal(update.status, 200);
    assert.equal((await update.json()).revision, 2);

    const versions = await fetch(`${baseUrl}/api/projects/main/versions`, { headers });
    assert.deepEqual(
      (await versions.json()).versions.map((version) => Number(version.revision)),
      [2, 1],
    );
  });
});
