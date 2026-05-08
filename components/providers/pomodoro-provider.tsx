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
import { useFlowBoardStore } from "@/components/providers/flowboard-provider";
import { PomodoroWidget } from "@/components/pomodoro-widget";
import {
  DEFAULT_POMODORO_TASKS,
  inferPomodoroTaskId,
  POMODORO_FOCUS_FLOW_SECONDS,
  type PomodoroTaskDefinition,
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
  taskId: string;
  tasks: PomodoroTaskDefinition[];
  mode: PomodoroMode;
  status: PomodoroStatus;
  focusSeconds: number;
  taskRemainingSeconds: number;
  segmentSeconds: number;
  breakSeconds: number;
  remainingSeconds: number;
  completedSessions: number;
  autoRestartFocus: boolean;
  awaitingBreakDecision: boolean;
  completionPrompt: boolean;
};

type PomodoroContextValue = {
  state: PomodoroState;
  canUsePomodoro: boolean;
  openForCard: (payload: PomodoroLinkedCard) => void;
  close: () => void;
  isLinkedToCard: (cardId: string) => boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  startBreak: () => void;
  continueWithoutBreak: () => void;
  confirmTaskFinished: () => void;
  continueTaskAfterPrompt: () => void;
  setBreakSeconds: (value: number) => void;
  setTask: (taskId: string) => void;
  setFocusSeconds: (value: number) => void;
  addCustomTask: (payload: { label: string; minutes: number }) => void;
  setAutoRestartFocus: (value: boolean) => void;
  setPosition: (position: { x: number; y: number }) => void;
};

const INITIAL_TASK =
  DEFAULT_POMODORO_TASKS.find((task) => task.id === "custom") ?? DEFAULT_POMODORO_TASKS[0];

