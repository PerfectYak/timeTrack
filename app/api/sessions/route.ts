import { NextRequest, NextResponse } from "next/server";
import { deleteSession, getSettings, randomUUID, upsertSession } from "@/lib/store";
import type { WorkSession } from "@/lib/types";
import { localDate } from "@/lib/time";
import { apiError } from "@/lib/api-response";
import { dateQuery, identifierQuery, jsonBody, sessionInput } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const parsed = sessionInput(await jsonBody(request));
    const session: WorkSession = { ...parsed, id: parsed.id || randomUUID() };
    const settings = await getSettings();
    if (!session.end && session.workDate !== localDate(new Date(), settings.timezone)) throw new Error("Nyitott munkamenet csak a mai naphoz tartozhat.");
    await upsertSession(session);
    return NextResponse.json(session);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const date = dateQuery(request.nextUrl.searchParams.get("date"))!;
    const id = identifierQuery(request.nextUrl.searchParams.get("id"))!;
    await deleteSession(date, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
