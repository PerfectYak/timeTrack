import type { Settings } from "./types";

export type Language = Settings["language"];

export const messages = {
  hu: {
    today: "Ma", reports: "Riportok", settings: "Beállítások", worktime: "Munkaidő", localStorage: "Helyi adattárolás", localStorageNote: "Az adataid ezen a gépen maradnak",
    todayWorkday: "Mai munkanap", dayClosed: "Nap lezárva", workRunning: "Munka folyamatban", breakRunning: "Szünet folyamatban", openDay: "Nyitott nap",
    autoClosed: "Az előző napról nyitva maradt munkanapot a rendszer automatikusan lezárta.", lunchWarning: "Ezen a napon több szünet is ebédszünetnek van jelölve. A pontos tervezett befejezéshez hagyj meg egy jelölést.",
    netToday: "Nettó munkaidő ma", startSession: "Munkamenet indítása", startBreak: "Szünet indítása", closeDay: "Nap lezárása", reopenDay: "Nap újranyitása", confirmCloseDay: "Biztosan lezárod a teljes napot?",
    currentSessionStart: "Aktuális munkamenet kezdése", breakStart: "Szünet kezdése", dayClosure: "Napzárás", work: "Munkaidő", sessions: "Munkamenetek", plannedEnd: "Nap tervezett befejezése", balance: "Egyenleg",
    todayTimeline: "Mai idővonal", sessionCount: "munkamenet", noSession: "Még nincs rögzített munkamenet ezen a napon.", closedSession: "Lezárt munkamenet", inProgress: "Folyamatban", noComment: "Nincs megjegyzés", lunchBreak: "Ebédszünet",
    dayNote: "Napi jegyzet", noteAnytime: "Bármikor módosítható, lezárt napon is.", notePlaceholder: "Megjegyzés ehhez a naphoz…", delete: "Törlés", saveNote: "Jegyzet mentése", saved: "Mentve",
    backReport: "Vissza a riporthoz", dailyData: "Napi adatok", reopenToEdit: "Módosításhoz előbb nyisd újra a napot.", editableTimes: "Az időpontok utólag is javíthatók.", addSession: "Munkamenet", moreSessions: "További munkamenet rögzíthető", closedAt: "Lezárva", edit: "Szerkesztés", editComment: "Komment szerkesztése", noEntry: "Ehhez a naphoz még nincs bejegyzés.", confirmDeleteSession: "Biztosan törlöd ezt a munkamenetet?",
    breakNote: "Szünet megjegyzése", breakReasonOptional: "A szünet oka (opcionális)", reopenNoteOptional: "Megjegyzés az újranyitáshoz (opcionális)", modification: "Módosítás", newEntry: "Új bejegyzés", session: "Munkamenet", start: "Kezdés", end: "Befejezés", cancel: "Mégse", save: "Mentés", reasonRequired: "Indoklás szükséges", optionalNote: "Opcionális megjegyzés", whyBreak: "Miért tartasz szünetet?", noteReopen: "Megjegyzés az újranyitáshoz (opcionális)", reasonPlaceholder: "Írd le röviden az okát…",
    analysis: "Elemzés", workReports: "Munkaidő-riportok", excelExport: "Excel export", weekly: "Heti", monthly: "Havi", day: "Nap", status: "Állapot", entries: "Menetek", expected: "Elvárt", total: "Összesen", empty: "Nincs adat", closed: "Lezárt", open: "Nyitott", todayButton: "Ma", openDayMore: "Nyitott nap", deleteSession: "Munkamenet törlése",
    configuration: "Konfiguráció", workTarget: "Munkaidőcél", targetHelp: "Válaszd ki a munkanapokat és add meg az ezekre érvényes napi célidőt.", dailyTargetHours: "Napi cél (óra)", lunchMinutes: "Tervezett ebédidő (perc)", interfaceLanguage: "Felület nyelve", dateTimeFormat: "Dátum- és időformátum", hungarian: "Magyar", english: "English", hungarianFormat: "Magyar (hu-HU)", americanFormat: "English (en-US)", timezone: "Időzóna", weekStart: "Hét kezdete", monday: "Hétfő", saveSettings: "Beállítások mentése", loading: "Adatok betöltése…",
    weekdays: ["Vasárnap", "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"],
  },
  en: {
    today: "Today", reports: "Reports", settings: "Settings", worktime: "Work time", localStorage: "Local storage", localStorageNote: "Your data stays on this computer",
    todayWorkday: "Today's workday", dayClosed: "Day closed", workRunning: "Work in progress", breakRunning: "Break in progress", openDay: "Open day",
    autoClosed: "The workday left open from the previous day was closed automatically.", lunchWarning: "More than one break is marked as lunch on this day. Keep one designation for an accurate planned finish.",
    netToday: "Net work time today", startSession: "Start work session", startBreak: "Start break", closeDay: "Close day", reopenDay: "Reopen day", confirmCloseDay: "Are you sure you want to close the entire day?",
    currentSessionStart: "Current session started", breakStart: "Break started", dayClosure: "Day closed at", work: "Work time", sessions: "Sessions", plannedEnd: "Planned finish", balance: "Balance",
    todayTimeline: "Today's timeline", sessionCount: "sessions", noSession: "No work session has been recorded for this day.", closedSession: "Closed work session", inProgress: "In progress", noComment: "No note", lunchBreak: "Lunch break",
    dayNote: "Daily note", noteAnytime: "Can be changed at any time, even on a closed day.", notePlaceholder: "Note for this day…", delete: "Delete", saveNote: "Save note", saved: "Saved",
    backReport: "Back to report", dailyData: "Daily details", reopenToEdit: "Reopen the day before making changes.", editableTimes: "Times can be corrected afterwards.", addSession: "Session", moreSessions: "More sessions can be recorded", closedAt: "Closed", edit: "Edit", editComment: "Edit comment", noEntry: "No entry exists for this day.", confirmDeleteSession: "Are you sure you want to delete this work session?",
    breakNote: "Break note", breakReasonOptional: "Reason for the break (optional)", reopenNoteOptional: "Reopening note (optional)", modification: "Edit", newEntry: "New entry", session: "Work session", start: "Start", end: "End", cancel: "Cancel", save: "Save", reasonRequired: "Reason required", optionalNote: "Optional note", whyBreak: "Why are you taking a break?", noteReopen: "Note for reopening (optional)", reasonPlaceholder: "Briefly describe the reason…",
    analysis: "Analysis", workReports: "Work time reports", excelExport: "Excel export", weekly: "Weekly", monthly: "Monthly", day: "Day", status: "Status", entries: "Sessions", expected: "Expected", total: "Total", empty: "No data", closed: "Closed", open: "Open", todayButton: "Today", openDayMore: "Open day", deleteSession: "Delete work session",
    configuration: "Configuration", workTarget: "Work target", targetHelp: "Select workdays and set the daily target that applies to them.", dailyTargetHours: "Daily target (hours)", lunchMinutes: "Planned lunch break (minutes)", interfaceLanguage: "Interface language", dateTimeFormat: "Date and time format", hungarian: "Magyar", english: "English", hungarianFormat: "Hungarian (hu-HU)", americanFormat: "English (en-US)", timezone: "Time zone", weekStart: "Week starts on", monday: "Monday", saveSettings: "Save settings", loading: "Loading data…",
    weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  },
} as const;