const INITIAL_STATE: PomodoroState = {
  open: false,
  position: { x: 48, y: 118 },
  linkedCard: null,
  taskId: INITIAL_TASK.id,
  tasks: DEFAULT_POMODORO_TASKS,
  mode: "focus",
  status: "idle",
  focusSeconds: INITIAL_TASK.focusSeconds,
  taskRemainingSeconds: INITIAL_TASK.focusSeconds,
  segmentSeconds: Math.min(POMODORO_FOCUS_FLOW_SECONDS, INITIAL_TASK.focusSeconds),
  breakSeconds: 5 * 60,
  remainingSeconds: Math.min(POMODORO_FOCUS_FLOW_SECONDS, INITIAL_TASK.focusSeconds),
  completedSessions: 0,
  autoRestartFocus: true,
  awaitingBreakDecision: false,
  completionPrompt: false,
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

function getNextFocusChunk(totalRemainingSeconds: number) {
  return Math.max(0, Math.min(POMODORO_FOCUS_FLOW_SECONDS, totalRemainingSeconds));
}

function buildTaskState(
  current: PomodoroState,
  selectedTask: PomodoroTaskDefinition,
  nextTasks?: PomodoroTaskDefinition[],
): PomodoroState {
  const totalSeconds = selectedTask.focusSeconds;
  const chunk = getNextFocusChunk(totalSeconds);

  return {
    ...current,
    taskId: selectedTask.id,
    tasks: nextTasks ?? current.tasks,
    mode: "focus",
    status: "idle",
    focusSeconds: totalSeconds,
    taskRemainingSeconds: totalSeconds,
    segmentSeconds: chunk,
    remainingSeconds: chunk,
    completedSessions: 0,
    awaitingBreakDecision: false,
    completionPrompt: false,
  };
}

export function PomodoroProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();
  const { updateCard } = useFlowBoardStore();
  const [state, setState] = useState<PomodoroState>(INITIAL_STATE);
  const tickingRef = useRef<number | null>(null);
  const canUsePomodoro = user.panel === "admin" || user.panel === "colaborador";

  const stopTicker = useCallback(() => {
    if (tickingRef.current) {
      window.clearInterval(tickingRef.current);
      tickingRef.current = null;
    }
  }, []);

  const setTask = useCallback((taskId: string) => {
    setState((current) => {
      const selectedTask =
        current.tasks.find((task) => task.id === taskId) ??
        current.tasks.find((task) => task.id === "custom") ??
        DEFAULT_POMODORO_TASKS[0];

      return buildTaskState(current, selectedTask);
    });
  }, []);

  const setFocusSeconds = useCallback((value: number) => {
    const safeValue = Math.max(5 * 60, Math.min(8 * 60 * 60, value));

    setState((current) => {
      const nextTasks = current.tasks.map((task) =>
        task.id === current.taskId
          ? {
              ...task,
              focusSeconds: safeValue,
            }
          : task,
      );

      const selectedTask =
        nextTasks.find((task) => task.id === current.taskId) ??
        nextTasks.find((task) => task.id === "custom") ??
        DEFAULT_POMODORO_TASKS[0];

      return buildTaskState(current, selectedTask, nextTasks);
    });
  }, []);

  const addCustomTask = useCallback((payload: { label: string; minutes: number }) => {
    const label = payload.label.trim();
    const minutes = Math.max(5, Math.min(8 * 60, payload.minutes));

    if (!label) {
      return;
    }

    setState((current) => {
      const taskId = `custom-${crypto.randomUUID().slice(0, 8)}`;
      const totalSeconds = minutes * 60;
      const nextTask: PomodoroTaskDefinition = {
        id: taskId,
        label,
        subtitle: "Tarefa criada manualmente no pomodoro.",
        focusSeconds: totalSeconds,
      };
      const nextTasks = [...current.tasks, nextTask];

      return buildTaskState(current, nextTask, nextTasks);
    });
  }, []);

  const openForCard = useCallback(
    (payload: PomodoroLinkedCard) => {
      if (!canUsePomodoro) {
        return;
      }

      setState((current) => {
        const availableTasks = current.tasks.length > 0 ? current.tasks : DEFAULT_POMODORO_TASKS;
        const inferredTaskId = inferPomodoroTaskId(payload.labels, payload.cardTitle);
        const selectedTask =
          availableTasks.find((task) => task.id === inferredTaskId) ??
          availableTasks.find((task) => task.id === "custom") ??
          DEFAULT_POMODORO_TASKS[0];

        return {
          ...buildTaskState(current, selectedTask, availableTasks),
          open: true,
          linkedCard: payload,
        };
      });
    },
    [canUsePomodoro],
  );

  const close = useCallback(() => {
    setState((current) => ({ ...current, open: false }));
  }, []);

  const isLinkedToCard = useCallback(
    (cardId: string) => state.open && state.linkedCard?.cardId === cardId,
    [state.linkedCard, state.open],
  );

  const start = useCallback(() => {
    setState((current) => {
      if (current.awaitingBreakDecision || current.completionPrompt || current.remainingSeconds <= 0) {
        return current;
      }

      return {
        ...current,
        status: "running",
      };
    });
  }, []);

  const pause = useCallback(() => {
    setState((current) => ({ ...current, status: "paused" }));
  }, []);

  const reset = useCallback(() => {
    setState((current) => {
      const selectedTask =
        current.tasks.find((task) => task.id === current.taskId) ??
        current.tasks.find((task) => task.id === "custom") ??
        DEFAULT_POMODORO_TASKS[0];

      return buildTaskState(current, selectedTask);
    });
  }, []);

  const startBreak = useCallback(() => {
    setState((current) => {
      if (!current.awaitingBreakDecision || current.taskRemainingSeconds <= 0) {
        return current;
      }

      return {
        ...current,
        mode: "break",
        status: "running",
        segmentSeconds: current.breakSeconds,
        remainingSeconds: current.breakSeconds,
        awaitingBreakDecision: false,
      };
    });
  }, []);

  const continueWithoutBreak = useCallback(() => {
    setState((current) => {
      if ((!current.awaitingBreakDecision && !current.completionPrompt) || current.taskRemainingSeconds <= 0) {
        return current;
      }

      const nextChunk = getNextFocusChunk(current.taskRemainingSeconds);

      return {
        ...current,
        mode: "focus",
        status: "running",
        segmentSeconds: nextChunk,
        remainingSeconds: nextChunk,
        awaitingBreakDecision: false,
        completionPrompt: false,
      };
    });
  }, []);

  const confirmTaskFinished = useCallback(() => {
    setState((current) => {
      if (!current.linkedCard) {
        return current;
      }

      updateCard(
        current.linkedCard.boardId,
        current.linkedCard.listId,
        current.linkedCard.cardId,
        { completed: true },
        "Voce concluiu esta demanda pelo Pomodoro",
      );

      return {
        ...current,
        completionPrompt: false,
        status: "idle",
        open: false,
      };
    });
  }, [updateCard]);

  const continueTaskAfterPrompt = useCallback(() => {
    setState((current) => {
      if (!current.completionPrompt) {
        return current;
      }

      const extraSeconds = POMODORO_FOCUS_FLOW_SECONDS;

      return {
        ...current,
        mode: "focus",
        status: "running",
        focusSeconds: current.focusSeconds + extraSeconds,
        taskRemainingSeconds: extraSeconds,
        segmentSeconds: extraSeconds,
        remainingSeconds: extraSeconds,
        completionPrompt: false,
      };
    });
  }, []);

  const skip = useCallback(() => {
    setState((current) => {
      if (current.completionPrompt) {
        return current;
      }

      if (current.awaitingBreakDecision) {
        const nextChunk = getNextFocusChunk(current.taskRemainingSeconds);
        return {
          ...current,
          mode: "focus",
          status: "running",
          segmentSeconds: nextChunk,
          remainingSeconds: nextChunk,
          awaitingBreakDecision: false,
        };
      }

      if (current.mode === "break") {
        const nextChunk = getNextFocusChunk(current.taskRemainingSeconds);
        return {
          ...current,
          mode: "focus",
          status: current.autoRestartFocus ? "running" : "idle",
          segmentSeconds: nextChunk,
          remainingSeconds: nextChunk,
        };
      }

      const remainingAfterChunk = Math.max(0, current.taskRemainingSeconds - current.segmentSeconds);

      if (remainingAfterChunk <= 0) {
        return {
          ...current,
          taskRemainingSeconds: 0,
          remainingSeconds: 0,
          status: "paused",
          completedSessions: current.completedSessions + 1,
          completionPrompt: true,
          awaitingBreakDecision: false,
        };
      }

      return {
        ...current,
        taskRemainingSeconds: remainingAfterChunk,
        remainingSeconds: 0,
        status: "paused",
        completedSessions: current.completedSessions + 1,
        completionPrompt: false,
        awaitingBreakDecision: true,
      };
    });
  }, []);

  const setBreakSeconds = useCallback((value: number) => {
    setState((current) => ({
      ...current,
      breakSeconds: value,
      segmentSeconds:
        current.mode === "break" && current.status !== "running" ? value : current.segmentSeconds,
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
          const remainingAfterChunk = Math.max(0, current.taskRemainingSeconds - current.segmentSeconds);
          const completedSessions = current.completedSessions + 1;

          if (remainingAfterChunk <= 0) {
            return {
              ...current,
              status: "paused",
              taskRemainingSeconds: 0,
              remainingSeconds: 0,
              completedSessions,
              completionPrompt: true,
              awaitingBreakDecision: false,
            };
          }

          return {
            ...current,
            status: "paused",
            taskRemainingSeconds: remainingAfterChunk,
            remainingSeconds: 0,
            completedSessions,
            completionPrompt: false,
            awaitingBreakDecision: true,
          };
        }

        const nextChunk = getNextFocusChunk(current.taskRemainingSeconds);

        return {
          ...current,
          mode: "focus",
          status: current.autoRestartFocus ? "running" : "idle",
          segmentSeconds: nextChunk,
          remainingSeconds: nextChunk,
          awaitingBreakDecision: false,
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
      isLinkedToCard,
      start,
      pause,
      reset,
      skip,
      startBreak,
      continueWithoutBreak,
      confirmTaskFinished,
      continueTaskAfterPrompt,
      setBreakSeconds,
      setTask,
      setFocusSeconds,
      addCustomTask,
      setAutoRestartFocus,
      setPosition,
    }),
    [
      state,
      canUsePomodoro,
      openForCard,
      close,
      isLinkedToCard,
      start,
      pause,
      reset,
      skip,
      startBreak,
      continueWithoutBreak,
      confirmTaskFinished,
      continueTaskAfterPrompt,
      setBreakSeconds,
      setTask,
      setFocusSeconds,
      addCustomTask,
      setAutoRestartFocus,
      setPosition,
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
