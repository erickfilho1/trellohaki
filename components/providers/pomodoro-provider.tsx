"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { PomodoroWidget } from "@/components/pomodoro-widget";
import {
  inferPomodoroPreset,
  POMODORO_PRESETS,
  type PomodoroTaskPreset,
} from "@/lib/pomodoro";
import type { LabelRecord } from "@/lib/flowboard-types";

type PomodoroMode = "focus" | "break";
type PomodoroStatus = "idle" | "running" | "paused";

type PomodoroLinkedCard = {
  boardId: string;
  listId: string;
  cardId: string;
  cardTitle: string;
  labels: LabelRecord[];
};

type PomodoroState = {
  open: boolean;
  position: { x: number; y: number };
  linkedCard: PomodoroLinkedCard | null;
  preset: PomodoroTaskPreset;
  mode: PomodoroMode;
  status: PomodoroStatus;
  focusSeconds: number;
  breakSeconds: number;
  remainingSeconds: number;
  completedSessions: number;
  autoRestartFocus: boolean;
};

type PomodoroContextValue = {
  state: PomodoroState;
  canUsePomodoro: boolean;
  openForCard: (payload: PomodoroLinkedCard) => void;
  close: () => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  setBreakSeconds: (value: number) => void;
  setPreset: (preset: PomodoroTaskPreset) => void;
  setAutoRestartFocus: (value: boolean) => void;
  setPosition: (position: { x: number; y: number }) => void;
};

const INITIAL_STATE: PomodoroState = {
  open: false,
  position: { x: 48, y: 118 },
  linkedCard: null,
  preset: "custom",
  mode: "focus",
  status: "idle",
  focusSeconds: POMODORO_PRESETS.custom.focusSeconds,
  breakSeconds: 5 * 60,
  remainingSeconds: POMODORO_PRESETS.custom.focusSeconds,
  completedSessions: 0,
  autoRestartFocus: true,
};

const PomodoroContext = createContext<PomodoroContextValue | null>(null);

function playPomodoroBell() {
  if (typeof window === "undefined") {
    return;
  }

  const audioContext = new window.AudioContext();
  const now = audioContext.currentTime;
  const notes = [523.25, 659.25, 783.99];

  notes.forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(0.0001, now + index * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.09, now + index * 0.12 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 0.24);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now + index * 0.12);
    oscillator.stop(now + index * 0.12 + 0.26);
  });

  window.setTimeout(() => {
    void audioContext.close();
  }, 900);
}

export function PomodoroProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();
  const [state, setState] = useState<PomodoroState>(INITIAL_STATE);
  const tickingRef = useRef<number | null>(null);
  const canUsePomodoro = user.panel === "admin" || user.panel === "colaborador";

  const stopTicker = useCallback(() => {
    if (tickingRef.current) {
      window.clearInterval(tickingRef.current);
      tickingRef.current = null;
    }
  }, []);

  const setPreset = useCallback((preset: PomodoroTaskPreset) => {
    setState((current) => {
      const nextFocusSeconds = POMODORO_PRESETS[preset].focusSeconds;
      const nextRemaining =
        current.mode === "focus" && current.status !== "running"
          ? nextFocusSeconds
          : current.remainingSeconds;

      return {
        ...current,
        preset,
        focusSeconds: nextFocusSeconds,
        remainingSeconds: nextRemaining,
      };
    });
  }, []);

  const openForCard = useCallback(
    (payload: PomodoroLinkedCard) => {
      if (!canUsePomodoro) {
        return;
      }

      const preset = inferPomodoroPreset(payload.labels, payload.cardTitle);

      setState((current) => ({
        ...current,
        open: true,
        linkedCard: payload,
        preset,
        mode: "focus",
        status: "idle",
        focusSeconds: POMODORO_PRESETS[preset].focusSeconds,
        remainingSeconds: POMODORO_PRESETS[preset].focusSeconds,
      }));
    },
    [canUsePomodoro],
  );

  const close = useCallback(() => {
    setState((current) => ({ ...current, open: false }));
  }, []);

  const start = useCallback(() => {
    setState((current) => ({ ...current, status: "running" }));
  }, []);

  const pause = useCallback(() => {
    setState((current) => ({ ...current, status: "paused" }));
  }, []);

  const reset = useCallback(() => {
    setState((current) => ({
      ...current,
      status: "idle",
      remainingSeconds: current.mode === "focus" ? current.focusSeconds : current.breakSeconds,
    }));
  }, []);

  const skip = useCallback(() => {
    setState((current) => {
      const nextMode = current.mode === "focus" ? "break" : "focus";
      const nextRemaining = nextMode === "focus" ? current.focusSeconds : current.breakSeconds;

      return {
        ...current,
        mode: nextMode,
        status: "idle",
        remainingSeconds: nextRemaining,
      };
    });
  }, []);

  const setBreakSeconds = useCallback((value: number) => {
    setState((current) => ({
      ...current,
      breakSeconds: value,
      remainingSeconds:
        current.mode === "break" && current.status !== "running" ? value : current.remainingSeconds,
    }));
  }, []);

  const setAutoRestartFocus = useCallback((value: boolean) => {
    setState((current) => ({ ...current, autoRestartFocus: value }));
  }, []);

  const setPosition = useCallback((position: { x: number; y: number }) => {
    setState((current) => ({ ...current, position }));
  }, []);

  useEffect(() => {
    if (!state.open || state.status !== "running") {
      stopTicker();
      return;
    }

    tickingRef.current = window.setInterval(() => {
      setState((current) => {
        if (current.status !== "running") {
          return current;
        }

        if (current.remainingSeconds > 1) {
          return {
            ...current,
            remainingSeconds: current.remainingSeconds - 1,
          };
        }

        playPomodoroBell();

        if (current.mode === "focus") {
          return {
            ...current,
            mode: "break",
            status: "idle",
            remainingSeconds: current.breakSeconds,
            completedSessions: current.completedSessions + 1,
          };
        }

        return {
          ...current,
          mode: "focus",
          status: current.autoRestartFocus ? "running" : "idle",
          remainingSeconds: current.focusSeconds,
        };
      });
    }, 1000);

    return stopTicker;
  }, [state.open, state.status, stopTicker, state.autoRestartFocus]);

  useEffect(() => {
    return stopTicker;
  }, [stopTicker]);

  const value = useMemo<PomodoroContextValue>(
    () => ({
      state,
      canUsePomodoro,
      openForCard,
      close,
      start,
      pause,
      reset,
      skip,
      setBreakSeconds,
      setPreset,
      setAutoRestartFocus,
      setPosition,
    }),
    [
      canUsePomodoro,
      close,
      openForCard,
      pause,
      reset,
      setAutoRestartFocus,
      setBreakSeconds,
      setPosition,
      setPreset,
      skip,
      start,
      state,
    ],
  );

  return (
    <PomodoroContext.Provider value={value}>
      {children}
      {canUsePomodoro ? <PomodoroWidget /> : null}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro() {
  const context = useContext(PomodoroContext);

  if (!context) {
    throw new Error("usePomodoro must be used within PomodoroProvider.");
  }

  return context;
}
