import { NextRequest, NextResponse } from "next/server";
import { saveDayComment } from "@/lib/store";
import { apiError } from "@/lib/api-response";
import { comment, date, jsonBody, object } from "@/lib/validation";

export const runtime = "nodejs";

export async function PUT(request: NextRequest) {
  try {
    const body = object(await jsonBody(request), ["date", "comment"]);
    await saveDayComment(date(body.date)!, comment(body.comment) ?? null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
