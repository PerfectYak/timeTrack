import { NextRequest, NextResponse } from "next/server";
import { closeWorkDay, getSettings, randomUUID, readRange, readWorkDay, reconcileOvernight, reopenWorkDay, startBreak, upsertSession } from "@/lib/store";
import { localDate, localTime, toLocalIso } from "@/lib/time";
import type { WorkSession } from "@/lib/types";
import { apiError } from "@/lib/api-response";
import { comment as validateComment, date as validateDate, jsonBody, object, ValidationError } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = object(await jsonBody(request), ["action", "comment", "date"]);
    if (typeof body.action !== "string" || !["start", "start-break", "close-day", "reopen-day"].includes(body.action)) throw new ValidationError("Ismeretlen művelet.");
    const action = body.action as "start" | "start-break" | "close-day" | "reopen-day";
    const requestedDate = validateDate(body.date, false);
    const comment = validateComment(body.comment, action === "start-break");
    const settings = await getSettings();
    await reconcileOvernight(settings);
    const now = new Date();
    const today = localDate(now, settings.timezone);
    const date = requestedDate || today;
    let stamp = toLocalIso(date, localTime(now, settings.timezone));
    const sessions = await readRange(date, date);
    let active = sessions.find((s) => !s.end);
    if (action === "start") {
      if (date !== today) throw new Error("Élő munkamenet csak a mai napon indítható.");
      if ((await readWorkDay(date)).closedAt) throw new Error("A nap le van zárva; előbb nyisd újra.");
      if (active) throw new Error("Már van aktív munkamenet.");
      active = { id: randomUUID(), workDate: date, start: stamp, end: null } satisfies WorkSession;
      await upsertSession(active);
    } else if (action === "start-break") {
      await startBreak(date, stamp, comment || "");
    } else if (action === "close-day") {
      if (date !== today && !active) stamp = sessions.filter((session) => session.end).at(-1)?.end ?? stamp;
      await closeWorkDay(date, stamp);
    } else if (action === "reopen-day") {
      await reopenWorkDay(date, comment || undefined);
    } else throw new Error("Ismeretlen művelet.");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
