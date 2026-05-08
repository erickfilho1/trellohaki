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
  ClockCountdown,
  Coffee,
  Gear,
  Pause,
  Play,
  X,
} from "@phosphor-icons/react";
import { usePomodoro } from "@/components/providers/pomodoro-provider";
import {
  formatPomodoroClock,
  POMODORO_BREAK_OPTIONS,
  POMODORO_PRESETS,
  type PomodoroTaskPreset,
} from "@/lib/pomodoro";
import { cn } from "@/lib/utils";

const RING_RADIUS = 108;
const RING_STROKE = 10;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function PomodoroWidget() {
  const {
    state,
    close,
    pause,
    reset,
    setAutoRestartFocus,
    setBreakSeconds,
    setPosition,
    setPreset,
    skip,
    start,
  } = usePomodoro();
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dragFrameRef = useRef<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  const totalSeconds = state.mode === "focus" ? state.focusSeconds : state.breakSeconds;
  const progress = totalSeconds ? 1 - state.remainingSeconds / totalSeconds : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const statusLabel = useMemo(() => {
    if (state.mode === "break") {
      return "Short break";
    }

    return state.status === "running" ? "Focus ativo" : "Focus session";
  }, [state.mode, state.status]);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (!dragging) {
        return;
      }

      if (dragFrameRef.current) {
        cancelAnimationFrame(dragFrameRef.current);
      }

      dragFrameRef.current = requestAnimationFrame(() => {
        const maxX = Math.max(24, window.innerWidth - 332);
        const maxY = Math.max(24, window.innerHeight - 376);
        setPosition({
          x: Math.min(Math.max(20, event.clientX - dragOffsetRef.current.x), maxX),
          y: Math.min(Math.max(20, event.clientY - dragOffsetRef.current.y), maxY),
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

  const isRunning = state.status === "running";

  function beginDrag(event: ReactPointerEvent<HTMLDivElement>) {
    dragOffsetRef.current = {
      x: event.clientX - state.position.x,
      y: event.clientY - state.position.y,
    };
    setDragging(true);
  }

  return (
    <div
      className="fixed z-[180] select-none"
      style={{ left: state.position.x, top: state.position.y }}
    >
      <div
        className={cn(
          "w-[312px] overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,#1a0d0a_0%,#090909_42%,#050505_100%)] text-white shadow-[0_26px_90px_-38px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.03)]",
          dragging ? "cursor-grabbing" : "cursor-grab",
        )}
      >
        <div
          onPointerDown={beginDrag}
          className="relative flex items-center justify-between px-4 pb-1 pt-4"
        >
          <div className="min-w-0">
            <p className="text-[0.68rem] uppercase tracking-[0.24em] text-white/42">
              Tarefa vinculada
            </p>
            <p className="mt-1 truncate text-[0.95rem] font-medium tracking-[-0.02em] text-white/90">
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

        <div className="relative px-6 pb-6 pt-2">
          <div className="pointer-events-none absolute inset-x-8 top-12 h-36 rounded-full bg-[radial-gradient(circle,rgba(255,86,56,0.28),transparent_68%)] blur-[44px]" />

          <div className="relative mx-auto flex h-[246px] w-[246px] items-center justify-center">
            <svg
              width="246"
              height="246"
              viewBox="0 0 246 246"
              className="-rotate-90"
              aria-hidden="true"
            >
              <circle
                cx="123"
                cy="123"
                r={RING_RADIUS}
                stroke="rgba(255,255,255,0.14)"
                strokeWidth={RING_STROKE}
                fill="none"
              />
              <circle
                cx="123"
                cy="123"
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

            <div className="absolute inset-[18px] rounded-full border border-white/8 bg-[linear-gradient(180deg,#090909_0%,#121212_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" />

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <ClockCountdown size={18} className="mb-3 text-white/55" />
              <p className="text-[3rem] font-semibold tracking-[-0.06em] text-white">
                {formatPomodoroClock(state.remainingSeconds)}
              </p>
              <p className="mt-1 text-[0.72rem] uppercase tracking-[0.24em] text-white/42">
                {statusLabel}
              </p>
              <div className="mt-3 flex items-center gap-1.5">
                {[0, 1, 2, 3].map((index) => (
                  <span
                    key={index}
                    className={cn(
                      "h-2.5 rounded-full transition-all",
                      index < Math.max(1, Math.min(4, state.completedSessions % 5 || 1))
                        ? "w-2.5 bg-[#ff5b44]"
                        : "w-1.5 bg-white/16",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-1 flex items-center justify-between gap-3">
            <CircleIconButton
              label="Pular etapa"
              onClick={skip}
              icon={state.mode === "focus" ? <Coffee size={18} /> : <ArrowClockwise size={18} />}
            />

            <button
              type="button"
              onClick={isRunning ? pause : start}
              className="inline-flex h-12 min-w-[126px] items-center justify-center rounded-full border border-white/14 bg-[linear-gradient(180deg,#4c4c4c_0%,#2f2f2f_100%)] px-6 text-[0.92rem] font-medium uppercase tracking-[0.08em] text-white transition hover:brightness-110 active:translate-y-px"
            >
              {isRunning ? (
                <>
                  <Pause size={16} weight="fill" />
                  Pause
                </>
              ) : (
                <>
                  <Play size={16} weight="fill" />
                  Start
                </>
              )}
            </button>

            <CircleIconButton
              label="Configurações"
              onClick={() => setSettingsOpen((current) => !current)}
              icon={<Gear size={18} />}
              active={settingsOpen}
            />
          </div>

          <div className="mt-4 flex items-center justify-between rounded-[1rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm">
            <div>
              <p className="text-white/42">Preset atual</p>
              <p className="mt-1 font-medium text-white">{POMODORO_PRESETS[state.preset].label}</p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-white/78 transition hover:bg-white/[0.08] hover:text-white"
            >
              Resetar
            </button>
          </div>

          {settingsOpen ? (
            <div className="mt-4 space-y-4 rounded-[1.3rem] border border-white/10 bg-[#0b0b0b]/94 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div>
                <p className="text-[0.7rem] uppercase tracking-[0.22em] text-white/42">Duração padrão</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(Object.keys(POMODORO_PRESETS) as PomodoroTaskPreset[]).map((presetKey) => {
                    const preset = POMODORO_PRESETS[presetKey];
                    const active = state.preset === presetKey;
                    return (
                      <button
                        key={presetKey}
                        type="button"
                        onClick={() => setPreset(presetKey)}
                        className={cn(
                          "rounded-[1rem] border px-3 py-3 text-left transition-colors",
                          active
                            ? "border-[#ff7c63]/34 bg-[#2a1512] text-white"
                            : "border-white/8 bg-white/[0.03] text-white/72 hover:bg-white/[0.06] hover:text-white",
                        )}
                      >
                        <p className="text-sm font-medium">{preset.label}</p>
                        <p className="mt-1 text-xs leading-5 text-white/44">
                          {formatPomodoroClock(preset.focusSeconds)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[0.7rem] uppercase tracking-[0.22em] text-white/42">Break automático</p>
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
                  "flex w-full items-center justify-between rounded-[1rem] border px-3 py-3 text-left transition-colors",
                  state.autoRestartFocus
                    ? "border-[#ff765e]/28 bg-[#241311] text-white"
                    : "border-white/8 bg-white/[0.03] text-white/72 hover:bg-white/[0.06] hover:text-white",
                )}
              >
                <div>
                  <p className="text-sm font-medium">Reiniciar foco sozinho</p>
                  <p className="mt-1 text-xs leading-5 text-white/44">
                    Ao terminar o break, a próxima sessão volta automaticamente.
                  </p>
                </div>
                <span className="text-xs uppercase tracking-[0.18em]">
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
        "flex size-11 items-center justify-center rounded-full border transition",
        active
          ? "border-[#ff8466]/32 bg-[#26130f] text-white"
          : "border-white/10 bg-white/[0.03] text-white/72 hover:bg-white/[0.08] hover:text-white",
      )}
    >
      {icon}
    </button>
  );
}
