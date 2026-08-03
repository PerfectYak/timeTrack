"use client";

import { useCallback, useEffect, useState } from "react";
import type { Settings } from "@/lib/types";
import { localDate } from "@/lib/time";
import { translateError, translator, type MessageKey } from "@/lib/i18n";
import { api, AppContext, useApp } from "./client/shared";
import { History, Today } from "./client/days";
import { Reports } from "./client/reports";
import { SettingsPanel } from "./client/settings";

type Tab = "today" | "detail" | "reports" | "settings";

const nav: { id: Tab; label: MessageKey; icon: string }[] = [
  { id: "today", label: "today", icon: "◉" },
  { id: "reports", label: "reports", icon: "▥" },
  { id: "settings", label: "settings", icon: "⚙" },
];

export default function Home() {
  const [settings, setSettings] = useState<Settings | null>(null);
  useEffect(() => { api<Settings>("/api/settings").then(setSettings).catch(() => undefined); }, []);
  if (!settings) return <div className="loading"><span /></div>;
  return <AppContext.Provider value={{ settings, setSettings, t: translator(settings.language) }}><AppShell /></AppContext.Provider>;
}

function AppShell() {
  const { settings, t } = useApp();
  const [tab, setTab] = useState<Tab>("today");
  const [error, setError] = useState("");
  const [date, setDate] = useState("");
  const [detailDate, setDetailDate] = useState("");
  const [reportKind, setReportKind] = useState<"week" | "month">("week");
  const [reportAnchor, setReportAnchor] = useState("");
  useEffect(() => { const initial = setTimeout(() => { const current = localDate(new Date(), settings.timezone); setDate(current); setReportAnchor(current); }, 0); return () => clearTimeout(initial); }, [settings.timezone]);
  useEffect(() => {
    // A localhost:3000 címet korábban használó alkalmazások service workere
    // képes elfogni ennek az alkalmazásnak a kéréseit, ezért lokális módban takarítunk.
    if ("serviceWorker" in navigator) void navigator.serviceWorker.getRegistrations().then((items) => Promise.all(items.map((item) => item.unregister())));
    if ("caches" in window) void caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
  }, []);
  useEffect(() => { document.documentElement.lang = settings.language; document.title = settings.language === "hu" ? "Időkeret – Munkaidő" : "Timeframe – Work time"; }, [settings.language]);
  const onError = useCallback((message: string) => { setError(translateError(message, settings.language)); setTimeout(() => setError(""), 5000); }, [settings.language]);
  return <div className="shell"><aside><div className="brand"><div className="logo">◷</div><div><strong>{settings.language === "hu" ? "Időkeret" : "Timeframe"}</strong><span>{t("worktime")}</span></div></div><nav>{nav.map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}><i>{item.icon}</i>{t(item.label)}</button>)}</nav><div className="storage"><span>●</span><div><strong>{t("localStorage")}</strong><small>{t("localStorageNote")}</small></div></div></aside>
    <main>{error && <div className="toast">{error}<button onClick={() => setError("")}>×</button></div>}{tab === "today" && <Today onError={onError} />}{detailDate && tab === "detail" && <History date={detailDate} onBack={() => setTab("reports")} onError={onError} />}{date && reportAnchor && tab === "reports" && <Reports today={date} kind={reportKind} anchor={reportAnchor} setKind={setReportKind} setAnchor={setReportAnchor} onSelectDate={(selected) => { setDetailDate(selected); setTab("detail"); }} onError={onError} />}{tab === "settings" && <SettingsPanel onError={onError} />}</main>
  </div>;
}
