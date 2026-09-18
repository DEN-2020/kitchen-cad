import { useState } from "react";
import { DownloadIcon, UploadIcon } from "../ui/Icons";
import type { Lang } from "../i18n";
import type { ProjectSyncController, RemoteProject } from "./useProjectSync";
import "./sync.css";

type Props = {
  lang: Lang;
  sync: ProjectSyncController;
  onLoad: (remote: RemoteProject) => void;
};

export function ProjectSyncPanel({ lang, sync, onLoad }: Props) {
  const [showToken, setShowToken] = useState(false);
  const [pairCode, setPairCode] = useState("");
  const ru = lang === "ru";
  const busy = sync.state.status === "checking" || sync.state.status === "syncing";
  const ready =
    sync.config.baseUrl.trim() &&
    sync.config.token.length >= 32 &&
    sync.config.projectId;

  const check = async () => {
    try {
      await sync.check();
    } catch {
      // State and user-facing message are managed by the hook.
    }
  };
  const pair = async () => {
    try {
      await sync.pair(pairCode);
      setPairCode("");
    } catch {
      // State and user-facing message are managed by the hook.
    }
  };
  const upload = async () => {
    try {
      if (sync.state.status === "conflict") {
        const accepted = window.confirm(
          ru
            ? "На компьютере есть другая версия. Точно заменить её текущим проектом? Предыдущая версия останется в истории SQLite."
            : "The PC has another revision. Replace it with the current project? The prior revision remains in SQLite history.",
        );
        if (!accepted) return;
        await sync.upload({ forceRevision: sync.state.remoteRevision || 0 });
      } else {
        await sync.upload();
      }
    } catch {
      // State and user-facing message are managed by the hook.
    }
  };
  const download = async () => {
    const accepted = window.confirm(
      ru
        ? "Загрузить версию с компьютера? Текущую версию можно будет вернуть через отмену изменений или JSON-экспорт."
        : "Load the PC version and replace the current editor state?",
    );
    if (!accepted) return;
    try {
      onLoad(await sync.download());
    } catch {
      // State and user-facing message are managed by the hook.
    }
  };

  const statusText =
    sync.state.status === "unconfigured"
      ? ru ? "Не настроено" : "Not configured"
      : sync.state.status === "checking"
        ? ru ? "Проверяю…" : "Checking…"
        : sync.state.status === "syncing"
          ? ru ? "Синхронизирую…" : "Syncing…"
          : sync.state.status === "synced"
            ? ru ? "Синхронизировано" : "Synced"
            : sync.state.status === "offline"
              ? ru ? "Компьютер недоступен — локальная копия сохранена" : "PC offline — local copy saved"
              : sync.state.status === "conflict"
                ? ru ? "Есть конфликт версий" : "Revision conflict"
                : sync.state.status === "error"
                  ? sync.state.message
                  : sync.state.message === "empty"
                    ? ru ? "Связь есть, проекта в базе пока нет" : "Connected; no remote project yet"
                    : ru ? "Готово к синхронизации" : "Ready to sync";

  return (
    <section className="syncPanel">
      <div className="syncHeading">
        <h3>{ru ? "Локальная база на компьютере" : "Local PC database"}</h3>
        <span className={`syncBadge ${sync.state.status}`}>{statusText}</span>
      </div>
      <div className="syncFields">
        <label className="field syncUrlField">
          {ru ? "Постоянный адрес синхронизации" : "Stable sync address"}
          <input
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="https://kitchen-cad.pages.dev/api/sync"
            value={sync.config.baseUrl}
            onChange={(event) => sync.updateConfig({ baseUrl: event.target.value })}
          />
        </label>
        {sync.config.token.length < 32 && (
          <label className="field syncTokenField">
            {ru ? "Одноразовый код подключения" : "One-time connection code"}
            <span className="syncTokenInput">
              <input
                autoCapitalize="characters"
                autoComplete="off"
                maxLength={32}
                placeholder={ru ? "Код с локального компьютера" : "Code from the local PC"}
                value={pairCode}
                onChange={(event) => setPairCode(event.target.value.trim())}
              />
              <button
                type="button"
                disabled={pairCode.length < 8 || busy}
                onClick={() => void pair()}
              >
                {ru ? "Подключить" : "Connect"}
              </button>
            </span>
          </label>
        )}
        <label className="field">
          {ru ? "Код проекта" : "Project ID"}
          <input
            autoCapitalize="none"
            pattern="[A-Za-z0-9_-]+"
            value={sync.config.projectId}
            onChange={(event) =>
              sync.updateConfig({
                projectId: event.target.value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64),
              })
            }
          />
        </label>
        <label className="field syncTokenField">
          {ru ? "Секретный ключ" : "Secret sync key"}
          <span className="syncTokenInput">
            <input
              type={showToken ? "text" : "password"}
              autoCapitalize="none"
              autoComplete="off"
              value={sync.config.token}
              onChange={(event) => sync.updateConfig({ token: event.target.value.trim() })}
            />
            <button type="button" onClick={() => setShowToken((value) => !value)}>
              {showToken ? (ru ? "Скрыть" : "Hide") : ru ? "Показать" : "Show"}
            </button>
          </span>
        </label>
      </div>
      <div className="syncActions">
        <button type="button" disabled={!ready || busy} onClick={() => void check()}>
          {ru ? "Проверить связь" : "Test connection"}
        </button>
        <button type="button" disabled={!ready || busy} onClick={() => void download()}>
          <DownloadIcon size={16} />
          {ru ? "Загрузить с ПК" : "Load from PC"}
        </button>
        <button type="button" disabled={!ready || busy} onClick={() => void upload()}>
          <UploadIcon size={16} />
          {sync.state.status === "conflict"
            ? ru ? "Заменить на ПК" : "Replace on PC"
            : ru ? "Сохранить на ПК" : "Save to PC"}
        </button>
      </div>
      <label className={`syncAuto ${!ready ? "disabled" : ""}`}>
        <input
          type="checkbox"
          checked={sync.config.autoSync}
          disabled={!ready}
          onChange={(event) => sync.updateConfig({ autoSync: event.target.checked })}
        />
        <span>
          <b>{ru ? "Автосинхронизация" : "Automatic sync"}</b>
          <small>
            {ru
              ? "Сначала вручную сохрани или загрузи проект, затем включи. При выключенном ПК редактор продолжит сохранять локально."
              : "Upload or download once before enabling. The editor keeps saving locally while the PC is offline."}
          </small>
        </span>
      </label>
      {!!(sync.state.remoteRevision || sync.config.revision) && (
        <p className="syncMeta">
          {ru ? "Версия на ПК" : "PC revision"}: {sync.state.remoteRevision || sync.config.revision}
          {(sync.state.remoteUpdatedAt || sync.config.lastRemoteUpdatedAt) && (
            <> · {new Date(sync.state.remoteUpdatedAt || sync.config.lastRemoteUpdatedAt).toLocaleString()}</>
          )}
        </p>
      )}
      <p className="note syncNote">
        {ru
          ? "Адрес pages.dev остаётся постоянным, даже когда временный туннель меняется. Ключ хранится только в этом браузере; SQLite и резервные копии — на локальном компьютере."
          : "The pages.dev address stays stable when the temporary tunnel changes. The key stays in this browser; SQLite and backups remain on the local PC."}
      </p>
    </section>
  );
}
