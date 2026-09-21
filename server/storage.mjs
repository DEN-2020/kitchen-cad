import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

const DAY_MS = 24 * 60 * 60 * 1000;

function defaultDataDirectory() {
  const base = process.env.LOCALAPPDATA || join(homedir(), ".local", "share");
  return join(base, "KitchenCAD");
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function resolveDataDirectory(value = process.env.KITCHEN_CAD_DATA_DIR) {
  return resolve(value || defaultDataDirectory());
}

export class ProjectStorage {
  constructor({ dataDirectory, maxVersions = 50, backupDays = 14 } = {}) {
    this.dataDirectory = resolveDataDirectory(dataDirectory);
    this.backupDirectory = join(this.dataDirectory, "backups");
    this.databasePath = join(this.dataDirectory, "data.db");
    this.maxVersions = maxVersions;
    this.backupDays = backupDays;
    mkdirSync(this.backupDirectory, { recursive: true });
    mkdirSync(dirname(this.databasePath), { recursive: true });
    this.db = new DatabaseSync(this.databasePath);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        payload TEXT NOT NULL,
        revision INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS project_versions (
        project_id TEXT NOT NULL,
        revision INTEGER NOT NULL,
        name TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (project_id, revision)
      );
      CREATE INDEX IF NOT EXISTS project_versions_recent
        ON project_versions(project_id, revision DESC);
    `);
    this.getStatement = this.db.prepare(
      "SELECT id, name, payload, revision, updated_at FROM projects WHERE id = ?",
    );
    this.upsertStatement = this.db.prepare(`
      INSERT INTO projects (id, name, payload, revision, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        payload = excluded.payload,
        revision = excluded.revision,
        updated_at = excluded.updated_at
    `);
    this.insertVersionStatement = this.db.prepare(`
      INSERT INTO project_versions (project_id, revision, name, payload, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    this.pruneVersionsStatement = this.db.prepare(`
      DELETE FROM project_versions
      WHERE project_id = ?
        AND revision NOT IN (
          SELECT revision FROM project_versions
          WHERE project_id = ?
          ORDER BY revision DESC
          LIMIT ?
        )
    `);
    this.listVersionsStatement = this.db.prepare(`
      SELECT revision, name, created_at
      FROM project_versions
      WHERE project_id = ?
      ORDER BY revision DESC
      LIMIT ?
    `);
  }

  getProject(id) {
    const row = this.getStatement.get(id);
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      project: JSON.parse(row.payload),
      revision: Number(row.revision),
      updatedAt: row.updated_at,
    };
  }

  putProject(id, project, expectedRevision) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const current = this.getStatement.get(id);
      const currentRevision = current ? Number(current.revision) : 0;
      const payload = JSON.stringify(project);
      if (currentRevision !== expectedRevision) {
        this.db.exec("ROLLBACK");
        if (current && current.payload === payload) {
          return {
            conflict: false,
            id,
            name: current.name,
            revision: currentRevision,
            updatedAt: current.updated_at,
          };
        }
        return {
          conflict: true,
          currentRevision,
          updatedAt: current?.updated_at || null,
          name: current?.name || null,
        };
      }
      const revision = currentRevision + 1;
      const updatedAt = new Date().toISOString();
      const name = String(project.name || "Kitchen CAD").slice(0, 200);
      this.upsertStatement.run(id, name, payload, revision, updatedAt);
      this.insertVersionStatement.run(id, revision, name, payload, updatedAt);
      this.pruneVersionsStatement.run(id, id, this.maxVersions);
      this.db.exec("COMMIT");
      try {
        this.backupIfDue();
      } catch (error) {
        console.error("Kitchen CAD daily SQLite backup failed", error);
      }
      return { conflict: false, id, name, revision, updatedAt };
    } catch (error) {
      try {
        this.db.exec("ROLLBACK");
      } catch {
        // The transaction may already have been rolled back by SQLite.
      }
      throw error;
    }
  }

  listVersions(id, limit = 20) {
    return this.listVersionsStatement.all(
      id,
      Math.max(1, Math.min(50, Number(limit) || 20)),
    );
  }

  backupIfDue(now = new Date()) {
    if (!statSync(this.databasePath, { throwIfNoEntry: false })) return;
    const date = now.toISOString().slice(0, 10);
    const target = join(this.backupDirectory, `kitchen-cad-${date}.sqlite`);
    if (statSync(target, { throwIfNoEntry: false })) return;
    this.db.exec("PRAGMA wal_checkpoint(FULL)");
    this.db.exec(`VACUUM INTO ${sqlString(target)}`);
    const cutoff = now.getTime() - this.backupDays * DAY_MS;
    for (const name of readdirSync(this.backupDirectory)) {
      if (!/^kitchen-cad-\d{4}-\d{2}-\d{2}\.sqlite$/.test(name)) continue;
      const path = join(this.backupDirectory, name);
      if (statSync(path).mtimeMs < cutoff) unlinkSync(path);
    }
  }

  close() {
    this.db.close();
  }
}
