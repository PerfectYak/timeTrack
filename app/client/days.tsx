"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Settings, WorkBreak, WorkSession } from "@/lib/types";
import { formatDuration, localIsoNow, secondsBetween } from "@/lib/time";
import { formatClock, formatDate } from "@/lib/i18n";
import { api, Loading, Stat, type StateData, useApp } from "./shared";

export function Today({ onError }: { onError: (message: string) => void }) {
  const { settings, t } = useApp();
  const clock = (iso: string | null) => formatClock(iso, settings.locale);
  const [data, setData] = useState<StateData | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);
  const load = useCallback(async () => { try { setData(await api<StateData>("/api/state")); } catch (e) { onError((e as Error).message); } }, [onError]);
  useEffect(() => { const initial = setTimeout(() => void load(), 0); const refresh = setInterval(load, 30000); return () => { clearTimeout(initial); clearInterval(refresh); }; }, [load]);
  useEffect(() => { const update = () => setNow(Date.now()); const initial = setTimeout(update, 0); const timer = setInterval(update, 1000); return () => { clearTimeout(initial); clearInterval(timer); }; }, []);
  const live = useMemo(() => {
    if (!data) return null;
    const work = data.summary.workSeconds + (data.active ? Math.max(0, Math.floor((now - data.generatedAt) / 1000)) : 0);
    return { ...data.summary, workSeconds: work, balanceSeconds: work - data.summary.targetSeconds };
  }, [data, now]);
  const [commentMode, setCommentMode] = useState<"start-break" | "reopen-day" | null>(null);
  async function act(action: string, comment?: string) { setBusy(true); try { await api("/api/action", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, comment, date: data?.date }) }); await load(); setCommentMode(null); } catch (e) { onError((e as Error).message); } finally { setBusy(false); } }
  async function toggleLunch(pause: WorkBreak) { try { await api("/api/breaks", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: pause.id, date: data?.date, isLunch: !pause.isLunch }) }); await load(); } catch (e) { onError((e as Error).message); } }
  if (!data || !live) return <Loading />;
  return <section>
    <div className="page-heading"><div><p className="eyebrow">{t("todayWorkday")}</p><h1>{formatDate(data.date, settings.locale)}</h1></div><span className={`status ${data.day.closedAt ? "closed" : data.active ? "running" : data.activeBreak ? "paused" : "idle"}`}><i />{data.day.closedAt ? t("dayClosed") : data.active ? t("workRunning") : data.activeBreak ? t("breakRunning") : t("openDay")}</span></div>
    {data.autoClosed && <div className="notice">{t("autoClosed")}</div>}{data.lunchWarning && <div className="notice lunch-warning">{t("lunchWarning")}</div>}
    <div className="hero-card"><div className="timer-label">{t("netToday")}</div><div className="timer">{formatDuration(live.workSeconds)}</div><div className="controls">
      {!data.day.closedAt && !data.active && <button className="primary large" disabled={busy} onClick={() => act("start")}>▶ {t("startSession")}</button>}
      {!data.day.closedAt && data.active && <button className="secondary large" disabled={busy} onClick={() => setCommentMode("start-break")}>Ⅱ {t("startBreak")}</button>}
      {!data.day.closedAt && data.sessions.length > 0 && <button className="danger large" disabled={busy} onClick={() => confirm(t("confirmCloseDay")) && act("close-day")}>✓ {t("closeDay")}</button>}
      {data.day.closedAt && <button className="primary large" disabled={busy} onClick={() => setCommentMode("reopen-day")}>↻ {t("reopenDay")}</button>}
    </div>{data.active && <p className="session-note">{t("currentSessionStart")}: {clock(data.active.start)}</p>}{data.activeBreak && <p className="session-note">{t("breakStart")}: {clock(data.activeBreak.start)} · {data.activeBreak.comment}</p>}{data.day.closedAt && <p className="session-note">{t("dayClosure")}: {clock(data.day.closedAt)}</p>}</div>
    <div className="stats-grid"><Stat label={t("work")} value={formatDuration(live.workSeconds)} /><Stat label={t("sessions")} value={String(live.sessions)} /><Stat label={t("plannedEnd")} value={clock(live.plannedEnd)} /><Stat label={t("balance")} value={formatDuration(live.balanceSeconds, true)} tone={live.balanceSeconds >= 0 ? "positive" : "negative"} /></div>
    <DayComment date={data.date} initialValue={data.day.comment || ""} onError={onError} onSaved={load} />
    <div className="card"><div className="card-title"><h2>{t("todayTimeline")}</h2><span>{data.sessions.length} {t("sessionCount")}</span></div><SessionList sessions={data.sessions} breaks={data.breaks} onToggleLunch={toggleLunch} /></div>
    {commentMode && <CommentModal required={commentMode === "start-break"} title={commentMode === "start-break" ? t("startBreak") : t("reopenDay")} label={commentMode === "start-break" ? t("whyBreak") : t("noteReopen")} busy={busy} onClose={() => setCommentMode(null)} onSubmit={(comment) => act(commentMode, comment)} />}
  </section>;
}

