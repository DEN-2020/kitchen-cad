export function createProjectHistory(present) {
  return { past: [], present, future: [] };
}

export function commitProjectHistory(history, next, limit = 80) {
  if (Object.is(history.present, next)) return history;
  const maxPast = Math.max(1, limit);
  const retainedPast =
    maxPast > 1 ? history.past.slice(-(maxPast - 1)) : [];
  return {
    past: [...retainedPast, history.present],
    present: next,
    future: [],
  };
}

export function undoProjectHistory(history) {
  if (!history.past.length) return history;
  const present = history.past.at(-1);
  return {
    past: history.past.slice(0, -1),
    present,
    future: [history.present, ...history.future],
  };
}

export function redoProjectHistory(history) {
  if (!history.future.length) return history;
  const [present, ...future] = history.future;
  return {
    past: [...history.past, history.present],
    present,
    future,
  };
}
