import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchRemoteProject,
  loadSyncConfig,
  ProjectSyncError,
  projectFingerprint,
  putRemoteProject,
  saveSyncConfig,
  type RemoteProject,
  type SyncConfig,
} from "./projectSync";

export type ProjectSyncStatus =
  | "unconfigured"
  | "idle"
  | "checking"
  | "syncing"
  | "synced"
  | "offline"
  | "conflict"
  | "error";

export type ProjectSyncState = {
  status: ProjectSyncStatus;
  message: string;
  remoteRevision: number | null;
  remoteUpdatedAt: string;
};

function configured(config: SyncConfig) {
  return !!config.baseUrl.trim() && config.token.length >= 32 && !!config.projectId;
}

function statusFor(config: SyncConfig): ProjectSyncState {
  return {
    status: configured(config) ? "idle" : "unconfigured",
    message: "",
    remoteRevision: config.revision || null,
    remoteUpdatedAt: config.lastRemoteUpdatedAt,
  };
}

export function useProjectSync(project: any) {
  const [config, setConfig] = useState<SyncConfig>(() => loadSyncConfig());
  const [state, setState] = useState<ProjectSyncState>(() => statusFor(config));
  const configRef = useRef(config);
  const projectRef = useRef(project);
  const inFlightRef = useRef<Promise<any> | null>(null);
  configRef.current = config;
  projectRef.current = project;

  const commitConfig = useCallback((next: SyncConfig) => {
    configRef.current = next;
    setConfig(next);
    saveSyncConfig(next);
  }, []);

  const updateConfig = useCallback(
    (patch: Partial<SyncConfig>) => {
      const current = configRef.current;
      const connectionChanged =
        (patch.baseUrl !== undefined && patch.baseUrl !== current.baseUrl) ||
        (patch.token !== undefined && patch.token !== current.token) ||
        (patch.projectId !== undefined && patch.projectId !== current.projectId);
      const next: SyncConfig = {
        ...current,
        ...patch,
        ...(connectionChanged
          ? {
              autoSync: false,
              revision: 0,
              lastSyncedHash: "",
              lastRemoteUpdatedAt: "",
            }
          : {}),
      };
      commitConfig(next);
      setState(statusFor(next));
    },
    [commitConfig],
  );

  const runExclusive = useCallback(async <T,>(operation: () => Promise<T>) => {
    if (inFlightRef.current) return inFlightRef.current as Promise<T>;
    const promise = operation().finally(() => {
      if (inFlightRef.current === promise) inFlightRef.current = null;
    });
    inFlightRef.current = promise;
    return promise;
  }, []);

  const applySuccess = useCallback(
    (remote: { revision: number; updatedAt: string }, syncedProject: any) => {
      const next = {
        ...configRef.current,
        revision: remote.revision,
        lastRemoteUpdatedAt: remote.updatedAt,
        lastSyncedHash: projectFingerprint(syncedProject),
      };
      commitConfig(next);
      setState({
        status: "synced",
        message: "",
        remoteRevision: remote.revision,
        remoteUpdatedAt: remote.updatedAt,
      });
    },
    [commitConfig],
  );

  const applyError = useCallback((error: unknown) => {
    const syncError = error instanceof ProjectSyncError
      ? error
      : new ProjectSyncError(String(error));
    setState((current) => ({
      ...current,
      status:
        syncError.code === "offline"
          ? "offline"
          : syncError.status === 409
            ? "conflict"
            : "error",
      message: syncError.message,
      remoteRevision:
        syncError.status === 409
          ? Number(syncError.details?.currentRevision) || current.remoteRevision
          : current.remoteRevision,
      remoteUpdatedAt:
        syncError.status === 409
          ? syncError.details?.updatedAt || current.remoteUpdatedAt
          : current.remoteUpdatedAt,
    }));
    throw syncError;
  }, []);

  const check = useCallback(
    () =>
      runExclusive(async () => {
        setState((current) => ({ ...current, status: "checking", message: "" }));
        try {
          const remote = await fetchRemoteProject(configRef.current);
          setState((current) => ({
            ...current,
            status: "idle",
            message: remote ? "" : "empty",
            remoteRevision: remote?.revision || null,
            remoteUpdatedAt: remote?.updatedAt || "",
          }));
          return remote;
        } catch (error) {
          return applyError(error);
        }
      }),
    [applyError, runExclusive],
  );

  const upload = useCallback(
    (options: { forceRevision?: number } = {}) =>
      runExclusive(async () => {
        setState((current) => ({ ...current, status: "syncing", message: "" }));
        const currentProject = projectRef.current;
        try {
          const result = await putRemoteProject(
            configRef.current,
            currentProject,
            options.forceRevision ?? configRef.current.revision,
          );
          applySuccess(result, currentProject);
          return result;
        } catch (error) {
          return applyError(error);
        }
      }),
    [applyError, applySuccess, runExclusive],
  );

  const download = useCallback(
    () =>
      runExclusive(async () => {
        setState((current) => ({ ...current, status: "syncing", message: "" }));
        try {
          const remote = await fetchRemoteProject(configRef.current);
          if (!remote)
            throw new ProjectSyncError(
              "На компьютере пока нет этого проекта.",
              404,
              "project_not_found",
            );
          applySuccess(remote, remote.project);
          return remote;
        } catch (error) {
          return applyError(error);
        }
      }),
    [applyError, applySuccess, runExclusive],
  );

  useEffect(() => {
    if (!config.autoSync || !configured(config)) return;
    if (projectFingerprint(project) === config.lastSyncedHash) return;
    const timer = window.setTimeout(() => {
      void upload().catch(() => undefined);
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [config, project, upload]);

  useEffect(() => {
    const retry = () => {
      if (
        configRef.current.autoSync &&
        configured(configRef.current) &&
        projectFingerprint(projectRef.current) !== configRef.current.lastSyncedHash
      )
        void upload().catch(() => undefined);
    };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [upload]);

  return {
    config,
    state,
    updateConfig,
    check,
    upload,
    download,
  };
}

export type ProjectSyncController = ReturnType<typeof useProjectSync>;
export type { RemoteProject };
