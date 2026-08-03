import { NextRequest, NextResponse } from "next/server";
import { getSettings, readBreaks, readRange, readWorkDay, reconcileOvernight } from "@/lib/store";
import { localDate, summarizeDay } from "@/lib/time";
import { apiError } from "@/lib/api-response";
import { dateQuery } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const requestedDate = request.nextUrl.searchParams.get("date");
    const validatedDate = requestedDate ? dateQuery(requestedDate)! : undefined;
    const settings = await getSettings();
    const autoClosed = await reconcileOvernight(settings);
    const date = validatedDate ?? localDate(new Date(), settings.timezone);
    const sessions = await readRange(date, date);
    const breaks = await readBreaks(date, date);
    const day = await readWorkDay(date);
    const active = sessions.find((s) => !s.end) ?? null;
    const activeBreak = breaks.find((pause) => !pause.end) ?? null;
    const generatedAt = Date.now();
    return NextResponse.json({ date, day, sessions, breaks, active, activeBreak, summary: summarizeDay(date, sessions, settings, day, new Date(generatedAt), breaks), lunchWarning: breaks.filter((pause) => pause.isLunch).length > 1, autoClosed, generatedAt });
  } catch (error) {
    return apiError(error);
  }
}
