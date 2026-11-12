import test from "node:test";
import assert from "node:assert/strict";
import {
  freshState,
  newTimer,
  start,
  pause,
  settle,
  remaining,
  summary,
  addTask,
  restore,
  durations,
} from "../src/state.js";
test("start, pause, resume uses deadlines and excludes paused time", () => {
  const s = freshState();
  start(s, 1000, "a");
  assert.equal(remaining(s.timer, 11000), 1490);
  pause(s, 11000);
  assert.equal(s.timer.remaining, 1490);
  start(s, 100000, "b");
  assert.equal(s.timer.id, "a");
  assert.equal(s.timer.deadline, 1590000);
  assert.equal(settle(s, 1590000), true);
  assert.equal(s.sessions.length, 1);
});
test("background catch-up records once at deadline, not observation", () => {
  const s = freshState();
  start(s, 0, "a");
  settle(s, 10e6);
  settle(s, 11e6);
  assert.equal(s.sessions.length, 1);
  assert.equal(s.sessions[0].completedAt, 1500000);
  assert.equal(s.timer.status, "completed");
});
test("repeated start cannot postpone completion", () => {
  const s = freshState();
  start(s, 0, "a");
  start(s, 5000, "b");
  assert.equal(s.timer.deadline, 1500000);
});
test("partial reset does not count and break never grants reward", () => {
  const s = freshState();
  start(s, 0, "a");
  pause(s, 10000);
  s.timer = newTimer("break");
  start(s, 10000, "b");
  settle(s, 310000);
  assert.equal(s.sessions.length, 0);
});
test("pause at completion correctly settles", () => {
  const s = freshState();
  start(s, 0, "a");
  pause(s, 1500000);
  assert.equal(s.timer.status, "completed");
  assert.equal(s.sessions.length, 1);
});
test("reload preserves live deadline and idempotency", () => {
  const s = freshState();
  start(s, 0, "a");
  const loaded = restore(JSON.stringify(s));
  settle(loaded, 1500001);
  const again = restore(JSON.stringify(loaded));
  settle(again, 2e6);
  assert.equal(again.sessions.length, 1);
});
test("local midnight attributes sessions to completion day", () => {
  const now = new Date(2026, 10, 12, 0, 1).getTime();
  const sessions = [
    { seconds: 1500, completedAt: new Date(2026, 10, 11, 23, 59).getTime() },
    { seconds: 1500, completedAt: now },
  ];
  assert.deepEqual(summary(sessions, now), { count: 1, minutes: 25 });
});
test("task validation rejects whitespace and bounds title", () => {
  const s = freshState();
  assert.equal(addTask(s, "  ", "a"), false);
  addTask(s, " hi ", "b");
  assert.equal(s.tasks[0].title, "hi");
  addTask(s, "x".repeat(200), "c");
  assert.equal(s.tasks[1].title.length, 160);
});
test("corrupt storage rejected; missing storage creates state", () => {
  assert.deepEqual(restore(null), freshState());
  assert.throws(() => restore("{"));
  assert.throws(() => restore("{}"));
  const s = freshState();
  s.timer.deadline = "bad";
  s.timer.status = "running";
  assert.throws(() => restore(JSON.stringify(s)));
});
test("invalid versions, duplicate rewards, negative duration rejected", () => {
  const s = freshState();
  s.version = 2;
  assert.throws(() => restore(JSON.stringify(s)));
  s.version = 1;
  s.timer.remaining = -1;
  assert.throws(() => restore(JSON.stringify(s)));
  s.timer = newTimer();
  s.sessions = [
    { id: "a", seconds: durations.focus, completedAt: 0 },
    { id: "a", seconds: durations.focus, completedAt: 0 },
  ];
  assert.throws(() => restore(JSON.stringify(s)));
});
test("pause preserves fractional time without extending sessions", () => {
  const s = freshState();
  start(s, 0, "a");
  pause(s, 100);
  assert.equal(s.timer.remaining, 1499.9);
  start(s, 200, "b");
  assert.equal(s.timer.deadline, 1500100);
});
