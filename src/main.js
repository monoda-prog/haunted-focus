import "./style.css";
import {
  STORAGE_KEY,
  freshState,
  newTimer,
  remaining,
  settle,
  start,
  pause,
  summary,
  addTask,
  restore,
  durations,
} from "./state.js";
let state,
  storageWarning = "",
  writable = true;
try {
  state = restore(localStorage.getItem(STORAGE_KEY));
} catch {
  state = freshState();
  writable = false;
  storageWarning =
    "Saved data could not be read. This session will not overwrite it. Export your current data before closing.";
}
let locked = !!navigator.locks;
const uid = () => crypto.randomUUID();
const app = document.querySelector("#app");
app.innerHTML = `<header><a class="brand" href="#main"><span class="brand-icon">✦</span> haunted<span>focus</span></a><div class="header-right"><span class="local-badge">● LOCAL & PRIVATE</span><button class="icon-button" id="settings-toggle" aria-expanded="false" aria-controls="settings">⚙ <span>Settings</span></button></div></header>
<main id="main"><div class="intro"><p class="eyebrow">MAKE ROOM FOR A LITTLE MAGIC</p><h1>Less distraction.<br><em>More enchantment.</em></h1><p>One task. One quiet moment. Bring your haunted house to life.</p></div>
<section id="settings" class="settings" hidden aria-label="Settings"><div><h2>Your quiet corner</h2><p>All data stays in this browser. No account, tracking, or cloud sync.</p></div><label><input id="motion" type="checkbox"> Reduce decorative motion</label><p>System reduced-motion settings are always respected.</p><button id="export">Export data</button><button id="settings-close">Close settings</button></section>
<p id="storage-warning" class="warning" role="status" hidden></p><p id="tab-warning" class="warning" hidden>This app is already open in another tab. Use that tab to keep your progress in sync.</p>
<div class="workspace"><section class="timer-card" aria-labelledby="timer-heading"><div class="card-top"><span class="eyebrow">THE FOCUS RITUAL</span><span id="status-pill" class="pill">Ready when you are</span></div><div class="mode-tabs"><button id="focus-mode" aria-pressed="true">Focus · 25 min</button><button id="break-mode" aria-pressed="false">Break · 5 min</button></div><h2 id="timer-heading" class="sr-only">Focus timer</h2><div class="timer-ring"><div><p id="phase-label">TIME TO FOCUS</p><div id="clock" role="timer" aria-label="Time remaining">25:00</div><p id="timer-caption">A little progress is still progress.</p></div></div><div class="timer-actions"><button class="primary" id="start">▶ Start focusing</button><button id="reset" class="reset">↺ Reset</button></div><p id="reminder" class="reminder" role="status" aria-live="polite"></p><button id="next-phase" hidden></button><p class="timer-note">No rush. Just the next 25 minutes.</p></section>
<section class="scene-card" aria-labelledby="scene-heading"><div class="card-top"><div><span class="eyebrow">YOUR LITTLE HAUNT</span><h2 id="scene-heading">A house full of possibility</h2></div><span class="moon-icon" aria-hidden="true">☾</span></div><div class="scene" aria-hidden="true"><div class="moon"></div><span class="star s1">✧</span><span class="star s2">✦</span><span class="star s3">·</span><span class="star s4">✧</span><div class="hill back"></div><div class="house"><div class="tower"><div class="roof tower-roof"></div><div class="window round" data-window></div></div><div class="house-body"><div class="roof main-roof"></div><div class="windows">${Array.from({ length: 6 }, () => '<div class="window" data-window></div>').join("")}</div><div class="door"></div></div></div><div class="ghost g1">◕<span>◕</span></div><div class="ghost g2">◕<span>◕</span></div><div class="hill front"></div><div class="pumpkin">✦</div><div class="path"></div></div><div class="scene-caption"><span class="spark">✧</span><div><strong id="house-progress">Your first window is waiting</strong><p>Finish a focus session. Let a little light in.</p></div></div></section></div>
<section class="stats" aria-label="Today's focus statistics"><div><span class="stat-icon">◷</span><div><strong id="minutes">0</strong><span>focus minutes today</span></div></div><div><span class="stat-icon">▦</span><div><strong id="sessions">0</strong><span>sessions completed today</span></div></div><div><span class="stat-icon">✧</span><div><strong id="task-count">0 / 0</strong><span>tasks complete</span></div></div></section>
<section class="tasks-card" aria-labelledby="tasks-heading"><div class="task-heading"><div><p class="eyebrow">ONE GHOST AT A TIME</p><h2 id="tasks-heading">What’s on your mind?</h2></div><span class="pill" id="tasks-left">A fresh start</span></div><form id="task-form"><label class="sr-only" for="task-input">New task</label><input id="task-input" placeholder="Give your next task a name…" maxlength="160" required autocomplete="off"><button class="primary" type="submit">+ Add task</button></form><ul id="task-list"></ul><div id="empty"><span aria-hidden="true">✧</span><p>A clear slate. A little breathing room.</p><small>Add a task above to begin your next small adventure.</small></div><p class="task-tip">Complete a task to turn its ghost into a star.</p></section>
<footer><p>Built for quiet minds & beautifully ordinary progress.</p><details><summary>How your progress works</summary><p>Only full 25-minute focus sessions count. Sessions belong to their completion day in your current timezone. Windows show today’s sessions, up to seven; all sessions still count. Completed tasks can be undone.</p><p>The timer continues in background tabs and across reloads using your device clock. A finished timer waits for you; breaks never start automatically. Changing your device clock changes the countdown. Closing the browser cannot deliver a reminder; you will see it when you return.</p><p>Data is saved locally when browser storage is available. Clearing site data removes it. Export a backup in Settings. Keep one tab open for editing. No sound or operating-system notification is required.</p></details></footer></main><div id="announcer" class="sr-only" role="status" aria-live="polite"></div>`;
const $ = (id) => document.getElementById(id);
function announce(text) {
  $("announcer").textContent = text;
}
function save() {
  if (!writable || locked) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    storageWarning =
      "Browser storage is unavailable or full. Changes only last in this tab. Export your data from Settings before closing.";
  }
}
function updateClock() {
  const seconds = remaining(state.timer, Date.now());
  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  $("clock").textContent = time;
  document.title =
    state.timer.status === "running"
      ? `${time} · Haunted Focus`
      : "Haunted Focus";
  const stats = summary(state.sessions, Date.now());
  $("minutes").textContent = stats.minutes;
  $("sessions").textContent = stats.count;
  document
    .querySelectorAll("[data-window]")
    .forEach((e, i) => e.classList.toggle("lit", i < stats.count));
  $("house-progress").textContent = stats.count
    ? `${stats.count} ${stats.count === 1 ? "session" : "sessions"} of light today`
    : "Your first window is waiting";
}
function render() {
  app.querySelectorAll("button,input").forEach((e) => (e.disabled = locked));
  updateClock();
  const t = state.timer;
  document.documentElement.classList.toggle(
    "reduce-motion",
    state.reducedMotion,
  );
  $("motion").checked = state.reducedMotion;
  $("focus-mode").setAttribute("aria-pressed", t.phase === "focus");
  $("break-mode").setAttribute("aria-pressed", t.phase === "break");
  $("phase-label").textContent =
    t.phase === "focus" ? "TIME TO FOCUS" : "TIME TO RECHARGE";
  $("status-pill").textContent = {
    idle: "Ready when you are",
    running: "Ritual in progress",
    paused: "Take your time",
    completed: "Beautifully done",
  }[t.status];
  $("start").textContent =
    t.status === "running"
      ? "Ⅱ Pause"
      : t.status === "paused"
        ? "▶ Resume"
        : t.phase === "focus"
          ? "▶ Start focusing"
          : "▶ Start break";
  $("start").disabled = t.status === "completed" || locked;
  $("reminder").textContent =
    t.status === "completed"
      ? t.phase === "focus"
        ? "A window lights up. Your focus session is complete. Take a five-minute break?"
        : "Break complete. Ready for another little adventure?"
      : "";
  $("next-phase").hidden = t.status !== "completed";
  $("next-phase").textContent =
    t.phase === "focus" ? "Begin 5-minute break" : "Begin next focus session";
  $("storage-warning").hidden = !storageWarning;
  $("storage-warning").textContent = storageWarning;
  const done = state.tasks.filter((t) => t.done).length;
  $("task-count").textContent = `${done} / ${state.tasks.length}`;
  $("tasks-left").textContent = state.tasks.length
    ? `${state.tasks.length - done} left to do`
    : "A fresh start";
  $("empty").hidden = state.tasks.length > 0;
  const active = document.activeElement;
  const focusId = active?.dataset?.task;
  const focusAction = active?.dataset?.action;
  $("task-list").replaceChildren(
    ...state.tasks.map((task) => {
      const li = document.createElement("li");
      li.className = task.done ? "done" : "";
      const check = document.createElement("input");
      check.type = "checkbox";
      check.checked = task.done;
      check.dataset.task = task.id;
      check.dataset.action = "toggle";
      check.id = `task-${task.id}`;
      const label = document.createElement("label");
      label.htmlFor = check.id;
      label.textContent = task.title;
      const symbol = document.createElement("span");
      symbol.className = "task-symbol";
      symbol.textContent = task.done ? "✦" : "👻";
      symbol.setAttribute("aria-hidden", "true");
      const status = document.createElement("span");
      status.className = "sr-only";
      status.textContent = task.done ? "Completed" : "Incomplete";
      const del = document.createElement("button");
      del.textContent = "×";
      del.className = "delete";
      del.dataset.task = task.id;
      del.dataset.action = "delete";
      del.setAttribute("aria-label", `Delete ${task.title}`);
      li.append(check, symbol, label, status, del);
      return li;
    }),
  );
  if (focusId) {
    const next = [...$("task-list").querySelectorAll("[data-task]")].find(
      (e) => e.dataset.task === focusId && e.dataset.action === focusAction,
    );
    (next || $("task-input")).focus();
  }
  if (locked)
    app.querySelectorAll("button,input").forEach((e) => (e.disabled = true));
}
function mutate(fn) {
  if (locked) return;
  settle(state, Date.now());
  fn();
  save();
  render();
}
$("start").onclick = () =>
  mutate(() => {
    state.timer.status === "running"
      ? pause(state, Date.now())
      : start(state, Date.now(), uid());
    announce(
      state.timer.status === "completed"
        ? "Session completed."
        : state.timer.status === "running"
          ? "Timer started."
          : "Timer paused.",
    );
  });
