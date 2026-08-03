"use client";

import { useCallback, useEffect, useState } from "react";
import type { Report } from "@/lib/types";
import { formatDuration, moveDate } from "@/lib/time";
import { formatDate } from "@/lib/i18n";
import { api, Loading, Stat, useApp } from "./shared";

export function Reports({ onError, today, kind, anchor, setKind, setAnchor, onSelectDate }: { onError: (m: string) => void; today: string; kind: "week" | "month"; anchor: string; setKind: (kind: "week" | "month") => void; setAnchor: (date: string) => void; onSelectDate: (date: string) => void }) {
  const { settings, t } = useApp();
  const [report, setReport] = useState<Report | null>(null);
  const load = useCallback(async () => { try { setReport(await api<Report>(`/api/report?kind=${kind}&anchor=${anchor}`)); } catch (e) { onError((e as Error).message); } }, [kind, anchor, onError]);
  useEffect(() => { const initial = setTimeout(() => void load(), 0); return () => clearTimeout(initial); }, [load]);
  function move(amount: number) { setAnchor(moveDate(anchor, amount * (kind === "week" ? 7 : 1), kind === "week" ? "day" : "month")); }
  return <section><div className="page-heading"><div><p className="eyebrow">{t("analysis")}</p><h1>{t("workReports")}</h1></div><a className="secondary button-link" href={`/api/report?kind=${kind}&anchor=${anchor}&format=xlsx`}>↓ {t("excelExport")}</a></div>
    <div className="report-toolbar"><div className="segmented"><button className={kind === "week" ? "active" : ""} onClick={() => setKind("week")}>{t("weekly")}</button><button className={kind === "month" ? "active" : ""} onClick={() => setKind("month")}>{t("monthly")}</button></div><div className="period-nav"><button onClick={() => move(-1)}>‹</button><strong>{report ? `${formatDate(report.start, settings.locale, false)} – ${formatDate(report.end, settings.locale, false)}` : "…"}</strong><button onClick={() => move(1)}>›</button><button className="today-link" onClick={() => setAnchor(today)}>{t("todayButton")}</button></div></div>
    {report ? <><div className="stats-grid"><Stat label={t("work")} value={formatDuration(report.totals.workSeconds)} /><Stat label={t("sessions")} value={String(report.totals.sessions)} /><Stat label={t("expected")} value={formatDuration(report.totals.targetSeconds)} /><Stat label={t("balance")} value={formatDuration(report.totals.balanceSeconds, true)} tone={report.totals.balanceSeconds >= 0 ? "positive" : "negative"} /></div>
    <div className="card table-card"><table><thead><tr><th>{t("day")}</th><th>{t("status")}</th><th>{t("entries")}</th><th>{t("work")}</th><th>{t("expected")}</th><th>{t("balance")}</th></tr></thead><tbody>{report.days.map((d) => <tr role="button" tabIndex={0} onClick={() => onSelectDate(d.date)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelectDate(d.date); }} key={d.date} className={`clickable-row ${d.date === today ? "today-row" : ""}`}><td><strong>{formatDate(d.date, settings.locale, false)}</strong></td><td>{d.status === "closed" ? t("closed") : d.status === "open" ? t("open") : t("empty")}</td><td>{d.sessions}</td><td><strong>{formatDuration(d.workSeconds)}</strong></td><td>{formatDuration(d.targetSeconds)}</td><td className={d.balanceSeconds >= 0 ? "green" : "red"}>{formatDuration(d.balanceSeconds, true)}</td></tr>)}</tbody><tfoot><tr><td>{t("total")}</td><td>—</td><td>{report.totals.sessions}</td><td>{formatDuration(report.totals.workSeconds)}</td><td>{formatDuration(report.totals.targetSeconds)}</td><td>{formatDuration(report.totals.balanceSeconds, true)}</td></tr></tfoot></table></div></> : <Loading />}
  </section>;
}
