export const STORAGE_KEY = "haunted-focus.v1";
export const durations = { focus: 25 * 60, break: 5 * 60 };
export function freshState() {
  return {
    version: 1,
    timer: newTimer(),
    tasks: [],
    sessions: [],
    reducedMotion: false,
  };
}
export function newTimer(phase = "focus") {
  return {
    phase,
    status: "idle",
    remaining: durations[phase],
    deadline: null,
    id: null,
  };
}
export function remaining(timer, now) {
  return timer.status === "running"
    ? Math.max(0, Math.ceil((timer.deadline - now) / 1000))
    : Math.ceil(timer.remaining);
}
export function settle(state, now) {
  const t = state.timer;
  if (t.status !== "running" || now < t.deadline) return false;
  if (t.phase === "focus" && !state.sessions.some((s) => s.id === t.id))
    state.sessions.push({
      id: t.id,
      seconds: durations.focus,
      completedAt: t.deadline,
    });
  t.remaining = 0;
  t.status = "completed";
  t.deadline = null;
  return true;
}
export function start(state, now, id) {
  settle(state, now);
  const t = state.timer;
  if (t.status === "running" || t.status === "completed") return;
  t.id ||= id;
  t.deadline = now + t.remaining * 1000;
  t.status = "running";
}
export function pause(state, now) {
  settle(state, now);
  if (state.timer.status !== "running") return;
  state.timer.remaining = Math.max(0, (state.timer.deadline - now) / 1000);
  state.timer.deadline = null;
  state.timer.status = "paused";
}
export function localDay(timestamp) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
export function summary(sessions, now) {
  const today = sessions.filter(
    (s) => localDay(s.completedAt) === localDay(now),
  );
  return {
    count: today.length,
    minutes: today.reduce((n, s) => n + s.seconds, 0) / 60,
  };
}
export function addTask(state, title, id) {
  const text = title.trim().slice(0, 160);
  if (!text) return false;
  state.tasks.push({ id, title: text, done: false });
  return true;
}
export function restore(raw) {
  if (!raw) return freshState();
  const s = JSON.parse(raw);
  const finite = (x) => typeof x === "number" && Number.isFinite(x);
  if (
    !s ||
    s.version !== 1 ||
    !Array.isArray(s.tasks) ||
    !Array.isArray(s.sessions)
  )
    throw new Error("Invalid saved data");
  const t = s.timer;
  if (
    !t ||
    !["focus", "break"].includes(t.phase) ||
    !["idle", "running", "paused", "completed"].includes(t.status) ||
    !finite(t.remaining) ||
    t.remaining < 0 ||
    t.remaining > durations[t.phase] ||
    (t.status === "running" &&
      (!finite(t.deadline) || typeof t.id !== "string"))
  )
    throw new Error("Invalid timer");
  if (
    !s.tasks.every(
      (t) =>
        t &&
        typeof t.id === "string" &&
        typeof t.title === "string" &&
        t.title.length <= 160 &&
        typeof t.done === "boolean",
    ) ||
    !s.sessions.every(
      (s) =>
        s &&
        typeof s.id === "string" &&
        finite(s.completedAt) &&
        s.seconds === durations.focus,
    )
  )
    throw new Error("Invalid records");
  if (
    new Set(s.tasks.map((t) => t.id)).size !== s.tasks.length ||
    new Set(s.sessions.map((t) => t.id)).size !== s.sessions.length
  )
    throw new Error("Duplicate records");
  return {
    version: 1,
    timer: t,
    tasks: s.tasks,
    sessions: s.sessions,
    reducedMotion: s.reducedMotion === true,
  };
}
