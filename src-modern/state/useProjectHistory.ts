import { useCallback, useState, type SetStateAction } from "react";
import {
  commitProjectHistory,
  createProjectHistory,
  redoProjectHistory,
  undoProjectHistory,
} from "./project-history.js";

export function useProjectHistory<T>(initializer: () => T, limit = 80) {
  const [history, setHistory] = useState(() =>
    createProjectHistory(initializer()),
  );

  const setProject = useCallback(
    (action: SetStateAction<T>) => {
      setHistory((current: any) => {
        const next =
          typeof action === "function"
            ? (action as (value: T) => T)(current.present)
            : action;
        return commitProjectHistory(current, next, limit);
      });
    },
    [limit],
  );

  const undo = useCallback(
    () => setHistory((current: any) => undoProjectHistory(current)),
    [],
  );
  const redo = useCallback(
    () => setHistory((current: any) => redoProjectHistory(current)),
    [],
  );

  return {
    project: history.present as T,
    setProject,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
