import type { Report, Settings, WorkBreak, WorkDay, WorkSession } from "./types";
import { dateRange, summarizeDay } from "./time";

export function periodBounds(kind: "week" | "month", anchor: string) {
  const date = new Date(`${anchor}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new Error("Érvénytelen dátum.");
  if (kind === "week") {
    const offset = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - offset);
    const start = date.toISOString().slice(0, 10);
    date.setUTCDate(date.getUTCDate() + 6);
    return { start, end: date.toISOString().slice(0, 10) };
  }
  const start = `${anchor.slice(0, 7)}-01`;
  const endDate = new Date(`${start}T12:00:00Z`);
  endDate.setUTCMonth(endDate.getUTCMonth() + 1);
  endDate.setUTCDate(0);
  return { start, end: endDate.toISOString().slice(0, 10) };
}

export function buildReport(kind: "week" | "month", start: string, end: string, sessions: WorkSession[], settings: Settings, workDays: WorkDay[] = [], breaks: WorkBreak[] = [], now = new Date()): Report {
  const days = dateRange(start, end).map((date) => summarizeDay(date, sessions, settings, workDays.find((day) => day.date === date), now, breaks));
  const totals = days.reduce((sum, day) => ({
    workSeconds: sum.workSeconds + day.workSeconds,
    targetSeconds: sum.targetSeconds + day.targetSeconds,
    balanceSeconds: sum.balanceSeconds + day.balanceSeconds,
    sessions: sum.sessions + day.sessions,
  }), { workSeconds: 0, targetSeconds: 0, balanceSeconds: 0, sessions: 0 });
  return { kind, start, end, days, totals };
}
