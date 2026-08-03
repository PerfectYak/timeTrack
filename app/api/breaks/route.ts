import { NextRequest, NextResponse } from "next/server";
import { updateBreak } from "@/lib/store";
import { apiError } from "@/lib/api-response";
import { boolean, comment, date, id, jsonBody, object, ValidationError } from "@/lib/validation";

export const runtime = "nodejs";

export async function PUT(request: NextRequest) {
  try {
    const body = object(await jsonBody(request), ["id", "date", "comment", "isLunch"]);
    if (body.comment === undefined && body.isLunch === undefined) throw new ValidationError("A kérés formátuma hibás.");
    await updateBreak(date(body.date)!, id(body.id)!, { comment: body.comment === undefined ? undefined : comment(body.comment), isLunch: body.isLunch === undefined ? undefined : boolean(body.isLunch) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
