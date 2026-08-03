import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type * as Store from "./store";

let root = "";
let originalDirectory = "";
let store: typeof Store;

beforeAll(async () => {
  originalDirectory = process.cwd();
  root = await mkdtemp(path.join(os.tmpdir(), "timeframe-store-test-"));
  await mkdir(path.join(root, "config"));
  await writeFile(path.join(root, "config", "settings.json"), JSON.stringify({ version: 1, language: "en", locale: "en-US", timezone: "Europe/Budapest", weekStartsOn: 1, workingDays: [1, 2, 3, 4, 5], dailyTargetMinutes: 480, lunchBreakMinutes: 30 }));
  process.chdir(root);
  store = await import("./store");
});

afterAll(async () => {
  store.closeStore();
  process.chdir(originalDirectory);
  await rm(root, { recursive: true, force: true });
});

describe.sequential("SQLite store", () => {
  it("creates sessions, synchronizes breaks, and rejects overlaps", async () => {
    await store.upsertSession({ id: "first", workDate: "2026-07-31", start: "2026-07-31T08:00:00", end: "2026-07-31T12:00:00" });
    await store.upsertSession({ id: "second", workDate: "2026-07-31", start: "2026-07-31T12:30:00", end: "2026-07-31T17:00:00" });
    expect(await store.readBreaks("2026-07-31", "2026-07-31")).toMatchObject([{ afterSessionId: "first", start: "2026-07-31T12:00:00", end: "2026-07-31T12:30:00" }, { afterSessionId: "second", end: null }]);
    await expect(store.upsertSession({ id: "overlap", workDate: "2026-07-31", start: "2026-07-31T11:00:00", end: "2026-07-31T13:00:00" })).rejects.toThrow("átfed");
  });

  it("closes and reopens a workday", async () => {
    await store.closeWorkDay("2026-07-31", "2026-07-31T17:00:00");
    expect((await store.readWorkDay("2026-07-31")).closedAt).toBe("2026-07-31T17:00:00");
    await expect(store.upsertSession({ id: "late", workDate: "2026-07-31", start: "2026-07-31T18:00:00", end: "2026-07-31T19:00:00" })).rejects.toThrow("újranyitandó");
    await store.reopenWorkDay("2026-07-31", "Correction");
    expect((await store.readWorkDay("2026-07-31")).closedAt).toBeNull();
  });

  it("rejects future start and end times on the configured current day", async () => {
    const now = new Date("2026-08-03T08:00:00Z"); // 10:00 in Europe/Budapest
    await store.upsertSession({ id: "current", workDate: "2026-08-03", start: "2026-08-03T09:59:00", end: null }, now);
    await expect(store.upsertSession({ id: "future-start", workDate: "2026-08-03", start: "2026-08-03T10:01:00", end: null }, now)).rejects.toThrow("jövőben");
    await expect(store.upsertSession({ id: "future-end", workDate: "2026-08-03", start: "2026-08-03T09:00:00", end: "2026-08-03T10:01:00" }, now)).rejects.toThrow("jövőben");
  });
});
