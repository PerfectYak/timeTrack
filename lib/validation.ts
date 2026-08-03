import type { Settings, WorkSession } from "./types";
import { isValidDate, isValidLocalIso } from "./time";

export class ValidationError extends Error {}

export const MAX_COMMENT_LENGTH = 2000;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export function object(input: unknown, allowed: readonly string[]) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new ValidationError("A kérés formátuma hibás.");
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw new ValidationError("A kérés ismeretlen mezőt tartalmaz.");
  return value;
}

export function date(value: unknown, required = true) {
  if ((value === undefined || value === null || value === "") && !required) return undefined;
  if (typeof value !== "string" || !isValidDate(value)) throw new ValidationError("Érvénytelen dátum.");
  return value;
}

export function localIso(value: unknown, required = true) {
  if ((value === undefined || value === null || value === "") && !required) return null;
  if (typeof value !== "string" || !isValidLocalIso(value)) throw new ValidationError("Érvénytelen időpont.");
  return value;
}

export function id(value: unknown, required = true) {
  if ((value === undefined || value === null || value === "") && !required) return undefined;
  if (typeof value !== "string" || !ID_PATTERN.test(value)) throw new ValidationError("Érvénytelen azonosító.");
  return value;
}

export function comment(value: unknown, required = false) {
  if (value === undefined && !required) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") throw new ValidationError("A megjegyzés formátuma hibás.");
  const normalized = value.trim();
  if (required && !normalized) throw new ValidationError("A szünet indoklása kötelező.");
  if (normalized.length > MAX_COMMENT_LENGTH) throw new ValidationError(`A megjegyzés legfeljebb ${MAX_COMMENT_LENGTH} karakter lehet.`);
  return normalized || null;
}

export function boolean(value: unknown) {
  if (typeof value !== "boolean") throw new ValidationError("Érvénytelen logikai érték.");
  return value;
}

export function identifierQuery(value: string | null) { return id(value); }
export function dateQuery(value: string | null, required = true) { return date(value, required); }

export function sessionInput(input: unknown): WorkSession {
  const body = object(input, ["id", "workDate", "start", "end"]);
  const workDate = date(body.workDate)!;
  const start = localIso(body.start)!;
  const end = localIso(body.end, false);
  const sessionId = id(body.id, false) ?? "";
  if (start.slice(0, 10) !== workDate || (end && end.slice(0, 10) !== workDate)) throw new ValidationError("A munkamenet nem nyúlhat át másik napra.");
  return { id: sessionId, workDate, start, end };
}

export function settingsInput(input: unknown): Settings {
  const body = object(input, ["version", "language", "locale", "timezone", "weekStartsOn", "workingDays", "dailyTargetMinutes", "lunchBreakMinutes"]);
  if (body.version !== 1 || !["hu", "en"].includes(body.language as string) || !["hu-HU", "en-US"].includes(body.locale as string) || body.weekStartsOn !== 1) throw new ValidationError("A beállításfájl formátuma hibás.");
  if (typeof body.timezone !== "string" || body.timezone.length > 100) throw new ValidationError("A beállításfájl formátuma hibás.");
  try { new Intl.DateTimeFormat("en", { timeZone: body.timezone }).format(); } catch { throw new ValidationError("Érvénytelen időzóna."); }
  if (!Array.isArray(body.workingDays) || body.workingDays.some((day) => !Number.isInteger(day) || (day as number) < 0 || (day as number) > 6)) throw new ValidationError("A beállításfájl formátuma hibás.");
  if (!Number.isInteger(body.dailyTargetMinutes) || (body.dailyTargetMinutes as number) < 0 || (body.dailyTargetMinutes as number) > 1440 || !Number.isInteger(body.lunchBreakMinutes) || (body.lunchBreakMinutes as number) < 0 || (body.lunchBreakMinutes as number) > 240) throw new ValidationError("A beállításfájl formátuma hibás.");
  return { version: 1, language: body.language as Settings["language"], locale: body.locale as Settings["locale"], timezone: body.timezone, weekStartsOn: 1, workingDays: [...new Set(body.workingDays as number[])].sort(), dailyTargetMinutes: body.dailyTargetMinutes as number, lunchBreakMinutes: body.lunchBreakMinutes as number };
}

export async function jsonBody(request: Request) {
  const text = await request.text();
  if (text.length > 16_384) throw new ValidationError("A kérés túl nagy.");
  try { return JSON.parse(text) as unknown; } catch { throw new ValidationError("A kérés nem érvényes JSON."); }
}
