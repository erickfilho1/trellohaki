"use client";

import type { LabelRecord } from "@/lib/flowboard-types";

export type PomodoroTaskPreset = "landing-page" | "video" | "design" | "custom";

export type PomodoroPresetDefinition = {
  id: PomodoroTaskPreset;
  label: string;
  subtitle: string;
  focusSeconds: number;
};

export const POMODORO_PRESETS: Record<PomodoroTaskPreset, PomodoroPresetDefinition> = {
  "landing-page": {
    id: "landing-page",
    label: "LP / Site",
    subtitle: "Tempo padr\u00e3o para landing pages e webdesign.",
    focusSeconds: 2 * 60 * 60,
  },
  video: {
    id: "video",
    label: "V\u00eddeo",
    subtitle: "Sess\u00e3o padr\u00e3o para edi\u00e7\u00e3o e ajustes de v\u00eddeo.",
    focusSeconds: 90 * 60,
  },
  design: {
    id: "design",
    label: "Arte",
    subtitle: "Sess\u00e3o curta para pe\u00e7as, artes e tarefas visuais.",
    focusSeconds: 40 * 60,
  },
  custom: {
    id: "custom",
    label: "Personalizado",
    subtitle: "Comece manualmente e ajuste a dura\u00e7\u00e3o como quiser.",
    focusSeconds: 25 * 60,
  },
};

export const POMODORO_BREAK_OPTIONS = [
  { label: "5 min", value: 5 * 60 },
  { label: "10 min", value: 10 * 60 },
  { label: "15 min", value: 15 * 60 },
] as const;

export function inferPomodoroPreset(labels: LabelRecord[], title: string) {
  const haystack = `${labels.map((label) => label.name).join(" ")} ${title}`.toLowerCase();

  if (/(lp|landing|site|webdesign|site\/lp|lp\/site)/i.test(haystack)) {
    return "landing-page" as const;
  }

  if (/(video|reel|edicao|edi\u00e7\u00e3o|motion)/i.test(haystack)) {
    return "video" as const;
  }

  if (/(arte|design|criativo|banner|kv|social)/i.test(haystack)) {
    return "design" as const;
  }

  return "custom" as const;
}

export function formatPomodoroClock(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