export type MessageKey = Exclude<keyof typeof messages.hu, "weekdays">;
export function translator(language: Language) { return (key: MessageKey) => messages[language][key] as string; }

export function formatDate(date: string, locale: Settings["locale"], long = true) {
  return new Intl.DateTimeFormat(locale, { ...(long ? { year: "numeric", month: "long", day: "numeric", weekday: "long" } : { month: "short", day: "numeric", weekday: "short" }), timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

export function formatClock(iso: string | null, locale: Settings["locale"], seconds = false) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", second: seconds ? "2-digit" : undefined, hour12: locale === "en-US", timeZone: "UTC" }).format(new Date(`${iso}Z`));
}

export function translateError(message: string, language: Language) {
  if (language === "hu") return message;
  const map: Record<string, string> = {
    "Nincs aktív munkamenet.": "There is no active work session.", "A szünet indoklása kötelező.": "A reason is required to start a break.",
    "A nap már le van zárva.": "The day is already closed.", "A nap nincs lezárva.": "The day is not closed.", "Üres nap nem zárható le.": "An empty day cannot be closed.",
    "A lezárt nap módosítás előtt újranyitandó.": "Reopen the closed day before making changes.", "Már van aktív munkamenet.": "A work session is already active.",
    "A munkamenet átfed egy másik munkamenettel.": "The work session overlaps another session.", "Érvénytelen dátum.": "Invalid date.",
    "A beállításfájl formátuma hibás.": "The settings file has an invalid format.", "Hiányos munkamenet.": "The work session is incomplete.",
    "A munkamenet nem nyúlhat át másik napra.": "A work session cannot span multiple days.", "A befejezésnek a kezdés után kell lennie.": "The end must be after the start.",
    "A szünet nem található.": "The break could not be found.", "A munkamenet nem található.": "The work session could not be found.",
    "A nap lezárási időpontja nem állapítható meg.": "The day closing time could not be determined.", "A naphoz nem tartozik lezárt munkamenet.": "The day has no closed work session.",
    "Nyitott munkamenet csak a mai naphoz tartozhat.": "An open work session can only belong to today.", "Élő munkamenet csak a mai napon indítható.": "A live work session can only be started today.",
    "A nap le van zárva; előbb nyisd újra.": "The day is closed; reopen it first.", "Ismeretlen művelet.": "Unknown action.", "Váratlan hiba történt.": "An unexpected error occurred.",
    "A kérés formátuma hibás.": "The request has an invalid format.", "A kérés ismeretlen mezőt tartalmaz.": "The request contains an unknown field.",
    "A kérés nem érvényes JSON.": "The request is not valid JSON.", "A kérés túl nagy.": "The request is too large.", "Érvénytelen időpont.": "Invalid time.",
    "Érvénytelen azonosító.": "Invalid identifier.", "Érvénytelen logikai érték.": "Invalid boolean value.", "A megjegyzés formátuma hibás.": "The note has an invalid format.",
    "A megjegyzés legfeljebb 2000 karakter lehet.": "The note can contain at most 2000 characters.", "Érvénytelen időzóna.": "Invalid time zone.",
    "A kezdési és befejezési idő nem lehet a jövőben.": "Start and end times cannot be in the future.",
  };
  return map[message] ?? message;
}
