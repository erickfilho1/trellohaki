"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  ArrowClockwise,
  CheckCircle,
  ClockCountdown,
  Coffee,
  Gear,
  Minus,
  Pause,
  Play,
  Plus,
  Timer,
  X,
} from "@phosphor-icons/react";
import { usePomodoro } from "@/components/providers/pomodoro-provider";
import {
  formatPomodoroClock,
  formatPomodoroDuration,
  POMODORO_BREAK_OPTIONS,
  POMODORO_FOCUS_FLOW_SECONDS,
} from "@/lib/pomodoro";
import { cn } from "@/lib/utils";

const RING_RADIUS = 78;
const RING_STROKE = 8;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function PomodoroWidget() {
  const {
    state,
    close,
    pause,
    reset,
    addCustomTask,
    confirmTaskFinished,
    continueTaskAfterPrompt,
    continueWithoutBreak,
    setAutoRestartFocus,
    setBreakSeconds,
    setFocusSeconds,
    setPosition,
    setTask,
    skip,
    start,
    startBreak,
  } = usePomodoro();
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dragFrameRef = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [customTaskLabel, setCustomTaskLabel] = useState("");
  const [customTaskMinutes, setCustomTaskMinutes] = useState("25");

  const totalSeconds = state.mode === "focus" ? state.segmentSeconds : state.breakSeconds;
  const progress = totalSeconds ? 1 - state.remainingSeconds / totalSeconds : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const isRunning = state.status === "running";
  const selectedTask =
    state.tasks.find((task) => task.id === state.taskId) ?? state.tasks.find((task) => task.id === "custom");

  const totalTaskProgress = state.focusSeconds
    ? (state.focusSeconds - state.taskRemainingSeconds) / state.focusSeconds
    : 0;
  const totalCycles = Math.max(1, Math.ceil(state.focusSeconds / POMODORO_FOCUS_FLOW_SECONDS));

  const statusLabel = useMemo(() => {
    if (state.completionPrompt) {
      return "Demanda finalizada?";
    }

    if (state.awaitingBreakDecision) {
      return "Sessao concluida";
    }

    if (state.mode === "break") {
      return "Short break";
    }

    return isRunning ? "Focus ativo" : "Focus session";
  }, [isRunning, state.awaitingBreakDecision, state.completionPrompt, state.mode]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (!dragging) {
        return;
      }

      if (dragFrameRef.current) {
        cancelAnimationFrame(dragFrameRef.current);
      }

      dragFrameRef.current = requestAnimationFrame(() => {
        const width = panelRef.current?.offsetWidth ?? 332;
        const height = panelRef.current?.offsetHeight ?? 620;
        const maxX = Math.max(16, window.innerWidth - width - 16);
        const maxY = Math.max(16, window.innerHeight - height - 16);

        setPosition({
          x: Math.min(Math.max(16, event.clientX - dragOffsetRef.current.x), maxX),
          y: Math.min(Math.max(16, event.clientY - dragOffsetRef.current.y), maxY),
        });
      });
    }

    function handlePointerUp() {
      setDragging(false);
    }

    if (dragging) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    }

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragging, setPosition]);

  if (!state.open || !state.linkedCard) {
    return null;
  }

  function beginDrag(event: ReactPointerEvent<HTMLDivElement>) {
    dragOffsetRef.current = {
      x: event.clientX - state.position.x,
      y: event.clientY - state.position.y,
    };
    setDragging(true);
  }

  function handleCreateTask() {
    const minutes = Number(customTaskMinutes);
    if (!customTaskLabel.trim() || !Number.isFinite(minutes)) {
      return;
    }

    addCustomTask({
      label: customTaskLabel,
      minutes,
    });
    setCustomTaskLabel("");
    setCustomTaskMinutes("25");
  }

  return (
    <div
      className="fixed z-[180] select-none"
      style={{ left: state.position.x, top: state.position.y }}
    >
      <div
        ref={panelRef}
        className={cn(
          "flowboard-scrollbar w-[332px] max-h-[78vh] overflow-y-auto overflow-x-hidden rounded-[1.7rem] border border-white/10 bg-[radial-gradient(circle_at_top,#1a0d0a_0%,#090909_42%,#050505_100%)] text-white shadow-[0_26px_90px_-38px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.03)]",
          dragging ? "cursor-grabbing" : "",
        )}
      >
        <div
          onPointerDown={beginDrag}
          className={cn(
            "relative flex items-center justify-between px-4 pb-1 pt-4",
            dragging ? "cursor-grabbing" : "cursor-grab",
          )}
        >
          <div className="min-w-0">
            <p className="text-[0.64rem] uppercase tracking-[0.26em] text-white/40">
              Tarefa vinculada
            </p>
            <p className="mt-1 pr-3 text-[0.95rem] font-medium leading-[1.28] tracking-[-0.02em] text-white/92">
              {state.linkedCard.cardTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/72 transition hover:bg-white/[0.08] hover:text-white"
            aria-label="Fechar pomodoro"
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative px-4 pb-4 pt-2">
          <div className="pointer-events-none absolute inset-x-6 top-10 h-24 rounded-full bg-[radial-gradient(circle,rgba(255,86,56,0.22),transparent_68%)] blur-[34px]" />

          <div className="relative mx-auto flex h-[188px] w-[188px] items-center justify-center">
            <svg
              width="188"
              height="188"
              viewBox="0 0 188 188"
              className="-rotate-90"
              aria-hidden="true"
            >
              <circle
                cx="94"
                cy="94"
                r={RING_RADIUS}
                stroke="rgba(255,255,255,0.14)"
                strokeWidth={RING_STROKE}
                fill="none"
              />
              <circle
                cx="94"
                cy="94"
                r={RING_RADIUS}
                stroke={state.mode === "focus" ? "#ff4b2b" : "#f4a340"}
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                style={{ transition: "stroke-dashoffset 900ms linear" }}
              />
            </svg>

            <div className="absolute inset-[14px] rounded-full border border-white/8 bg-[linear-gradient(180deg,#090909_0%,#121212_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" />

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <ClockCountdown size={15} className="mb-2 text-white/55" />
              <p className="text-[2.35rem] font-semibold tracking-[-0.06em] text-white">
                {formatPomodoroClock(state.remainingSeconds)}
              </p>
              <p className="mt-1 text-[0.63rem] uppercase tracking-[0.24em] text-white/42">
                {statusLabel}
              </p>
              <div className="mt-3 flex items-center gap-1.5">
                {Array.from({ length: Math.min(totalCycles, 6) }).map((_, index) => (
                  <span
                    key={index}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      index < state.completedSessions ? "w-2.5 bg-[#ff5b44]" : "w-1.5 bg-white/16",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <CircleIconButton
              label="Pular etapa"
              onClick={skip}
              icon={state.mode === "focus" ? <Coffee size={17} /> : <ArrowClockwise size={17} />}
            />

            <button
              type="button"
              onClick={isRunning ? pause : start}
              disabled={state.awaitingBreakDecision || state.completionPrompt}
              className="inline-flex h-10 min-w-[112px] items-center justify-center gap-2 rounded-full border border-white/14 bg-[linear-gradient(180deg,#4c4c4c_0%,#2f2f2f_100%)] px-4 text-[0.8rem] font-medium uppercase tracking-[0.08em] text-white transition hover:brightness-110 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isRunning ? (
                <>
                  <Pause size={15} weight="fill" />
                  Pause
                </>
              ) : (
                <>
                  <Play size={15} weight="fill" />
                  Start
                </>
              )}
            </button>

            <CircleIconButton
              label="Configurações"
              onClick={() => setSettingsOpen((current) => !current)}
              icon={<Gear size={17} />}
              active={settingsOpen}
            />
          </div>

          <div className="mt-4 rounded-[1rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white/42">Preset atual</p>
                <p className="mt-1 pr-2 text-sm font-medium leading-6 text-white">
                  {selectedTask?.label ?? "Personalizado"}
                </p>
              </div>
              <button
                type="button"
                onClick={reset}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[0.78rem] text-white/78 transition hover:bg-white/[0.08] hover:text-white"
              >
                Resetar
              </button>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#ff6948_0%,#ffb05f_100%)] transition-[width] duration-300"
                style={{ width: `${Math.max(4, totalTaskProgress * 100)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[0.72rem] text-white/45">
              <span>{formatPomodoroDuration(state.taskRemainingSeconds)} restantes</span>
              <span>
                {state.completedSessions}/{totalCycles} ciclos
              </span>
            </div>
          </div>

          {state.awaitingBreakDecision ? (
            <div className="mt-4 rounded-[1.2rem] border border-[#ff8c63]/22 bg-[#1a120f] p-3.5">
              <p className="text-sm font-medium text-white">Sessao de foco concluida</p>
              <p className="mt-1 text-xs leading-5 text-white/52">
                Escolha se quer entrar no descanso de {formatPomodoroDuration(state.breakSeconds)} ou seguir direto.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={startBreak}
                  className="rounded-[0.95rem] border border-[#ff8c63]/28 bg-[#2c1812] px-3 py-2.5 text-sm font-medium text-white transition hover:bg-[#361d15]"
                >
                  Comecar descanso
                </button>
                <button
                  type="button"
                  onClick={continueWithoutBreak}
                  className="rounded-[0.95rem] border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm font-medium text-white/84 transition hover:bg-white/[0.08] hover:text-white"
                >
                  Continuar sem pausa
                </button>
              </div>
            </div>
          ) : null}

          {state.completionPrompt ? (
            <div className="mt-4 rounded-[1.2rem] border border-[#6ed093]/20 bg-[#111814] p-3.5">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#6ed093]/12 text-[#9ce0b6]">
                  <CheckCircle size={17} weight="fill" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">O tempo total terminou</p>
                  <p className="mt-1 text-xs leading-5 text-white/54">
                    Essa demanda foi finalizada? Se sim, o card recebe o check automaticamente.
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={confirmTaskFinished}
                  className="rounded-[0.95rem] border border-[#7ad79c]/28 bg-[#183123] px-3 py-2.5 text-sm font-medium text-[#e8fbef] transition hover:bg-[#1d3b2b]"
                >
                  Finalizei a demanda
                </button>
                <button
                  type="button"
                  onClick={continueTaskAfterPrompt}
                  className="rounded-[0.95rem] border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm font-medium text-white/84 transition hover:bg-white/[0.08] hover:text-white"
                >
                  Preciso de mais 25 min
                </button>
              </div>
            </div>
          ) : null}

          {settingsOpen ? (
            <div className="mt-4 space-y-4 rounded-[1.2rem] border border-white/10 bg-[#0b0b0b]/94 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div>
                <p className="text-[0.66rem] uppercase tracking-[0.22em] text-white/42">Tarefas padrao</p>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  {state.tasks.map((task) => {
                    const active = state.taskId === task.id;
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => setTask(task.id)}
                        className={cn(
                          "min-h-[92px] rounded-[0.95rem] border px-3 py-3 text-left transition-colors",
                          active
                            ? "border-[#ff7c63]/34 bg-[#2a1512] text-white"
                            : "border-white/8 bg-white/[0.03] text-white/72 hover:bg-white/[0.06] hover:text-white",
                        )}
                      >
                        <p className="text-sm font-medium leading-5 break-words">{task.label}</p>
                        <p className="mt-1 text-[0.72rem] leading-5 text-white/44">
                          {formatPomodoroDuration(task.focusSeconds)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[0.95rem] border border-white/8 bg-white/[0.02] p-3">
                <p className="text-[0.66rem] uppercase tracking-[0.22em] text-white/42">
                  Personalizar tempo
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setFocusSeconds(state.focusSeconds - 5 * 60)}
                    className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/78 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    <Minus size={15} />
                  </button>
                  <div className="min-w-0 flex-1 text-center">
                    <p className="text-[1.15rem] font-semibold tracking-[-0.04em] text-white">
                      {formatPomodoroDuration(state.focusSeconds)}
                    </p>
                    <p className="mt-1 text-[0.72rem] text-white/44">Tempo total da tarefa</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFocusSeconds(state.focusSeconds + 5 * 60)}
                    className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/78 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              <div className="rounded-[0.95rem] border border-white/8 bg-white/[0.02] p-3">
                <p className="text-[0.66rem] uppercase tracking-[0.22em] text-white/42">
                  Nova tarefa
                </p>
                <div className="mt-3 space-y-2.5">
                  <input
                    value={customTaskLabel}
                    onChange={(event) => setCustomTaskLabel(event.target.value)}
                    placeholder="Ex.: Revisao final"
                    className="h-10 w-full rounded-[0.9rem] border border-white/10 bg-white/[0.03] px-3.5 text-sm text-white outline-none placeholder:text-white/28"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      value={customTaskMinutes}
                      onChange={(event) => setCustomTaskMinutes(event.target.value.replace(/[^\d]/g, ""))}
                      placeholder="25"
                      className="h-10 min-w-0 flex-1 rounded-[0.9rem] border border-white/10 bg-white/[0.03] px-3.5 text-sm text-white outline-none placeholder:text-white/28"
                    />
                    <span className="text-sm text-white/48">min</span>
                    <button
                      type="button"
                      onClick={handleCreateTask}
                      className="h-10 rounded-[0.9rem] border border-[#ff7b60]/26 bg-[#2f1712] px-4 text-sm font-medium text-white transition hover:bg-[#3b1d16]"
                    >
                      Criar
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[0.66rem] uppercase tracking-[0.22em] text-white/42">Descanso padrao</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {POMODORO_BREAK_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setBreakSeconds(option.value)}
                      className={cn(
                        "rounded-full border px-3 py-2 text-sm transition-colors",
                        state.breakSeconds === option.value
                          ? "border-[#ff8d62]/38 bg-[#311810] text-white"
                          : "border-white/8 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAutoRestartFocus(!state.autoRestartFocus)}
                className={cn(
                  "flex w-full items-center justify-between rounded-[0.95rem] border px-3 py-3 text-left transition-colors",
                  state.autoRestartFocus
                    ? "border-[#ff765e]/28 bg-[#241311] text-white"
                    : "border-white/8 bg-white/[0.03] text-white/72 hover:bg-white/[0.06] hover:text-white",
                )}
              >
                <div>
                  <p className="text-sm font-medium">Retomar foco sozinho</p>
                  <p className="mt-1 text-[0.72rem] leading-5 text-white/44">
                    Depois do descanso, o proximo ciclo volta automaticamente.
                  </p>
                </div>
                <span className="text-[0.65rem] uppercase tracking-[0.18em]">
                  {state.autoRestartFocus ? "ON" : "OFF"}
                </span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CircleIconButton({
  icon,
  label,
  onClick,
  active = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex size-10 items-center justify-center rounded-full border transition",
        active
          ? "border-[#ff8466]/32 bg-[#26130f] text-white"
          : "border-white/10 bg-white/[0.03] text-white/72 hover:bg-white/[0.08] hover:text-white",
      )}
    >
      {icon}
    </button>
  );
}
