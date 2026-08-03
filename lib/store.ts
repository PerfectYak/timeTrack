import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import type { Settings, WorkBreak, WorkDay, WorkSession } from "./types";
import { localDate, localIsoNow, toLocalIso } from "./time";
import { settingsInput } from "./validation";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const DATABASE_FILE = path.join(DATA_DIR, "worktime.db");
const SETTINGS_FILE = path.join(ROOT, "config", "settings.json");
let database: Database.Database | null = null;
let initialization: Promise<Database.Database> | null = null;
let settingsWriteQueue = Promise.resolve();

async function atomicJson(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, file);
}

export async function getSettings() {
  const parsed = JSON.parse(await readFile(SETTINGS_FILE, "utf8")) as Partial<Settings>;
  const value: unknown = { ...parsed, language: parsed.language ?? "en", locale: parsed.locale ?? "en-US" };
  try { return settingsInput(value); }
  catch { throw new Error("A beállításfájl formátuma hibás."); }
}

export async function saveSettings(input: unknown) {
  const settings = settingsInput(input);
  const operation = settingsWriteQueue.then(() => atomicJson(SETTINGS_FILE, settings));
  settingsWriteQueue = operation.then(() => undefined, () => undefined);
  await operation;
  return settings;
}

function hasColumn(db: Database.Database, table: string, column: string) {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).some((item) => item.name === column);
}

type SessionRow = { id: string; work_date: string; start: string; end: string | null; end_comment?: string | null };
type BreakRow = { id: string; work_date: string; after_session_id: string; start: string; end: string | null; comment: string | null; is_lunch: number };
type DayRow = { work_date: string; closed_at: string | null; comment: string | null };

function hydrateSessions(rows: SessionRow[]): WorkSession[] {
  return rows.map((row) => ({ id: row.id, workDate: row.work_date, start: row.start, end: row.end }));
}

function hydrateBreaks(rows: BreakRow[]): WorkBreak[] {
  return rows.map((row) => ({ id: row.id, workDate: row.work_date, afterSessionId: row.after_session_id, start: row.start, end: row.end, comment: row.comment, isLunch: Boolean(row.is_lunch) }));
}

function defaultLunch(start: string) {
  const time = start.slice(11, 16);
  return time >= "11:30" && time < "12:30" ? 1 : 0;
}

function syncBreaksForDay(db: Database.Database, date: string) {
  const sessions = db.prepare("SELECT id, work_date, start, end FROM sessions WHERE work_date = ? ORDER BY start").all(date) as SessionRow[];
  const closed = Boolean((db.prepare("SELECT closed_at FROM work_days WHERE work_date = ?").get(date) as { closed_at: string | null } | undefined)?.closed_at);
  const existing = new Map((db.prepare("SELECT id, work_date, after_session_id, start, end, comment, is_lunch FROM work_breaks WHERE work_date = ?").all(date) as BreakRow[]).map((pause) => [pause.after_session_id, pause]));
  const valid = new Set<string>();
  for (let index = 0; index < sessions.length; index++) {
    const session = sessions[index];
    if (!session.end) continue;
    const next = sessions[index + 1];
    if (!next && closed) continue;
    valid.add(session.id);
    const prior = existing.get(session.id);
    if (prior) db.prepare("UPDATE work_breaks SET start = ?, end = ? WHERE id = ?").run(session.end, next?.start ?? null, prior.id);
    else db.prepare("INSERT INTO work_breaks (id, work_date, after_session_id, start, end, comment, is_lunch) VALUES (?, ?, ?, ?, ?, NULL, ?)").run(randomUUID(), date, session.id, session.end, next?.start ?? null, defaultLunch(session.end));
  }
  for (const pause of existing.values()) if (!valid.has(pause.after_session_id)) db.prepare("DELETE FROM work_breaks WHERE id = ?").run(pause.id);
}