$("reset").onclick = () => {
  if (state.timer.status === "running" || state.timer.status === "paused") {
    if (!confirm("Reset this timer? Unfinished focus time will not count."))
      return;
  }
  mutate(() => {
    state.timer = newTimer(state.timer.phase);
    announce("Timer reset.");
  });
};
function switchMode(phase) {
  if (phase === state.timer.phase) return;
  if (
    ["running", "paused"].includes(state.timer.status) &&
    !confirm("Switch modes? Unfinished focus time will not count.")
  )
    return;
  mutate(() => {
    state.timer = newTimer(phase);
    announce(`${phase === "focus" ? "Focus" : "Break"} mode selected.`);
  });
}
$("focus-mode").onclick = () => switchMode("focus");
$("break-mode").onclick = () => switchMode("break");
$("next-phase").onclick = () =>
  mutate(() => {
    state.timer = newTimer(state.timer.phase === "focus" ? "break" : "focus");
    start(state, Date.now(), uid());
    announce("Timer started.");
  });
$("task-form").onsubmit = (e) => {
  e.preventDefault();
  mutate(() => {
    if (addTask(state, $("task-input").value, uid())) {
      $("task-input").value = "";
      announce("Task added.");
    }
  });
  $("task-input").focus();
};
$("task-list").addEventListener("change", (e) => {
  if (e.target.dataset.action === "toggle")
    mutate(() => {
      const t = state.tasks.find((t) => t.id === e.target.dataset.task);
      if (t) {
        t.done = e.target.checked;
        announce(
          t.done
            ? "Task complete. A ghost becomes a star."
            : "Task marked incomplete.",
        );
      }
    });
});
$("task-list").addEventListener("click", (e) => {
  if (e.target.dataset.action === "delete")
    mutate(() => {
      state.tasks = state.tasks.filter((t) => t.id !== e.target.dataset.task);
      announce("Task deleted.");
    });
});
function showSettings(open) {
  $("settings").hidden = !open;
  $("settings-toggle").setAttribute("aria-expanded", open);
  (open ? $("motion") : $("settings-toggle")).focus();
}
$("settings-toggle").onclick = () => showSettings($("settings").hidden);
$("settings-close").onclick = () => showSettings(false);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("settings").hidden) showSettings(false);
});
$("motion").onchange = (e) =>
  mutate(() => {
    state.reducedMotion = e.target.checked;
  });
$("export").onclick = () => {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "haunted-focus-backup.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
function tick() {
  if (locked) return;
  if (settle(state, Date.now())) {
    save();
    render();
  } else updateClock();
}
function initialize() {
  settle(state, Date.now());
  save();
  render();
}
if (navigator.locks) {
  navigator.locks.request(
    "haunted-focus-editor",
    { ifAvailable: true },
    async (lock) => {
      if (!lock) {
        locked = true;
        $("tab-warning").hidden = false;
        render();
        return;
      }
      locked = false;
      initialize();
      await new Promise(() => {});
    },
  );
} else
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      locked = true;
      $("tab-warning").textContent =
        "Progress changed in another tab. Reload this tab before editing.";
      $("tab-warning").hidden = false;
      render();
    }
  });
if (!navigator.locks) initialize();
else render();
setInterval(tick, 500);
document.addEventListener("visibilitychange", tick);
window.addEventListener("focus", tick);
