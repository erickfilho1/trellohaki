"use client";

import type { LabelRecord } from "@/lib/flowboard-types";

export type PomodoroTaskDefinition = {
  id: string;
  label: string;
  subtitle: string;
  focusSeconds: number;
  builtin?: boolean;
};

export const POMODORO_FOCUS_FLOW_SECONDS = 25 * 60;

export const DEFAULT_POMODORO_TASKS: PomodoroTaskDefinition[] = [
  {
    id: "landing-page",
    label: "LP / Site",
    subtitle: "Landing pages, paginas institucionais e webdesign.",
    focusSeconds: 2 * 60 * 60,
    builtin: true,
  },
  {
    id: "video",
    label: "Video",
    subtitle: "Edicao, motion e ajustes em conteudo audiovisual.",
    focusSeconds: 90 * 60,
    builtin: true,
  },
  {
    id: "design",
    label: "Arte",
    subtitle: "Pecas graficas, design e demandas criativas.",
    focusSeconds: 40 * 60,
    builtin: true,
  },
  {
    id: "custom",
    label: "Personalizado",
    subtitle: "Tempo livre para sessoes ajustadas manualmente.",
    focusSeconds: POMODORO_FOCUS_FLOW_SECONDS,
    builtin: true,
  },
];

export const POMODORO_BREAK_OPTIONS = [
  { label: "5 min", value: 5 * 60 },
  { label: "10 min", value: 10 * 60 },
  { label: "15 min", value: 15 * 60 },
] as const;

export function inferPomodoroTaskId(labels: LabelRecord[], title: string) {
  const haystack = `${labels.map((label) => label.name).join(" ")} ${title}`.toLowerCase();

  if (/(lp|landing|site|webdesign|site\/lp|lp\/site)/i.test(haystack)) {
    return "landing-page";
  }

  if (/(video|reel|edicao|edicao|motion)/i.test(haystack)) {
    return "video";
  }

  if (/(arte|design|criativo|banner|kv|social)/i.test(haystack)) {
    return "design";
  }

  return "custom";
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

export function formatPomodoroDuration(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  }

  return `${String(minutes).padStart(2, "0")}:00`;
}
