import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as sessionPost, DELETE as sessionDelete } from "./sessions/route";
import { PUT as breakPut } from "./breaks/route";
import { PUT as commentPut } from "./day-comment/route";
import { POST as actionPost } from "./action/route";
import { PUT as settingsPut } from "./settings/route";
import { GET as reportGet } from "./report/route";
import { GET as stateGet } from "./state/route";

function request(path: string, method: string, body?: string) {
  return new NextRequest(`http://localhost${path}`, { method, body, headers: body === undefined ? undefined : { "content-type": "application/json" } });
}

async function expectBadRequest(response: Response) {
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: expect.any(String) });
}

describe("API request validation", () => {
  it("rejects malformed JSON", async () => {
    await expectBadRequest(await sessionPost(request("/api/sessions", "POST", "{")));
  });

  it("rejects impossible dates and invalid identifiers", async () => {
    await expectBadRequest(await commentPut(request("/api/day-comment", "PUT", JSON.stringify({ date: "2026-02-30", comment: "x" }))));
    await expectBadRequest(await sessionDelete(request("/api/sessions?date=2026-08-03&id=bad%20id", "DELETE")));
  });

  it("rejects empty break updates and unknown actions", async () => {
    await expectBadRequest(await breakPut(request("/api/breaks", "PUT", JSON.stringify({ id: "one", date: "2026-08-03" }))));
    await expectBadRequest(await actionPost(request("/api/action", "POST", JSON.stringify({ action: "warp" }))));
  });

  it("rejects oversized comments and invalid settings", async () => {
    await expectBadRequest(await commentPut(request("/api/day-comment", "PUT", JSON.stringify({ date: "2026-08-03", comment: "x".repeat(2001) }))));
    await expectBadRequest(await settingsPut(request("/api/settings", "PUT", JSON.stringify({ version: 1 }))));
  });

  it("rejects invalid state and report query parameters before reading data", async () => {
    await expectBadRequest(await stateGet(request("/api/state?date=2026-02-30", "GET")));
    await expectBadRequest(await reportGet(request("/api/report?kind=year", "GET")));
    await expectBadRequest(await reportGet(request("/api/report?kind=week&anchor=bad", "GET")));
    await expectBadRequest(await reportGet(request("/api/report?format=csv", "GET")));
  });
});
