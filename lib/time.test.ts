import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { buildReport, periodBounds } from "./report";
import { buildExcelWorkbook } from "./excel";
import { calculatePlannedEnd, formatDuration, summarizeDay } from "./time";
import { formatClock, formatDate, messages, translator } from "./i18n";
import type { Settings, WorkBreak, WorkSession } from "./types";

const settings: Settings = {
  version: 1,
  language: "hu",
  locale: "hu-HU",
  timezone: "Europe/Budapest",
  weekStartsOn: 1,
  workingDays: [1, 2, 3, 4, 5],
  dailyTargetMinutes: 480,
  lunchBreakMinutes: 30,
};

const session: WorkSession = {
  id: "one",
  workDate: "2026-07-31",
  start: "2026-07-31T08:00:00",
  end: "2026-07-31T17:00:00",
};

describe("munkaidő-számítás", () => {
  it("a teljes munkamenetet munkaidőként számolja", () => {
    const day = summarizeDay("2026-07-31", [session], settings);
    expect(day.workSeconds).toBe(9 * 3600);
    expect(day.balanceSeconds).toBe(60 * 60);
  });

  it("hétvégén nem számol elvárt időt", () => {
    expect(summarizeDay("2026-08-01", [], settings).targetSeconds).toBe(0);
  });

  it("előjeles és 24 órán túli időtartamot formáz", () => {
    expect(formatDuration(-90, true)).toBe("−00:01:30");
    expect(formatDuration(90061)).toBe("25:01:01");
  });

  it("az ebédkerettel, majd a tényleges szünetekkel számolja a tervezett befejezést", () => {
    expect(calculatePlannedEnd("2026-07-31", [session], [], settings)).toBe("2026-07-31T16:30:00");
    const pauses: WorkBreak[] = [
      { id: "lunch", workDate: "2026-07-31", afterSessionId: "one", start: "2026-07-31T12:00:00", end: "2026-07-31T12:45:00", comment: "Ebéd", isLunch: true },
      { id: "other", workDate: "2026-07-31", afterSessionId: "two", start: "2026-07-31T15:00:00", end: "2026-07-31T15:10:00", comment: "Telefon", isLunch: false },
    ];
    expect(calculatePlannedEnd("2026-07-31", [session], pauses, settings)).toBe("2026-07-31T16:55:00");
  });
});

describe("riportok", () => {
  it("hétfőtől vasárnapig képez heti időszakot", () => {
    expect(periodBounds("week", "2026-07-31")).toEqual({ start: "2026-07-27", end: "2026-08-02" });
  });

  it("helyesen kezeli a szökőévi hónapot", () => {
    expect(periodBounds("month", "2028-02-10")).toEqual({ start: "2028-02-01", end: "2028-02-29" });
  });

  it("összegzi a napi sorokat", () => {
    const report = buildReport("week", "2026-07-27", "2026-08-02", [session], settings);
    expect(report.days).toHaveLength(7);
    expect(report.totals.workSeconds).toBe(9 * 3600);
    expect(report.totals.targetSeconds).toBe(5 * 8 * 3600);
  });

  it("két munkalapos Excelt készít és kihagyja az aktuális napot", async () => {
    const buffer = await buildExcelWorkbook({
      start: "2026-07-01", end: "2026-08-01", today: "2026-08-01", sessions: [session], breaks: [],
      days: [{ date: "2026-07-31", closedAt: session.end, comment: "Napi jegyzet", exists: true }], settings,
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["Napok", "Részletek"]);
    expect(workbook.getWorksheet("Napok")?.getRow(2).getCell(7).value).toBe("Napi jegyzet");
    expect(workbook.getWorksheet("Napok")?.getRow(2).getCell(4).value).toBe(9);
    expect(workbook.getWorksheet("Részletek")?.getRow(2).getCell(2).value).toBe("Munka");
  });

  it("a lezárt aktuális napot felveszi az Excel-exportba", async () => {
    const buffer = await buildExcelWorkbook({
      start: "2026-07-31", end: "2026-07-31", today: "2026-07-31", sessions: [session], breaks: [],
      days: [{ date: "2026-07-31", closedAt: session.end, comment: null, exists: true }], settings,
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    expect(workbook.getWorksheet("Napok")?.rowCount).toBe(2);
    expect(workbook.getWorksheet("Részletek")?.rowCount).toBe(2);
  });

  it("angol nyelven lokalizálja az Excel munkalapjait és mezőit", async () => {
    const buffer = await buildExcelWorkbook({
      start: "2026-07-01", end: "2026-08-01", today: "2026-08-01", sessions: [session], breaks: [],
      days: [{ date: "2026-07-31", closedAt: session.end, comment: "Keep this note", exists: true }],
      settings: { ...settings, language: "en", locale: "en-US" },
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["Days", "Details"]);
    expect(workbook.getWorksheet("Days")?.getRow(1).getCell(1).value).toBe("Date");
    expect(workbook.getWorksheet("Details")?.getRow(2).getCell(2).value).toBe("Work");
    expect(workbook.getWorksheet("Days")?.getRow(2).getCell(7).value).toBe("Keep this note");
  });
});

describe("lokalizáció", () => {
  it("azonos fordítási kulcsokat tartalmaz mindkét nyelven", () => {
    expect(Object.keys(messages.en)).toEqual(Object.keys(messages.hu));
    expect(translator("en")("settings")).toBe("Settings");
  });

  it("a választott locale szerint formáz, a böngészőtől függetlenül", () => {
    expect(formatClock("2026-07-31T17:05:00", "hu-HU")).toBe("17:05");
    expect(formatClock("2026-07-31T17:05:00", "en-US")).toBe("5:05 PM");
    expect(formatDate("2026-07-31", "en-US")).toContain("Friday");
  });
});
