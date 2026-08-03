import type { DaySummary, Settings, WorkBreak, WorkDay, WorkSession } from "./types";

export function localDate(date = new Date(), timeZone = "Europe/Budapest") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function localTime(date = new Date(), timeZone = "Europe/Budapest") {
  return new Intl.DateTimeFormat("hu-HU", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function toLocalIso(date: string, time: string) {
  return `${date}T${time.length === 5 ? `${time}:00` : time}`;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;

export function isValidDate(value: string) {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3]);
}

export function isValidLocalIso(value: string) {
  const match = ISO_PATTERN.exec(value);
  return Boolean(match && isValidDate(value.slice(0, 10)) && Number(match[4]) < 24 && Number(match[5]) < 60 && Number(match[6]) < 60);
}

function wallTimeValue(value: string) {
  const match = ISO_PATTERN.exec(value);
  if (!match || !isValidLocalIso(value)) return NaN;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6]));
}

function fromWallTime(value: number) {
  const date = new Date(value);
  const part = (item: number) => String(item).padStart(2, "0");
  return `${date.getUTCFullYear()}-${part(date.getUTCMonth() + 1)}-${part(date.getUTCDate())}T${part(date.getUTCHours())}:${part(date.getUTCMinutes())}:${part(date.getUTCSeconds())}`;
}

export function localIsoNow(now = new Date(), timeZone = "Europe/Budapest") {
  return toLocalIso(localDate(now, timeZone), localTime(now, timeZone));
}

export function secondsBetween(start: string, end: string) {
  return Math.max(0, Math.floor((wallTimeValue(end) - wallTimeValue(start)) / 1000));
}

export function summarizeDay(
  date: string,
  sessions: WorkSession[],
  settings: Settings,
  day?: WorkDay | null,
  now = new Date(),
  breaks: WorkBreak[] = [],
): DaySummary {
  let workSeconds = 0;
  for (const session of sessions.filter((s) => s.workDate === date)) {
    const sessionEnd = session.end ?? localIsoNow(now, settings.timezone);
    workSeconds += secondsBetween(session.start, sessionEnd);
  }
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const targetSeconds = settings.workingDays.includes(weekday)
    ? settings.dailyTargetMinutes * 60
    : 0;
  return {
    date,
    workSeconds,
    targetSeconds,
    balanceSeconds: workSeconds - targetSeconds,
    sessions: sessions.filter((s) => s.workDate === date).length,
    status: day?.closedAt ? "closed" : day?.exists || sessions.some((session) => session.workDate === date) ? "open" : "empty",
    plannedEnd: calculatePlannedEnd(date, sessions, breaks, settings, now),
  };
}

export function breakDurationSeconds(pause: WorkBreak, now = new Date(), timeZone = "Europe/Budapest") {
  return secondsBetween(pause.start, pause.end ?? localIsoNow(now, timeZone));
}

export function calculatePlannedEnd(date: string, sessions: WorkSession[], breaks: WorkBreak[], settings: Settings, now = new Date()) {
  const first = sessions.filter((session) => session.workDate === date).sort((a, b) => a.start.localeCompare(b.start))[0];
  if (!first) return null;
  const dayBreaks = breaks.filter((pause) => pause.workDate === date);
  const lunchBreaks = dayBreaks.filter((pause) => pause.isLunch);
  const otherSeconds = dayBreaks.filter((pause) => !pause.isLunch).reduce((sum, pause) => sum + breakDurationSeconds(pause, now, settings.timezone), 0);
  const measuredLunch = lunchBreaks.reduce((sum, pause) => sum + breakDurationSeconds(pause, now, settings.timezone), 0);
  const lunchSeconds = lunchBreaks.length === 0
    ? settings.lunchBreakMinutes * 60
    : lunchBreaks.some((pause) => !pause.end)
      ? Math.max(settings.lunchBreakMinutes * 60, measuredLunch)
      : measuredLunch;
  return fromWallTime(wallTimeValue(first.start) + settings.dailyTargetMinutes * 60000 + (otherSeconds + lunchSeconds) * 1000);
}

export function formatDuration(totalSeconds: number, signed = false) {
  const sign = totalSeconds < 0 ? "−" : signed && totalSeconds > 0 ? "+" : "";
  const value = Math.abs(Math.round(totalSeconds));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;
  return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function dateRange(start: string, end: string) {
  const dates: string[] = [];
  const cursor = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end}T12:00:00Z`);
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function moveDate(date: string, amount: number, unit: "day" | "month") {
  const value = new Date(`${date}T12:00:00Z`);
  if (unit === "day") value.setUTCDate(value.getUTCDate() + amount);
  else value.setUTCMonth(value.getUTCMonth() + amount);
  return value.toISOString().slice(0, 10);
}
