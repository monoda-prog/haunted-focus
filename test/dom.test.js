import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM } from "jsdom";
import * as model from "../src/state.js";
const source = fs
  .readFileSync(new URL("../src/main.js", import.meta.url), "utf8")
  .replace(/^import[\s\S]*?;\n/gm, "");
function app(saved, storageFails = false) {
  const dom = new JSDOM('<div id="app"></div>', {
    url: "http://localhost",
    runScripts: "dangerously",
  });
  const w = dom.window;
  Object.assign(w, model);
  if (saved) w.localStorage.setItem(model.STORAGE_KEY, saved);
  if (storageFails)
    w.Storage.prototype.setItem = () => {
      throw new Error("quota");
    };
  w.confirm = () => true;
  w.eval(source);
  const el = (id) => w.document.getElementById(id);
  return { w, el, close: () => w.close() };
}
test("DOM task lifecycle including text safety, persistence and focus", () => {
  const a = app();
  try {
    a.el("task-input").value = "<script>hello</script>";
    a.el("task-form").dispatchEvent(
      new a.w.Event("submit", { cancelable: true }),
    );
    assert.equal(a.el("task-list").children.length, 1);
    assert.equal(a.el("task-list").querySelector("script"), null);
    const cb = a.el("task-list").querySelector("input");
    cb.checked = true;
    cb.dispatchEvent(new a.w.Event("change", { bubbles: true }));
    assert.equal(a.el("task-count").textContent, "1 / 1");
    const next = a.el("task-list").querySelector("input");
    next.checked = false;
    next.dispatchEvent(new a.w.Event("change", { bubbles: true }));
    assert.equal(a.el("task-count").textContent, "0 / 1");
    a.el("task-list").querySelector("button").click();
    assert.equal(a.el("task-list").children.length, 0);
    assert.equal(a.el("empty").hidden, false);
    assert.ok(a.w.localStorage.getItem(model.STORAGE_KEY));
  } finally {
    a.close();
  }
});
test("DOM timer pause resume reset cancel and mode transition", () => {
  const a = app();
  try {
    a.el("start").click();
    assert.match(a.el("start").textContent, /Pause/);
    a.el("start").click();
    assert.match(a.el("start").textContent, /Resume/);
    a.w.confirm = () => false;
    a.el("reset").click();
    assert.match(a.el("start").textContent, /Resume/);
    a.w.confirm = () => true;
    a.el("reset").click();
    assert.equal(a.el("clock").textContent, "25:00");
    a.el("break-mode").click();
    assert.equal(a.el("clock").textContent, "05:00");
    assert.equal(a.el("sessions").textContent, "0");
  } finally {
    a.close();
  }
});
test("DOM expired reload completes once with explicit next phase", () => {
  const s = model.freshState();
  model.start(s, Date.now() - 1501000, "a");
  const a = app(JSON.stringify(s));
  try {
    assert.equal(a.el("sessions").textContent, "1");
    assert.equal(a.el("next-phase").hidden, false);
    assert.equal(a.el("start").disabled, true);
    a.el("next-phase").click();
    assert.equal(a.el("phase-label").textContent, "TIME TO RECHARGE");
    assert.match(a.el("start").textContent, /Pause/);
  } finally {
    a.close();
  }
});
test("DOM settings Escape and reduced motion", () => {
  const a = app();
  try {
    a.el("settings-toggle").click();
    assert.equal(a.el("settings").hidden, false);
    a.el("motion").checked = true;
    a.el("motion").dispatchEvent(new a.w.Event("change"));
    assert.equal(
      a.w.document.documentElement.classList.contains("reduce-motion"),
      true,
    );
    a.w.document.dispatchEvent(
      new a.w.KeyboardEvent("keydown", { key: "Escape" }),
    );
    assert.equal(a.el("settings").hidden, true);
    assert.equal(a.w.document.activeElement.id, "settings-toggle");
  } finally {
    a.close();
  }
});
test("DOM corrupt storage preserved and quota failure disclosed", () => {
  const a = app("invalid");
  try {
    assert.equal(a.el("storage-warning").hidden, false);
    a.el("start").click();
    assert.equal(a.w.localStorage.getItem(model.STORAGE_KEY), "invalid");
  } finally {
    a.close();
  }
  const b = app(null, true);
  try {
    assert.equal(b.el("storage-warning").hidden, false);
    assert.match(b.el("storage-warning").textContent, /unavailable/);
  } finally {
    b.close();
  }
});
