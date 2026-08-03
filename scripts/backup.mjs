#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-or-later

import Database from "better-sqlite3";
import { copyFile, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function backupName(prefix = "timeframe") {
  return `${prefix}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
}

export async function createBackup({ root = PROJECT_ROOT, destination } = {}) {
  const databaseFile = path.join(root, "data", "worktime.db");
  const settingsFile = path.join(root, "config", "settings.json");
  const finalDirectory = path.resolve(destination ?? path.join(root, "backups", backupName()));
  const temporaryDirectory = `${finalDirectory}.partial-${process.pid}`;

  await rm(temporaryDirectory, { recursive: true, force: true });
  await mkdir(path.dirname(finalDirectory), { recursive: true });
  await mkdir(temporaryDirectory);

  let database;
  try {
    JSON.parse(await readFile(settingsFile, "utf8"));
    database = new Database(databaseFile, { readonly: true, fileMustExist: true });
    await database.backup(path.join(temporaryDirectory, "worktime.db"));
    database.close();
    database = undefined;
    await copyFile(settingsFile, path.join(temporaryDirectory, "settings.json"));
    await writeFile(path.join(temporaryDirectory, "manifest.json"), `${JSON.stringify({
      formatVersion: 1,
      application: "Timeframe",
      createdAt: new Date().toISOString(),
      files: { database: "worktime.db", settings: "settings.json" },
    }, null, 2)}\n`, "utf8");
    await rename(temporaryDirectory, finalDirectory);
    return finalDirectory;
  } catch (error) {
    database?.close();
    await rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  }
}

async function main() {
  const destination = process.argv[2];
  const directory = await createBackup({ destination });
  console.log(`Backup created: ${directory}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(`Backup failed: ${error.message}`); process.exitCode = 1; });
}
