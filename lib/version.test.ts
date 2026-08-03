import { describe, expect, it } from "vitest";
import packageInfo from "../package.json";
import { APP_VERSION, APP_VERSION_LABEL } from "./version";

describe("application version", () => {
  it("uses the package version as its single source of truth", () => {
    expect(APP_VERSION).toBe(packageInfo.version);
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
    expect(APP_VERSION_LABEL).toBe(`v${packageInfo.version}`);
  });
});