function SessionList({ sessions, breaks, onToggleLunch }: { sessions: WorkSession[]; breaks: WorkBreak[]; onToggleLunch: (pause: WorkBreak) => void }) {
  const { settings, t } = useApp(); const clock = (iso: string | null) => formatClock(iso, settings.locale);
  if (!sessions.length) return <p className="empty">{t("noSession")}</p>;
  return <div className="session-list">{sessions.map((session) => { const current = localIsoNow(new Date(), settings.timezone); const pause = breaks.find((item) => item.afterSessionId === session.id); return <div key={session.id}><div className="session-row"><div><strong>{clock(session.start)} – {clock(session.end)}</strong><small>{session.end ? t("closedSession") : t("inProgress")}</small></div><b>{formatDuration(secondsBetween(session.start, session.end ?? current))}</b></div>{pause && <div className="break-timeline-row"><div><strong>Ⅱ {clock(pause.start)} – {clock(pause.end)}</strong><small>{pause.comment || t("noComment")}</small></div><div className="break-actions"><label><input type="checkbox" checked={pause.isLunch} onChange={() => onToggleLunch(pause)} /> {t("lunchBreak")}</label><b>{formatDuration(secondsBetween(pause.start, pause.end ?? current))}</b></div></div>}</div>; })}</div>;
}

export function DayComment({ date, initialValue, onError, onSaved }: { date: string; initialValue: string; onError: (message: string) => void; onSaved: () => void | Promise<void> }) {
  const { t } = useApp(); const [comment, setComment] = useState(initialValue); const [saved, setSaved] = useState(false);
  async function persist(value: string) { try { await api("/api/day-comment", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ date, comment: value }) }); setSaved(true); setTimeout(() => setSaved(false), 2000); await onSaved(); } catch (e) { onError((e as Error).message); } }
  return <div className="card day-comment-card"><div className="card-title"><div><h2>{t("dayNote")}</h2><span>{t("noteAnytime")}</span></div>{saved && <span className="saved">✓ {t("saved")}</span>}</div><textarea rows={3} maxLength={2000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder={t("notePlaceholder")} /><div className="note-actions"><button className="secondary" onClick={() => { setComment(""); void persist(""); }}>{t("delete")}</button><button className="primary" onClick={() => persist(comment)}>{t("saveNote")}</button></div></div>;
}

