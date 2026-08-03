"use client";

import { useState } from "react";
import type { Settings } from "@/lib/types";
import { messages } from "@/lib/i18n";
import { api, useApp } from "./shared";

export function SettingsPanel({ onError }: { onError: (m: string) => void }) {
  const app = useApp();
  const { t } = app;
  const [settings, setDraft] = useState(app.settings);
  const [saved, setSaved] = useState(false);
  async function save() { try { const result = await api<Settings>("/api/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(settings) }); setDraft(result); app.setSettings(result); setSaved(true); setTimeout(() => setSaved(false), 2500); } catch (e) { onError((e as Error).message); } }
  const dayNames = messages[settings.language].weekdays;
  return <section><div className="page-heading"><div><p className="eyebrow">{t("configuration")}</p><h1>{t("settings")}</h1></div>{saved && <span className="saved">✓ {t("saved")}</span>}</div>
    <div className="card settings-card"><h2>{t("workTarget")}</h2><p className="muted">{t("targetHelp")}</p><div className="day-selector">{dayNames.map((name, i) => <button key={name} className={settings.workingDays.includes(i) ? "selected" : ""} onClick={() => setDraft({ ...settings, workingDays: settings.workingDays.includes(i) ? settings.workingDays.filter((d) => d !== i) : [...settings.workingDays, i] })}><strong>{name.slice(0, 2)}</strong><span>{name}</span></button>)}</div>
      <label className="target-input">{t("dailyTargetHours")}<input type="number" min="0" max="24" step="0.25" value={settings.dailyTargetMinutes / 60} onChange={(e) => setDraft({ ...settings, dailyTargetMinutes: Math.round(Number(e.target.value) * 60) })} /></label>
      <label className="target-input">{t("lunchMinutes")}<input type="number" min="0" max="240" step="5" value={settings.lunchBreakMinutes} onChange={(e) => setDraft({ ...settings, lunchBreakMinutes: Math.round(Number(e.target.value)) })} /></label>
      <hr/><div className="config-info"><label className="select-field"><strong>{t("interfaceLanguage")}</strong><span className="select-shell"><select value={settings.language} onChange={(e) => setDraft({ ...settings, language: e.target.value as Settings["language"] })}><option value="hu">Magyar</option><option value="en">English</option></select><i aria-hidden="true" /></span></label><label className="select-field"><strong>{t("dateTimeFormat")}</strong><span className="select-shell"><select value={settings.locale} onChange={(e) => setDraft({ ...settings, locale: e.target.value as Settings["locale"] })}><option value="hu-HU">{t("hungarianFormat")}</option><option value="en-US">{t("americanFormat")}</option></select><i aria-hidden="true" /></span></label><div><strong>{t("timezone")}</strong><span>{settings.timezone}</span></div><div><strong>{t("weekStart")}</strong><span>{t("monday")}</span></div></div>
      <div className="settings-actions"><code>config/settings.json</code><button className="primary" onClick={save}>{t("saveSettings")}</button></div>
    </div>
  </section>;
}
