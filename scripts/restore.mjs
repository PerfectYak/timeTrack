#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-or-later

import Database from "better-sqlite3";
import { access, copyFile, mkdir, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { backupName, createBackup } from "./backup.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function validateSettings(value) {
  return value?.version === 1 && ["hu", "en"].includes(value.language) && ["hu-HU", "en-US"].includes(value.locale) &&
    typeof value.timezone === "string" && Array.isArray(value.workingDays) && Number.isInteger(value.dailyTargetMinutes) && Number.isInteger(value.lunchBreakMinutes);
}

async function validateBackup(source) {
  const manifest = JSON.parse(await readFile(path.join(source, "manifest.json"), "utf8"));
  if (manifest.formatVersion !== 1 || manifest.application !== "Timeframe" || manifest.files?.database !== "worktime.db" || manifest.files?.settings !== "settings.json") {
    throw new Error("Unsupported or invalid backup manifest.");
  }
  const settings = JSON.parse(await readFile(path.join(source, manifest.files.settings), "utf8"));
  if (!validateSettings(settings)) throw new Error("The backup contains invalid settings.");
  const databaseFile = path.join(source, manifest.files.database);
  await access(databaseFile);
  const database = new Database(databaseFile, { readonly: true, fileMustExist: true });
  try {
    const result = database.pragma("integrity_check", { simple: true });
    if (result !== "ok") throw new Error(`SQLite integrity check failed: ${result}`);
  } finally { database.close(); }
  return { databaseFile, settingsFile: path.join(source, manifest.files.settings) };
}

async function assertNoActiveWriter(databaseFile) {
  try { await access(databaseFile); } catch { return; }
  const database = new Database(databaseFile, { fileMustExist: true, timeout: 300 });
  try {
    database.pragma("busy_timeout = 300");
    database.exec("BEGIN IMMEDIATE; ROLLBACK;");
  } catch {
    throw new Error("The database is busy. Stop the application before restoring a backup.");
  } finally { database.close(); }
}

export async function restoreBackup({ root = PROJECT_ROOT, source } = {}) {
  if (!source) throw new Error("A backup directory is required.");
  const sourceDirectory = path.resolve(source);
  const validated = await validateBackup(sourceDirectory);
  const dataDirectory = path.join(root, "data");
  const configDirectory = path.join(root, "config");
  const databaseFile = path.join(dataDirectory, "worktime.db");
  const settingsFile = path.join(configDirectory, "settings.json");
  await assertNoActiveWriter(databaseFile);

  const safetyDirectory = path.join(root, "backups", backupName("pre-restore"));
  await createBackup({ root, destination: safetyDirectory });
  await mkdir(dataDirectory, { recursive: true });
  await mkdir(configDirectory, { recursive: true });

  const suffix = `.restore-${process.pid}`;
  const stagedDatabase = `${databaseFile}${suffix}.new`;
  const stagedSettings = `${settingsFile}${suffix}.new`;
  const oldDatabase = `${databaseFile}${suffix}.old`;
  const oldSettings = `${settingsFile}${suffix}.old`;
  const sourceDatabase = new Database(validated.databaseFile, { readonly: true, fileMustExist: true });
  try {
    await sourceDatabase.backup(stagedDatabase);
  } finally { sourceDatabase.close(); }
  await copyFile(validated.settingsFile, stagedSettings);

  let databaseMoved = false;
  let settingsMoved = false;
  try {
    await rename(databaseFile, oldDatabase); databaseMoved = true;
    await rename(settingsFile, oldSettings); settingsMoved = true;
    await rename(stagedDatabase, databaseFile);
    await rename(stagedSettings, settingsFile);
    await rm(oldDatabase, { force: true });
    await rm(oldSettings, { force: true });
    await rm(`${databaseFile}-wal`, { force: true });
    await rm(`${databaseFile}-shm`, { force: true });
    return safetyDirectory;
  } catch (error) {
    await rm(stagedDatabase, { force: true });
    await rm(stagedSettings, { force: true });
    if (databaseMoved) { await rm(databaseFile, { force: true }); await rename(oldDatabase, databaseFile); }
    if (settingsMoved) { await rm(settingsFile, { force: true }); await rename(oldSettings, settingsFile); }
    throw error;
  }
}

async function main() {
  const source = process.argv[2];
  if (!source) throw new Error("Usage: npm run restore -- /path/to/backup-directory");
  const safetyDirectory = await restoreBackup({ source });
  console.log("Restore completed successfully.");
  console.log(`Previous state backup: ${safetyDirectory}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(`Restore failed: ${error.message}`); process.exitCode = 1; });
}