export function History({ onError, date, onBack }: { onError: (m: string) => void; date: string; onBack: () => void }) {
  const { settings, t } = useApp(); const clock = (iso: string | null) => formatClock(iso, settings.locale);
  const [data, setData] = useState<StateData | null>(null); const [editing, setEditing] = useState<WorkSession | null>(null); const [reopening, setReopening] = useState(false); const [editingBreak, setEditingBreak] = useState<WorkBreak | null>(null);
  const load = useCallback(async () => { try { setData(await api<StateData>(`/api/state?date=${date}`)); } catch (e) { onError((e as Error).message); } }, [date, onError]);
  useEffect(() => { const initial = setTimeout(() => void load(), 0); return () => clearTimeout(initial); }, [load]);
  const blank = (): WorkSession => ({ id: "", workDate: date, start: `${date}T09:00:00`, end: `${date}T17:00:00` });
  async function dayAction(action: "close-day" | "reopen-day", comment?: string) { try { await api("/api/action", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, comment, date }) }); setReopening(false); await load(); } catch (e) { onError((e as Error).message); } }
  async function remove(session: WorkSession) { if (!confirm(t("confirmDeleteSession"))) return; try { await api(`/api/sessions?date=${date}&id=${session.id}`, { method: "DELETE" }); await load(); } catch (e) { onError((e as Error).message); } }
  async function toggleLunch(pause: WorkBreak) { try { await api("/api/breaks", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: pause.id, date, isLunch: !pause.isLunch }) }); await load(); } catch (e) { onError((e as Error).message); } }
  return <section><div className="page-heading"><div><button className="back-link" onClick={onBack}>← {t("backReport")}</button><p className="eyebrow">{t("dailyData")}</p><h1>{formatDate(date, settings.locale)}</h1></div></div>
    {data ? <>{data.lunchWarning && <div className="notice lunch-warning">{t("lunchWarning")}</div>}<div className="stats-grid compact"><Stat label={t("work")} value={formatDuration(data.summary.workSeconds)} /><Stat label={t("sessions")} value={String(data.summary.sessions)} /><Stat label={t("plannedEnd")} value={clock(data.summary.plannedEnd)} /><Stat label={t("balance")} value={formatDuration(data.summary.balanceSeconds, true)} tone={data.summary.balanceSeconds >= 0 ? "positive" : "negative"} /></div><DayComment date={date} initialValue={data.day.comment || ""} onError={onError} onSaved={load} />
      <div className="card"><div className="card-title"><div><h2>{formatDate(date, settings.locale)}</h2><span>{data.day.closedAt ? t("reopenToEdit") : t("editableTimes")}</span></div><button disabled={Boolean(data.day.closedAt)} className="primary" onClick={() => setEditing(blank())}>+ {t("addSession")}</button></div>
      <div className={`day-state-bar ${data.day.closedAt ? "is-closed" : ""}`}><div><strong>{data.day.closedAt ? t("dayClosed") : t("openDay")}</strong><span>{data.day.closedAt ? `${t("closedAt")}: ${clock(data.day.closedAt)}` : t("moreSessions")}</span></div>{data.day.closedAt ? <button className="secondary" onClick={() => setReopening(true)}>{t("reopenDay")}</button> : data.sessions.length > 0 && <button className="danger" onClick={() => confirm(t("confirmCloseDay")) && dayAction("close-day")}>{t("closeDay")}</button>}</div>
      {!data.sessions.length && <p className="empty">{t("noEntry")}</p>}<div className="editable-list">{data.sessions.map((session) => { const pause = data.breaks.find((item) => item.afterSessionId === session.id); return <div key={session.id}><div className="editable-row"><div><strong>{clock(session.start)} – {clock(session.end)}</strong><small>{session.end ? t("closedSession") : t("inProgress")}</small></div><div><button disabled={Boolean(data.day.closedAt)} className="text-button" onClick={() => setEditing(structuredClone(session))}>{t("edit")}</button><button disabled={Boolean(data.day.closedAt)} className="text-button danger-text" onClick={() => remove(session)}>{t("delete")}</button></div></div>{pause && <div className="editable-row break-edit-row"><div><strong>Ⅱ {t("startBreak")} · {clock(pause.start)} – {clock(pause.end)}</strong><small>{pause.comment || t("noComment")}</small></div><div className="break-actions"><label><input type="checkbox" checked={pause.isLunch} onChange={() => toggleLunch(pause)} /> {t("lunchBreak")}</label><button className="text-button" onClick={() => setEditingBreak(pause)}>{t("editComment")}</button></div></div>}</div>; })}</div></div></> : <Loading />}
    {editing && <SessionModal session={editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await load(); }} onError={onError} />}
    {editingBreak && <CommentModal required={false} initialValue={editingBreak.comment || ""} title={t("breakNote")} label={t("breakReasonOptional")} onClose={() => setEditingBreak(null)} onSubmit={async (comment) => { try { await api("/api/breaks", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: editingBreak.id, date, comment }) }); setEditingBreak(null); await load(); } catch (e) { onError((e as Error).message); } }} />}
    {reopening && <CommentModal required={false} title={t("reopenDay")} label={t("reopenNoteOptional")} onClose={() => setReopening(false)} onSubmit={(comment) => dayAction("reopen-day", comment)} />}
  </section>;
}

