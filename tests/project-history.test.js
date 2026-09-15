import test from "node:test";
import assert from "node:assert/strict";
import {
  commitProjectHistory,
  createProjectHistory,
  redoProjectHistory,
  undoProjectHistory,
} from "../src-modern/state/project-history.js";

test("history supports undo and redo in order", () => {
  let history = createProjectHistory({ value: 1 });
  history = commitProjectHistory(history, { value: 2 });
  history = commitProjectHistory(history, { value: 3 });
  history = undoProjectHistory(history);
  assert.equal(history.present.value, 2);
  history = undoProjectHistory(history);
  assert.equal(history.present.value, 1);
  history = redoProjectHistory(history);
  assert.equal(history.present.value, 2);
});

test("new edit after undo clears redo history", () => {
  let history = createProjectHistory("a");
  history = commitProjectHistory(history, "b");
  history = undoProjectHistory(history);
  history = commitProjectHistory(history, "c");
  assert.equal(history.present, "c");
  assert.equal(history.future.length, 0);
});

test("history ignores identical references and respects its limit", () => {
  const initial = { value: 0 };
  let history = createProjectHistory(initial);
  assert.equal(commitProjectHistory(history, initial), history);
  for (let value = 1; value <= 5; value++)
    history = commitProjectHistory(history, { value }, 3);
  assert.equal(history.past.length, 3);
  history = undoProjectHistory(history);
  history = undoProjectHistory(history);
  history = undoProjectHistory(history);
  assert.equal(history.present.value, 2);
});

test("a one-step history limit keeps only the latest undo state", () => {
  let history = createProjectHistory("a");
  history = commitProjectHistory(history, "b", 1);
  history = commitProjectHistory(history, "c", 1);
  assert.equal(history.past.length, 1);
  history = undoProjectHistory(history);
  assert.equal(history.present, "b");
});
