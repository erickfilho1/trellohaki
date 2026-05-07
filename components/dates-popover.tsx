"use client";

import { useMemo, useState } from "react";
import { CaretLeft, CaretRight, Check, X } from "@phosphor-icons/react";
import { DATE_RECURRENT_OPTIONS, DATE_REMINDERS } from "@/lib/flowboard-constants";
import { formatDateInput } from "@/lib/flowboard-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CardDatesRecord } from "@/lib/flowboard-types";
import { cn } from "@/lib/utils";

const weekDays = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}

function buildMonthGrid(baseDate: Date) {
  const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const start = new Date(monthStart);
  start.setDate(start.getDate() - monthStart.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function mergeDateAndTime(dateString: string, timeString: string) {
  if (!dateString) {
    return undefined;
  }

  const time = timeString || "09:00";
  return new Date(`${dateString}T${time}:00`).toISOString();
}

function isSameDay(a?: string, b?: string) {
  return Boolean(a && b && a === b);
}

function inRange(dayValue: string, start?: string, end?: string) {
  if (!start || !end) {
    return false;
  }

  return dayValue > start && dayValue < end;
}

export function DatesPopover({
  dates,
  onSave,
  onRemove,
  onClose,
}: {
  dates: CardDatesRecord;
  onSave: (dates: CardDatesRecord) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(
    dates.dueDate ? new Date(dates.dueDate) : new Date("2026-05-05T12:00:00"),
  );
  const [startDate, setStartDate] = useState(formatDateInput(dates.startDate).slice(0, 10));
  const [dueDate, setDueDate] = useState(formatDateInput(dates.dueDate).slice(0, 10));
  const [hasStartDate, setHasStartDate] = useState(Boolean(dates.startDate));
  const [hasDueDate, setHasDueDate] = useState(Boolean(dates.dueDate));
  const [activeField, setActiveField] = useState<"start" | "due">(
    dates.startDate && !dates.dueDate ? "start" : "due",
  );
  const [time, setTime] = useState(formatDateInput(dates.dueDate).slice(11, 16) || "02:55");
  const [recurring, setRecurring] = useState(dates.recurring || "Nunca");
  const [reminder, setReminder] = useState(dates.reminder || "1 dia antes");

  const days = useMemo(() => buildMonthGrid(currentMonth), [currentMonth]);

  function handlePickDay(date: Date) {
    const value = date.toISOString().slice(0, 10);

    if (activeField === "start") {
      setHasStartDate(true);
      if (hasDueDate && dueDate && value > dueDate) {
        setStartDate(dueDate);
        setDueDate(value);
      } else {
        setStartDate(value);
      }
      setActiveField("due");
      return;
    }

    setHasDueDate(true);
    if (hasStartDate && startDate && value < startDate) {
      setDueDate(startDate);
      setStartDate(value);
    } else {
      setDueDate(value);
    }
  }

  function saveDates() {
    onSave({
      startDate: hasStartDate ? mergeDateAndTime(startDate, time) : undefined,
      dueDate: hasDueDate ? mergeDateAndTime(dueDate, time) : undefined,
      recurring,
      reminder,
    });
    onClose();
  }

  return (
    <div className="flowboard-scrollbar max-h-[min(78vh,760px)] w-[360px] overflow-y-auto rounded-[1.6rem] border border-white/10 bg-[#2a2c31] p-4 shadow-[0_24px_60px_-26px_rgba(0,0,0,0.95)]">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium tracking-[-0.03em] text-white">Datas</h3>
        <button
          type="button"
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-[0.9rem] border border-[#88adff] text-[#d8e5ff] transition-colors hover:bg-white/6"
        >
          <X size={18} />
        </button>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
              className="flex size-8 items-center justify-center rounded-lg text-[#cad2e6] hover:bg-white/6"
            >
              <CaretLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
              className="flex size-8 items-center justify-center rounded-lg text-[#cad2e6] hover:bg-white/6"
            >
              <CaretLeft size={13} />
            </button>
          </div>

          <p className="text-[1.05rem] font-medium text-white capitalize">{monthLabel(currentMonth)}</p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
              className="flex size-8 items-center justify-center rounded-lg text-[#cad2e6] hover:bg-white/6"
            >
              <CaretRight size={13} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
              className="flex size-8 items-center justify-center rounded-lg text-[#cad2e6] hover:bg-white/6"
            >
              <CaretRight size={16} />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-y-1 text-center text-sm text-[#b0b8cb]">
          {weekDays.map((day) => (
            <span key={day} className="text-xs uppercase tracking-[0.08em]">
              {day}
            </span>
          ))}
          {days.map((day) => {
            const dayValue = day.toISOString().slice(0, 10);
            const inMonth = day.getMonth() === currentMonth.getMonth();
            const isStart = hasStartDate && isSameDay(dayValue, startDate);
            const isEnd = hasDueDate && isSameDay(dayValue, dueDate);
            const isBetween = hasStartDate && hasDueDate && inRange(dayValue, startDate, dueDate);
            const sameBoundary = isStart && isEnd;

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "relative flex h-10 items-center justify-center",
                  isBetween || sameBoundary ? "bg-white/8" : "",
                  isStart && !sameBoundary ? "rounded-l-xl" : "",
                  isEnd && !sameBoundary ? "rounded-r-xl" : "",
                )}
              >
                <button
                  type="button"
                  onClick={() => handlePickDay(day)}
                className={cn(
                  "relative z-[1] mx-auto flex size-9 items-center justify-center rounded-lg border text-sm transition-colors",
                  isStart || isEnd
                    ? "border-[#9bc0ff] bg-[#1e4b87] text-white"
                    : isBetween
                      ? "border-transparent bg-transparent text-[#eef3ff]"
                      : inMonth
                        ? "border-transparent text-[#d9deea] hover:bg-white/6"
                        : "border-transparent text-[#697389]",
                  sameBoundary ? "rounded-lg" : "",
                  activeField === "start" && isStart ? "shadow-[0_0_0_1px_rgba(155,192,255,0.45)]" : "",
                  activeField === "due" && isEnd ? "shadow-[0_0_0_1px_rgba(155,192,255,0.45)]" : "",
                )}
              >
                {day.getDate()}
              </button>
            </div>
          );
          })}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-[#d9e0ee]">Data de inicio</label>
          <div className="grid grid-cols-[24px_minmax(0,1fr)] items-center gap-3">
            <button
              type="button"
              data-testid="toggle-start-date"
              onClick={() => {
                setHasStartDate((current) => !current);
                setActiveField("start");
                if (!hasStartDate && !startDate) {
                  setStartDate(dueDate || new Date().toISOString().slice(0, 10));
                }
              }}
              className={cn(
                "flex size-5 items-center justify-center rounded-[0.35rem] border transition-colors",
                hasStartDate
                  ? "border-[#8cb3ff] bg-[#6f97f2] text-[#111b32]"
                  : "border-white/18 bg-transparent text-transparent hover:bg-white/5",
              )}
            >
              <Check size={12} weight="bold" />
            </button>
            <Input
              type="date"
              value={startDate}
              disabled={!hasStartDate}
              onFocus={() => setActiveField("start")}
              onChange={(event) => {
                setHasStartDate(true);
                setStartDate(event.target.value);
              }}
              className="h-11 rounded-[1rem] border-white/10 bg-[#1f2229] text-white disabled:cursor-not-allowed disabled:opacity-45"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-[#d9e0ee]">Data de entrega</label>
          <div className="grid grid-cols-[24px_minmax(0,1fr)] items-center gap-3">
            <button
              type="button"
              data-testid="toggle-due-date"
              onClick={() => {
                setHasDueDate((current) => !current);
                setActiveField("due");
                if (!hasDueDate && !dueDate) {
                  setDueDate(startDate || new Date().toISOString().slice(0, 10));
                }
              }}
              className={cn(
                "flex size-5 items-center justify-center rounded-[0.35rem] border transition-colors",
                hasDueDate
                  ? "border-[#8cb3ff] bg-[#6f97f2] text-[#111b32]"
                  : "border-white/18 bg-transparent text-transparent hover:bg-white/5",
              )}
            >
              <Check size={12} weight="bold" />
            </button>
            <div className="grid grid-cols-[1fr_110px] gap-2">
            <Input
              type="date"
              value={dueDate}
              disabled={!hasDueDate}
              onFocus={() => setActiveField("due")}
              onChange={(event) => {
                setHasDueDate(true);
                setDueDate(event.target.value);
              }}
              className="h-11 rounded-[1rem] border-white/10 bg-[#1f2229] text-white disabled:cursor-not-allowed disabled:opacity-45"
            />
            <Input
              type="time"
              value={time}
              disabled={!hasDueDate}
              onChange={(event) => setTime(event.target.value)}
              className="h-11 rounded-[1rem] border-white/10 bg-[#1f2229] text-white disabled:cursor-not-allowed disabled:opacity-45"
            />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-[#d9e0ee]">Recorrente</label>
          <select
            value={recurring}
            onChange={(event) => setRecurring(event.target.value)}
            className="h-11 w-full rounded-[1rem] border border-white/10 bg-[#1f2229] px-3 text-white outline-none"
          >
            {DATE_RECURRENT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-[#d9e0ee]">Definir lembrete</label>
          <select
            value={reminder}
            onChange={(event) => setReminder(event.target.value)}
            className="h-11 w-full rounded-[1rem] border border-white/10 bg-[#1f2229] px-3 text-white outline-none"
          >
            {DATE_REMINDERS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={saveDates}
            className="h-11 rounded-[1rem] border border-white/10 bg-[#4f79ff] text-white hover:bg-[#6388ff]"
          >
            Salvar
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onRemove();
              onClose();
            }}
            className="h-11 rounded-[1rem] border-white/10 bg-white/4 text-white hover:bg-white/8"
          >
            Remover
          </Button>
        </div>
      </div>
    </div>
  );
}
