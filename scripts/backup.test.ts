// SPDX-License-Identifier: GPL-3.0-or-later

import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
// @ts-expect-error The production CLI is intentionally a plain ESM module.
import { createBackup } from "./backup.mjs";
// @ts-expect-error The production CLI is intentionally a plain ESM module.
import { restoreBackup } from "./restore.mjs";

const temporaryRoots: string[] = [];

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "timeframe-backup-test-"));
  temporaryRoots.push(root);
  await mkdir(path.join(root, "data"));
  await mkdir(path.join(root, "config"));
  const settings = { version: 1, language: "en", locale: "en-US", timezone: "Europe/Budapest", weekStartsOn: 1, workingDays: [1, 2, 3, 4, 5], dailyTargetMinutes: 480, lunchBreakMinutes: 30 };
  await writeFile(path.join(root, "config", "settings.json"), JSON.stringify(settings));
  const database = new Database(path.join(root, "data", "worktime.db"));
  database.exec("CREATE TABLE marker (value TEXT NOT NULL)");
  database.prepare("INSERT INTO marker VALUES (?)").run("original");
  database.close();
  return root;
}

afterEach(async () => { await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe("backup and restore scripts", () => {
  it("restores the database and settings and preserves the replaced state", async () => {
    const root = await fixture();
    const source = path.join(root, "saved");
    await createBackup({ root, destination: source });

    const database = new Database(path.join(root, "data", "worktime.db"));
    database.prepare("UPDATE marker SET value = ?").run("changed");
    database.close();
    const settingsFile = path.join(root, "config", "settings.json");
    const settings = JSON.parse(await readFile(settingsFile, "utf8"));
    await writeFile(settingsFile, JSON.stringify({ ...settings, locale: "hu-HU" }));

    const safetyDirectory = await restoreBackup({ root, source });
    const restored = new Database(path.join(root, "data", "worktime.db"), { readonly: true });
    expect(restored.prepare("SELECT value FROM marker").pluck().get()).toBe("original");
    restored.close();
    expect(JSON.parse(await readFile(settingsFile, "utf8")).locale).toBe("en-US");
    expect(path.basename(safetyDirectory)).toMatch(/^pre-restore-/);
  });

  it("rejects an invalid manifest without changing the current database", async () => {
    const root = await fixture();
    const source = path.join(root, "invalid");
    await mkdir(source);
    await writeFile(path.join(source, "manifest.json"), JSON.stringify({ formatVersion: 99 }));
    await expect(restoreBackup({ root, source })).rejects.toThrow("invalid backup manifest");
    const database = new Database(path.join(root, "data", "worktime.db"), { readonly: true });
    expect(database.prepare("SELECT value FROM marker").pluck().get()).toBe("original");
    database.close();
  });
});
