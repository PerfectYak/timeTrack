import ExcelJS from "exceljs";
import type { Settings, WorkBreak, WorkDay, WorkSession } from "./types";
import { breakDurationSeconds, secondsBetween } from "./time";
import { formatClock } from "./i18n";

function hours(seconds: number) {
  return Math.round((seconds / 3600) * 10000) / 10000;
}

function styleSheet(sheet: ExcelJS.Worksheet, widths: number[]) {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: widths.length } };
  sheet.columns.forEach((column, index) => { column.width = widths[index]; });
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF207A55" } };
  header.alignment = { vertical: "middle" };
  header.height = 22;
  sheet.eachRow((row, index) => {
    if (index > 1 && index % 2 === 1) row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F7F4" } };
    row.alignment = { vertical: "top" };
  });
}

export async function buildExcelWorkbook(args: {
  start: string;
  end: string;
  today: string;
  sessions: WorkSession[];
  breaks: WorkBreak[];
  days: WorkDay[];
  settings: Settings;
}) {
  const { start, end, today, sessions, breaks, days, settings } = args;
  const english = settings.language === "en";
  const exportDate = (value: string) => new Intl.DateTimeFormat(settings.locale, { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
  const time = (value: string | null | undefined) => value ? formatClock(value, settings.locale, true) : "";
  const now = new Date();
  const dates = [...new Set([
    ...sessions.map((session) => session.workDate),
    ...days.filter((day) => day.comment).map((day) => day.date),
  ])].filter((date) => date >= start && date <= end && (date !== today || Boolean(days.find((day) => day.date === date)?.closedAt))).sort();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = english ? "Timeframe" : "Időkeret";
  workbook.created = now;
  const summary = workbook.addWorksheet(english ? "Days" : "Napok");
  summary.addRow(english ? ["Date", "Start", "End", "Hours worked", "Break count", "Total break time (hours)", "Daily comment"] : ["Dátum", "Kezdés", "Befejezés", "Ledolgozott órák", "Szünetek száma", "Szünetek összes ideje (óra)", "Napi komment"]);
  for (const date of dates) {
    const daySessions = sessions.filter((session) => session.workDate === date).sort((a, b) => a.start.localeCompare(b.start));
    const dayBreaks = breaks.filter((pause) => pause.workDate === date);
    const workSeconds = daySessions.reduce((sum, session) => sum + (session.end ? secondsBetween(session.start, session.end) : 0), 0);
    const breakSeconds = dayBreaks.reduce((sum, pause) => sum + breakDurationSeconds(pause, now, settings.timezone), 0);
    summary.addRow([exportDate(date), time(daySessions[0]?.start), time(daySessions.at(-1)?.end), hours(workSeconds), dayBreaks.length, hours(breakSeconds), days.find((day) => day.date === date)?.comment ?? ""]);
  }
  summary.getColumn(4).numFmt = "0.0000";
  summary.getColumn(6).numFmt = "0.0000";
  summary.getColumn(7).alignment = { wrapText: true, vertical: "top" };
  styleSheet(summary, [14, 12, 12, 19, 18, 29, 42]);

  const details = workbook.addWorksheet(english ? "Details" : "Részletek");
  details.addRow(english ? ["Date", "Type", "Start", "End", "Elapsed time (hours)", "Comment"] : ["Dátum", "Típus", "Kezdet", "Vég", "Eltelt idő (óra)", "Komment"]);
  for (const date of dates) {
    const records = [
      ...sessions.filter((session) => session.workDate === date).map((session) => ({ type: english ? "Work" : "Munka", start: session.start, end: session.end, comment: "" })),
      ...breaks.filter((pause) => pause.workDate === date).map((pause) => ({ type: english ? "Break" : "Szünet", start: pause.start, end: pause.end, comment: pause.comment ?? "" })),
    ].sort((a, b) => a.start.localeCompare(b.start));
    for (const record of records) {
      const elapsed = record.end ? secondsBetween(record.start, record.end) : 0;
      details.addRow([exportDate(date), record.type, time(record.start), time(record.end), hours(elapsed), record.comment]);
    }
  }
  details.getColumn(5).numFmt = "0.0000";
  details.getColumn(6).alignment = { wrapText: true, vertical: "top" };
  styleSheet(details, [14, 12, 12, 12, 20, 45]);
  return workbook.xlsx.writeBuffer();
}
