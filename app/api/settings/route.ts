import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/store";
import { apiError } from "@/lib/api-response";
import { jsonBody, settingsInput } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  try { return NextResponse.json(await getSettings()); }
  catch (error) { return apiError(error); }
}

export async function PUT(request: NextRequest) {
  try { return NextResponse.json(await saveSettings(settingsInput(await jsonBody(request)))); }
  catch (error) { return apiError(error); }
}
