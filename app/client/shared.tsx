"use client";

import { createContext, useContext } from "react";
import type { DaySummary, Settings, WorkBreak, WorkDay, WorkSession } from "@/lib/types";
import { translator } from "@/lib/i18n";

export type StateData = { date: string; day: WorkDay; sessions: WorkSession[]; breaks: WorkBreak[]; active: WorkSession | null; activeBreak: WorkBreak | null; summary: DaySummary; lunchWarning: boolean; autoClosed: boolean; generatedAt: number };
export type AppContextValue = { settings: Settings; setSettings: (settings: Settings) => void; t: ReturnType<typeof translator> };
export const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("Missing app context");
  return value;
}

export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Váratlan hiba történt.");
  return body;
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <div className={`stat ${tone || ""}`}><span>{label}</span><strong>{value}</strong></div>;
}

export function Loading() {
  const { t } = useApp();
  return <div className="loading"><span /><p>{t("loading")}</p></div>;
}