function createSchema(db: Database.Database) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, work_date TEXT NOT NULL CHECK(length(work_date) = 10), start TEXT NOT NULL, end TEXT);
    CREATE TABLE IF NOT EXISTS migrations (source_file TEXT PRIMARY KEY, imported_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS work_days (work_date TEXT PRIMARY KEY CHECK(length(work_date) = 10), closed_at TEXT, comment TEXT);
    CREATE TABLE IF NOT EXISTS work_breaks (
      id TEXT PRIMARY KEY,
      work_date TEXT NOT NULL CHECK(length(work_date) = 10),
      after_session_id TEXT NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
      start TEXT NOT NULL,
      end TEXT,
      comment TEXT,
      is_lunch INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS sessions_work_date_idx ON sessions(work_date, start);
    CREATE INDEX IF NOT EXISTS work_breaks_date_idx ON work_breaks(work_date, start);
  `);
  if (!hasColumn(db, "work_days", "comment")) db.exec("ALTER TABLE work_days ADD COLUMN comment TEXT");
  if (!hasColumn(db, "work_breaks", "is_lunch")) db.exec("ALTER TABLE work_breaks ADD COLUMN is_lunch INTEGER NOT NULL DEFAULT 0");
  if (!db.prepare("SELECT 1 FROM schema_migrations WHERE version = ?").get("session-break-model-v2")) db.transaction(() => {
    const commentsAvailable = hasColumn(db, "sessions", "end_comment");
    const days = db.prepare("SELECT DISTINCT work_date FROM sessions").all() as { work_date: string }[];
    for (const { work_date } of days) {
      const select = commentsAvailable ? "SELECT id, work_date, start, end, end_comment FROM sessions WHERE work_date = ? ORDER BY start" : "SELECT id, work_date, start, end FROM sessions WHERE work_date = ? ORDER BY start";
      const sessions = db.prepare(select).all(work_date) as SessionRow[];
      const isClosed = Boolean((db.prepare("SELECT closed_at FROM work_days WHERE work_date = ?").get(work_date) as { closed_at: string | null } | undefined)?.closed_at);
      sessions.forEach((session, index) => {
        const next = sessions[index + 1];
        if (!session.end || (!next && isClosed)) return;
        db.prepare("INSERT OR IGNORE INTO work_breaks (id, work_date, after_session_id, start, end, comment) VALUES (?, ?, ?, ?, ?, ?)")
          .run(randomUUID(), work_date, session.id, session.end, next?.start ?? null, session.end_comment ?? null);
      });
    }
    if (commentsAvailable) db.exec("ALTER TABLE sessions DROP COLUMN end_comment");
    db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run("session-break-model-v2", new Date().toISOString());
  })();
  if (!db.prepare("SELECT 1 FROM schema_migrations WHERE version = ?").get("planning-comments-v3")) db.transaction(() => {
    db.prepare("UPDATE work_breaks SET is_lunch = 1 WHERE substr(start, 12, 5) >= '11:30' AND substr(start, 12, 5) < '12:30'").run();
    db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run("planning-comments-v3", new Date().toISOString());
  })();
}

function insertSession(db: Database.Database, session: WorkSession) {
  db.prepare(`INSERT INTO sessions (id, work_date, start, end) VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET work_date=excluded.work_date, start=excluded.start, end=excluded.end`)
    .run(session.id, session.workDate, session.start, session.end);
}

async function migrateJsonFiles(db: Database.Database) {
  const names = (await readdir(DATA_DIR)).filter((name) => /^\d{4}-\d{2}\.json$/.test(name));
  for (const name of names) {
    if (db.prepare("SELECT 1 FROM migrations WHERE source_file = ?").get(name)) continue;
    const source = path.join(DATA_DIR, name);
    const parsed = JSON.parse(await readFile(source, "utf8")) as { version?: number; sessions?: WorkSession[] };
    if (parsed.version !== 1 || !Array.isArray(parsed.sessions)) throw new Error(`Nem importálható adatfájl: ${name}`);
    db.transaction(() => {
      for (const session of parsed.sessions ?? []) {
        insertSession(db, session);
        db.prepare("INSERT OR IGNORE INTO work_days (work_date, closed_at) VALUES (?, NULL)").run(session.workDate);
      }
      for (const date of new Set((parsed.sessions ?? []).map((session) => session.workDate))) syncBreaksForDay(db, date);
      db.prepare("INSERT INTO migrations (source_file, imported_at) VALUES (?, ?)").run(name, new Date().toISOString());
    })();
    await rename(source, `${source}.migrated.bak`);
  }
}

async function getDatabase() {
  if (database) return database;
  if (!initialization) initialization = (async () => {
    await mkdir(DATA_DIR, { recursive: true });
    const db = new Database(DATABASE_FILE);
    createSchema(db);
    await migrateJsonFiles(db);
    database = db;
    return db;
  })();
  return initialization;
}

/** Closes the process-local store. Primarily useful for isolated integration tests and graceful shutdowns. */
export function closeStore() {
  database?.close();
  database = null;
  initialization = null;
}

export async function readRange(start: string, end: string) {
  const db = await getDatabase();
  return hydrateSessions(db.prepare("SELECT id, work_date, start, end FROM sessions WHERE work_date BETWEEN ? AND ? ORDER BY start").all(start, end) as SessionRow[]);
}

export async function readBreaks(start: string, end: string) {
  const db = await getDatabase();
  return hydrateBreaks(db.prepare("SELECT id, work_date, after_session_id, start, end, comment, is_lunch FROM work_breaks WHERE work_date BETWEEN ? AND ? ORDER BY start").all(start, end) as BreakRow[]);
}

export async function readWorkDay(date: string): Promise<WorkDay> {
  const db = await getDatabase();
  const row = db.prepare("SELECT work_date, closed_at, comment FROM work_days WHERE work_date = ?").get(date) as DayRow | undefined;
  return { date, closedAt: row?.closed_at ?? null, comment: row?.comment ?? null, exists: Boolean(row) };
}

export async function readWorkDays(start: string, end: string): Promise<WorkDay[]> {
  const db = await getDatabase();
  return (db.prepare("SELECT work_date, closed_at, comment FROM work_days WHERE work_date BETWEEN ? AND ?").all(start, end) as DayRow[]).map((row) => ({ date: row.work_date, closedAt: row.closed_at, comment: row.comment, exists: true }));
}

function validateSession(session: WorkSession, all: WorkSession[]) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(session.workDate) || !session.id || !session.start) throw new Error("Hiányos munkamenet.");
  if (session.start.slice(0, 10) !== session.workDate || (session.end && session.end.slice(0, 10) !== session.workDate)) throw new Error("A munkamenet nem nyúlhat át másik napra.");
  if (session.end && session.end <= session.start) throw new Error("A befejezésnek a kezdés után kell lennie.");
  if (all.filter((item) => item.id !== session.id).some((item) => session.start < (item.end ?? "9999-12-31T23:59:59") && (session.end ?? "9999-12-31T23:59:59") > item.start)) throw new Error("A munkamenet átfed egy másik munkamenettel.");
}

export async function upsertSession(input: WorkSession, now = new Date()) {
  const db = await getDatabase();
  const settings = await getSettings();
  const today = localDate(now, settings.timezone);
  if (input.workDate === today && (input.start > localIsoNow(now, settings.timezone) || Boolean(input.end && input.end > localIsoNow(now, settings.timezone)))) throw new Error("A kezdési és befejezési idő nem lehet a jövőben.");
  if ((await readWorkDay(input.workDate)).closedAt) throw new Error("A lezárt nap módosítás előtt újranyitandó.");
  validateSession(input, await readRange(input.workDate, input.workDate));
  db.transaction(() => {
    db.prepare("INSERT OR IGNORE INTO work_days (work_date, closed_at) VALUES (?, NULL)").run(input.workDate);
    insertSession(db, input);
    syncBreaksForDay(db, input.workDate);
  })();
  return input;
}

export async function startBreak(date: string, stamp: string, comment: string) {
  if (!comment.trim()) throw new Error("A szünet indoklása kötelező.");
  const db = await getDatabase();
  const active = (await readRange(date, date)).find((session) => !session.end);
  if (!active) throw new Error("Nincs aktív munkamenet.");
  db.transaction(() => {
    db.prepare("UPDATE sessions SET end = ? WHERE id = ?").run(stamp, active.id);
    syncBreaksForDay(db, date);
    db.prepare("UPDATE work_breaks SET comment = ? WHERE after_session_id = ?").run(comment.trim(), active.id);
  })();
}

export async function updateBreak(date: string, id: string, changes: { comment?: string | null; isLunch?: boolean }) {
  const db = await getDatabase();
  const pause = db.prepare("SELECT id FROM work_breaks WHERE id = ? AND work_date = ?").get(id, date);
  if (!pause) throw new Error("A szünet nem található.");
  if (changes.comment !== undefined) db.prepare("UPDATE work_breaks SET comment = ? WHERE id = ?").run(changes.comment?.trim() || null, id);
  if (changes.isLunch !== undefined) db.prepare("UPDATE work_breaks SET is_lunch = ? WHERE id = ?").run(changes.isLunch ? 1 : 0, id);
}

export async function saveDayComment(date: string, comment: string | null) {
  const db = await getDatabase();
  db.prepare("INSERT INTO work_days (work_date, closed_at, comment) VALUES (?, NULL, ?) ON CONFLICT(work_date) DO UPDATE SET comment=excluded.comment")
    .run(date, comment?.trim() || null);
}

export async function deleteSession(date: string, id: string) {
  const db = await getDatabase();
  if ((await readWorkDay(date)).closedAt) throw new Error("A lezárt nap módosítás előtt újranyitandó.");
  const sessions = await readRange(date, date);
  const index = sessions.findIndex((session) => session.id === id);
  if (index < 0) throw new Error("A munkamenet nem található.");
  const previous = sessions[index - 1];
  const beforeComment = previous ? (db.prepare("SELECT comment FROM work_breaks WHERE after_session_id = ?").get(previous.id) as { comment: string | null } | undefined)?.comment : null;
  const afterComment = (db.prepare("SELECT comment FROM work_breaks WHERE after_session_id = ?").get(id) as { comment: string | null } | undefined)?.comment;
  db.transaction(() => {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(id);
    syncBreaksForDay(db, date);
    if (previous && afterComment) {
      const merged = [beforeComment, afterComment].filter(Boolean).join("\n");
      db.prepare("UPDATE work_breaks SET comment = ? WHERE after_session_id = ?").run(merged, previous.id);
    }
  })();
}

export async function closeWorkDay(date: string, stamp: string) {
  const db = await getDatabase();
  const sessions = await readRange(date, date);
  if (!sessions.length) throw new Error("Üres nap nem zárható le.");
  if ((await readWorkDay(date)).closedAt) throw new Error("A nap már le van zárva.");
  const active = sessions.find((session) => !session.end);
  const closedAt = active ? stamp : sessions.at(-1)?.end;
  if (!closedAt) throw new Error("A nap lezárási időpontja nem állapítható meg.");
  db.transaction(() => {
    if (active) db.prepare("UPDATE sessions SET end = ? WHERE id = ?").run(closedAt, active.id);
    db.prepare("INSERT INTO work_days (work_date, closed_at) VALUES (?, ?) ON CONFLICT(work_date) DO UPDATE SET closed_at=excluded.closed_at").run(date, closedAt);
    syncBreaksForDay(db, date);
  })();
  return closedAt;
}

export async function reopenWorkDay(date: string, comment?: string) {
  const db = await getDatabase();
  if (!(await readWorkDay(date)).closedAt) throw new Error("A nap nincs lezárva.");
  const last = (await readRange(date, date)).at(-1);
  if (!last?.end) throw new Error("A naphoz nem tartozik lezárt munkamenet.");
  db.transaction(() => {
    db.prepare("UPDATE work_days SET closed_at = NULL WHERE work_date = ?").run(date);
    syncBreaksForDay(db, date);
    db.prepare("UPDATE work_breaks SET comment = ? WHERE after_session_id = ?").run(comment?.trim() || null, last.id);
  })();
}

export async function reconcileOvernight(settings: Settings) {
  const db = await getDatabase();
  const today = localDate(new Date(), settings.timezone);
  const dates = db.prepare("SELECT work_date FROM work_days WHERE closed_at IS NULL AND work_date < ?").all(today) as { work_date: string }[];
  let changed = false;
  for (const { work_date } of dates) {
    const sessions = await readRange(work_date, work_date);
    if (!sessions.length) continue;
    const active = sessions.find((session) => !session.end);
    const closedAt = active ? toLocalIso(work_date, "23:59:59") : sessions.at(-1)?.end;
    if (!closedAt) continue;
    db.transaction(() => {
      if (active) db.prepare("UPDATE sessions SET end = ? WHERE id = ?").run(closedAt, active.id);
      db.prepare("UPDATE work_days SET closed_at = ? WHERE work_date = ?").run(closedAt, work_date);
      syncBreaksForDay(db, work_date);
    })();
    changed = true;
  }
  return changed;
}

export { randomUUID };
