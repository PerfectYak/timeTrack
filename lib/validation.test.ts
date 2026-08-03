import { describe, expect, it } from "vitest";
import { comment, date, id, object, sessionInput, settingsInput, ValidationError } from "./validation";

describe("API validation", () => {
  it("accepts canonical calendar dates and rejects impossible dates", () => {
    expect(date("2028-02-29")).toBe("2028-02-29");
    expect(() => date("2026-02-29")).toThrow("Érvénytelen dátum");
    expect(() => date("2026-2-01")).toThrow("Érvénytelen dátum");
  });

  it("rejects unknown fields and invalid identifiers", () => {
    expect(() => object({ date: "2026-08-03", surprise: true }, ["date"])).toThrow("ismeretlen mezőt");
    expect(id("legacy_ID-12")).toBe("legacy_ID-12");
    expect(() => id("not allowed")).toThrow("Érvénytelen azonosító");
  });

  it("normalizes and limits comments", () => {
    expect(comment("  note  ")).toBe("note");
    expect(comment("   ")).toBeNull();
    expect(() => comment("x".repeat(2001))).toThrow("2000 karakter");
  });

  it("validates complete sessions", () => {
    expect(sessionInput({ id: "one", workDate: "2026-08-03", start: "2026-08-03T08:00:00", end: null })).toEqual({ id: "one", workDate: "2026-08-03", start: "2026-08-03T08:00:00", end: null });
    expect(() => sessionInput({ workDate: "2026-08-03", start: "2026-08-04T08:00:00", end: null })).toThrow("nem nyúlhat át");
  });

  it("validates IANA time zones and normalizes working days", () => {
    const base = { version: 1, language: "hu", locale: "hu-HU", timezone: "Europe/Budapest", weekStartsOn: 1, workingDays: [5, 1, 1], dailyTargetMinutes: 480, lunchBreakMinutes: 30 };
    expect(settingsInput(base).workingDays).toEqual([1, 5]);
    expect(() => settingsInput({ ...base, timezone: "Not/AZone" })).toThrow("Érvénytelen időzóna");
  });

  it("uses a dedicated validation error type", () => {
    expect(() => date("bad")).toThrow(ValidationError);
  });
});
