import { NextRequest, NextResponse } from "next/server";
import { getSettings, readBreaks, readRange, readWorkDays, reconcileOvernight } from "@/lib/store";
import { buildReport, periodBounds } from "@/lib/report";
import { localDate } from "@/lib/time";
import { buildExcelWorkbook } from "@/lib/excel";
import { apiError } from "@/lib/api-response";
import { dateQuery, ValidationError } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const kindValue = request.nextUrl.searchParams.get("kind");
    if (kindValue !== null && !["week", "month"].includes(kindValue)) throw new ValidationError("A kérés formátuma hibás.");
    const kind = kindValue === "month" ? "month" : "week";
    const anchorValue = request.nextUrl.searchParams.get("anchor");
    if (anchorValue) dateQuery(anchorValue);
    const format = request.nextUrl.searchParams.get("format");
    if (format !== null && format !== "xlsx") throw new ValidationError("A kérés formátuma hibás.");
    const settings = await getSettings();
    await reconcileOvernight(settings);
    const anchor = anchorValue ? dateQuery(anchorValue)! : localDate(new Date(), settings.timezone);
    const { start, end } = periodBounds(kind, anchor);
    const sessions = await readRange(start, end);
    const breaks = await readBreaks(start, end);
    const days = await readWorkDays(start, end);
    const report = buildReport(kind, start, end, sessions, settings, days, breaks);
    if (format === "xlsx") {
      const buffer = await buildExcelWorkbook({ start, end, today: localDate(new Date(), settings.timezone), sessions, breaks, days, settings });
      return new NextResponse(new Uint8Array(buffer), { headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename=${settings.language === "en" ? `worktime-${kind}` : `munkaido-${kind === "week" ? "het" : "honap"}`}-${start}.xlsx`,
      }});
    }
    return NextResponse.json(report);
  } catch (error) {
    return apiError(error);
  }
}
