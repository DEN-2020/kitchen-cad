export const SYNC_CONFIG_KEY = "kitchen-cad-sync-v1";

export type SyncConfig = {
  baseUrl: string;
  token: string;
  projectId: string;
  autoSync: boolean;
  revision: number;
  lastSyncedHash: string;
  lastRemoteUpdatedAt: string;
};

export type RemoteProject = {
  id: string;
  name: string;
  project: any;
  revision: number;
  updatedAt: string;
};

export class ProjectSyncError extends Error {
  status: number;
  code: string;
  details: any;

  constructor(message: string, status = 0, code = "sync_error", details: any = null) {
    super(message);
    this.name = "ProjectSyncError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  baseUrl: "",
  token: "",
  projectId: "main",
  autoSync: false,
  revision: 0,
  lastSyncedHash: "",
  lastRemoteUpdatedAt: "",
};

export function loadSyncConfig(): SyncConfig {
  try {
    const parsed = JSON.parse(localStorage.getItem(SYNC_CONFIG_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_SYNC_CONFIG };
    return {
      baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : "",
      token: typeof parsed.token === "string" ? parsed.token : "",
      projectId: /^[a-zA-Z0-9_-]{1,64}$/.test(parsed.projectId)
        ? parsed.projectId
        : "main",
      autoSync: parsed.autoSync === true,
      revision: Number.isSafeInteger(parsed.revision) && parsed.revision >= 0
        ? parsed.revision
        : 0,
      lastSyncedHash:
        typeof parsed.lastSyncedHash === "string" ? parsed.lastSyncedHash : "",
      lastRemoteUpdatedAt:
        typeof parsed.lastRemoteUpdatedAt === "string"
          ? parsed.lastRemoteUpdatedAt
          : "",
    };
  } catch {
    return { ...DEFAULT_SYNC_CONFIG };
  }
}

export function saveSyncConfig(config: SyncConfig) {
  localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config));
}

export function projectFingerprint(project: any) {
  const value = JSON.stringify(project);
  let first = 2166136261;
  let second = 5381;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second, 33) ^ code;
  }
  return `${value.length}-${(first >>> 0).toString(36)}-${(second >>> 0).toString(36)}`;
}

export function normalizeSyncUrl(value: string) {
  const url = new URL(value.trim());
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:"))
    throw new ProjectSyncError(
      "Для удалённого подключения нужен HTTPS-адрес Cloudflare Tunnel.",
      0,
      "insecure_url",
    );
  url.pathname = url.pathname.replace(/\/$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function projectUrl(config: SyncConfig, suffix = "") {
  const baseUrl = normalizeSyncUrl(config.baseUrl);
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(config.projectId))
    throw new ProjectSyncError("Недопустимый код проекта.", 0, "invalid_project_id");
  return `${baseUrl}/api/projects/${encodeURIComponent(config.projectId)}${suffix}`;
}

async function request(config: SyncConfig, url: string, init: RequestInit = {}) {
  if (config.token.length < 32)
    throw new ProjectSyncError(
      "Ключ синхронизации должен содержать не менее 32 символов.",
      0,
      "invalid_token",
    );
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers || {}),
      },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new ProjectSyncError(
        response.status === 401
          ? "Неверный ключ синхронизации."
          : response.status === 403
            ? "Этот адрес сайта не разрешён локальным сервером."
            : response.status === 409
              ? "На компьютере уже есть более новая версия проекта."
              : body?.error || `Ошибка сервера ${response.status}`,
        response.status,
        body?.error || "http_error",
        body,
      );
    return body;
  } catch (error) {
    if (error instanceof ProjectSyncError) throw error;
    throw new ProjectSyncError(
      error instanceof DOMException && error.name === "AbortError"
        ? "Локальный компьютер не ответил вовремя."
        : "Нет связи с локальным компьютером.",
      0,
      "offline",
      error,
    );
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function fetchRemoteProject(
  config: SyncConfig,
): Promise<RemoteProject | null> {
  try {
    return (await request(config, projectUrl(config))) as RemoteProject;
  } catch (error) {
    if (error instanceof ProjectSyncError && error.status === 404) return null;
    throw error;
  }
}

export async function putRemoteProject(
  config: SyncConfig,
  project: any,
  expectedRevision = config.revision,
) {
  return request(config, projectUrl(config), {
    method: "PUT",
    body: JSON.stringify({ expectedRevision, project }),
  }) as Promise<{
    id: string;
    name: string;
    revision: number;
    updatedAt: string;
  }>;
}
