export type WorkSession = {
  id: string;
  workDate: string;
  start: string;
  end: string | null;
};

export type WorkBreak = {
  id: string;
  workDate: string;
  afterSessionId: string;
  start: string;
  end: string | null;
  comment: string | null;
  isLunch: boolean;
};

export type WorkDay = { date: string; closedAt: string | null; comment: string | null; exists: boolean };

export type Settings = {
  version: 1;
  language: "hu" | "en";
  locale: "hu-HU" | "en-US";
  timezone: string;
  weekStartsOn: 1;
  workingDays: number[];
  dailyTargetMinutes: number;
  lunchBreakMinutes: number;
};

export type DaySummary = {
  date: string;
  workSeconds: number;
  targetSeconds: number;
  balanceSeconds: number;
  sessions: number;
  status: "empty" | "open" | "closed";
  plannedEnd: string | null;
};

export type Report = {
  kind: "week" | "month";
  start: string;
  end: string;
  days: DaySummary[];
  totals: Omit<DaySummary, "date" | "status" | "plannedEnd">;
};
