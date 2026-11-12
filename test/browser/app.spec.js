import { test, expect } from "@playwright/test";
test("tasks, undo, delete, settings and reload", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Start focusing" }),
  ).toBeEnabled();
  await page.getByLabel("New task").fill("<script>not HTML</script>");
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.locator("#task-list li")).toHaveCount(1);
  await page.getByLabel("<script>not HTML</script>", { exact: true }).check();
  await expect(page.locator("#task-count")).toHaveText("1 / 1");
  await page.reload();
  await expect(page.locator("#task-count")).toHaveText("1 / 1");
  await page.getByLabel("<script>not HTML</script>", { exact: true }).uncheck();
  await expect(page.locator("#task-count")).toHaveText("0 / 1");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Reduce decorative motion").check();
  await expect(page.locator("html")).toHaveClass("reduce-motion");
  await page.keyboard.press("Escape");
  await expect(page.locator("#settings")).toBeHidden();
  await page
    .getByRole("button", { name: "Delete <script>not HTML</script>" })
    .click();
  await expect(page.locator("#empty")).toBeVisible();
});
test("timer pause, resume, cancel and reset", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start focusing" }).click();
  await expect(page.locator("#status-pill")).toHaveText("Ritual in progress");
  await page.getByRole("button", { name: "Pause", exact: false }).click();
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  await page.getByRole("button", { name: "Resume" }).click();
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.locator("#status-pill")).toHaveText("Ritual in progress");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.locator("#clock")).toHaveText("25:00");
  await expect(page.locator("#sessions")).toHaveText("0");
});
test("expired session restores once and offers explicit break", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem(
      "haunted-focus.v1",
      JSON.stringify({
        version: 1,
        timer: {
          phase: "focus",
          status: "running",
          remaining: 1500,
          deadline: Date.now() - 1000,
          id: "session-1",
        },
        tasks: [],
        sessions: [],
        reducedMotion: false,
      }),
    ),
  );
  await page.reload();
  await expect(page.locator("#sessions")).toHaveText("1");
  await page.reload();
  await expect(page.locator("#sessions")).toHaveText("1");
  await page.getByRole("button", { name: "Begin 5-minute break" }).click();
  await expect(page.locator("#phase-label")).toHaveText("TIME TO RECHARGE");
  await expect(page.locator("#clock")).toHaveText("05:00");
});
test("second tab cannot overwrite active editor", async ({ page, context }) => {
  await page.goto("/");
  await page.getByLabel("New task").fill("Keep me");
  await page.getByRole("button", { name: "Add task" }).click();
  const other = await context.newPage();
  await other.goto("/");
  await expect(other.locator("#tab-warning")).toBeVisible();
  await expect(other.getByLabel("New task")).toBeDisabled();
  await page.close();
  await other.reload();
  await expect(other.getByLabel("New task")).toBeEnabled();
  await expect(other.locator("#task-list")).toContainText("Keep me");
});
test("corrupt data remains intact and shows warning", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("haunted-focus.v1", "invalid"),
  );
  await page.reload();
  await expect(page.locator("#storage-warning")).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("haunted-focus.v1")),
  ).toBe("invalid");
});
test("mobile layout and system reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator(".ghost")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await page.screenshot({ path: "test-artifacts/mobile.png", fullPage: true });
});
test("desktop screenshot and no runtime errors", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/");
  await page.screenshot({ path: "test-artifacts/desktop.png", fullPage: true });
  expect(errors).toEqual([]);
});