function SessionModal({ session: initial, onClose, onSaved, onError }: { session: WorkSession; onClose: () => void; onSaved: () => void; onError: (m: string) => void }) {
  const { settings, t } = useApp(); const [session, setSession] = useState(initial); const [busy, setBusy] = useState(false);
  async function save() { setBusy(true); try { await api("/api/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(session) }); onSaved(); } catch (e) { onError((e as Error).message); } finally { setBusy(false); } }
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal"><div className="card-title"><div><p className="eyebrow">{session.id ? t("modification") : t("newEntry")}</p><h2>{t("session")}</h2></div><button className="close" onClick={onClose}>×</button></div><div className="form-grid"><LocaleTimeInput label={t("start")} value={session.start} date={session.workDate} locale={settings.locale} required onChange={(start) => start && setSession({ ...session, start })} /><LocaleTimeInput label={t("end")} value={session.end} date={session.workDate} locale={settings.locale} onChange={(end) => setSession({ ...session, end })} /></div><div className="modal-actions"><button className="secondary" onClick={onClose}>{t("cancel")}</button><button className="primary" disabled={busy} onClick={save}>{t("save")}</button></div></div></div>;
}

function LocaleTimeInput({ label, value, date, locale, required, onChange }: { label: string; value: string | null; date: string; locale: Settings["locale"]; required?: boolean; onChange: (value: string | null) => void }) {
  const render = (iso: string | null) => iso ? formatClock(iso, locale) : ""; const [text, setText] = useState(() => render(value));
  function commit() { const normalized = text.trim().toUpperCase(); if (!normalized && !required) { onChange(null); return; } let hour: number; let minute: number; if (locale === "hu-HU") { const match = normalized.match(/^([01]?\d|2[0-3]):([0-5]\d)$/); if (!match) { setText(render(value)); return; } hour = Number(match[1]); minute = Number(match[2]); } else { const match = normalized.match(/^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/); if (!match) { setText(render(value)); return; } hour = Number(match[1]) % 12 + (match[3] === "PM" ? 12 : 0); minute = Number(match[2]); } const iso = `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`; onChange(iso); setText(render(iso)); }
  return <label>{label}<input type="text" inputMode="text" placeholder={locale === "hu-HU" ? "HH:mm" : "h:mm AM/PM"} value={text} onChange={(event) => setText(event.target.value)} onBlur={commit} /></label>;
}

function CommentModal({ title, label, busy, required = true, initialValue = "", onClose, onSubmit }: { title: string; label: string; busy?: boolean; required?: boolean; initialValue?: string; onClose: () => void; onSubmit: (comment: string) => void }) {
  const { t } = useApp(); const [comment, setComment] = useState(initialValue);
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="modal comment-modal"><div className="card-title"><div><p className="eyebrow">{required ? t("reasonRequired") : t("optionalNote")}</p><h2>{title}</h2></div><button className="close" onClick={onClose}>×</button></div><label className="comment-field">{label}<textarea autoFocus rows={4} maxLength={2000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder={t("reasonPlaceholder")} /></label><div className="modal-actions"><button className="secondary" onClick={onClose}>{t("cancel")}</button><button className="primary" disabled={busy || (required && !comment.trim())} onClick={() => onSubmit(comment.trim())}>{t("save")}</button></div></div></div>;
}
