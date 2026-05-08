"use client";

import type { ReactNode, RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarBlank,
  CaretDown,
  CheckCircle,
  Clock,
  Tag,
  UserCircle,
  X,
} from "@phosphor-icons/react";
import { LabelBadge } from "@/components/label-badge";
import { FloatingPanel } from "@/components/floating-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BoardFiltersRecord, BoardRecord, LabelRecord, MemberRecord } from "@/lib/flowboard-types";
import { cn } from "@/lib/utils";

function ToggleRow({
  checked,
  label,
  icon,
  onChange,
}: {
  checked: boolean;
  label: string;
  icon?: ReactNode;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-[1rem] border border-transparent px-2 py-2 transition-colors hover:bg-white/4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-5 rounded border-white/20 bg-transparent accent-[#7ea5ff]"
      />
      {icon ? <span className="text-[#9da8c0]">{icon}</span> : null}
      <span className="text-[1rem] text-[#d8deec]">{label}</span>
    </label>
  );
}

function SelectorSection({
  title,
  placeholder,
  options,
  selectedIds,
  onToggle,
}: {
  title: string;
  placeholder: string;
  options: Array<{ id: string; label: React.ReactNode }>;
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-12 w-full items-center justify-between rounded-[1rem] border border-white/10 bg-white/3 px-4 text-left text-[#d8deec] transition-colors hover:bg-white/6"
      >
        <span>{selectedIds.length > 0 ? `${selectedIds.length} selecionado(s)` : placeholder}</span>
        <CaretDown size={16} className={cn("transition-transform", open ? "rotate-180" : "")} />
      </button>

      {open ? (
        <div className="space-y-2 rounded-[1rem] border border-white/8 bg-[#23262d] p-3">
          <p className="text-xs tracking-[0.18em] text-[#7f8bad] uppercase">{title}</p>
          {options.map((option) => (
            <label key={option.id} className="flex cursor-pointer items-center gap-3 rounded-[0.95rem] px-2 py-2 hover:bg-white/4">
              <input
                type="checkbox"
                checked={selectedIds.includes(option.id)}
                onChange={() => onToggle(option.id)}
                className="size-5 rounded border-white/20 bg-transparent accent-[#7ea5ff]"
              />
              <div className="min-w-0 flex-1">{option.label}</div>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function FilterPanel({
  board,
  filters,
  filteredCount,
  totalCount,
  open,
  anchorRef,
  onClose,
  onUpdateFilters,
  onClearFilters,
}: {
  board: BoardRecord;
  filters: BoardFiltersRecord;
  filteredCount: number;
  totalCount: number;
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onUpdateFilters: (updates: Partial<BoardFiltersRecord>) => void;
  onClearFilters: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const members = board.members;
  const labels = board.labelCatalog;

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    function handlePointer(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) {
        return;
      }
      onClose();
    }

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handlePointer);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handlePointer);
    };
  }, [anchorRef, onClose, open]);

  const memberOptions = useMemo(
    () =>
      members.map((member: MemberRecord) => ({
        id: member.id,
        label: (
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-white/10 bg-[#2b3550] px-2 py-1 text-xs text-white">
              {member.initials}
            </span>
            <div>
              <p className="text-sm text-white">{member.name}</p>
              <p className="text-xs text-[#8791a8]">{member.handle}</p>
            </div>
          </div>
        ),
      })),
    [members],
  );

  const labelOptions = useMemo(
    () =>
      labels.map((label: LabelRecord) => ({
        id: label.id,
        label: <LabelBadge label={label} />,
      })),
    [labels],
  );

  if (!open) {
    return null;
  }

  return (
    <FloatingPanel
      anchorRef={anchorRef}
      open={open}
      align="end"
      placement="bottom"
      offset={14}
      estimatedWidth={420}
      estimatedHeight={820}
      className="z-[90] w-[min(420px,calc(100vw-1rem))] max-h-[var(--floating-panel-max-height)]"
    >
      <aside
        ref={panelRef}
        className="pointer-events-auto flex max-h-[var(--floating-panel-max-height)] w-[min(420px,calc(100vw-1rem))] flex-col overflow-hidden rounded-[1.55rem] border border-white/10 bg-[#2a2c31] shadow-[0_34px_90px_-34px_rgba(0,0,0,0.95)]"
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="flex items-start justify-between border-b border-white/8 px-5 py-4">
            <div>
              <h2 className="text-[1.4rem] font-medium tracking-[-0.04em] text-white">Filtro</h2>
              <p className="mt-1 text-sm text-[#8590a8]">
                {filteredCount === totalCount
                  ? `${totalCount} cards no quadro`
                  : `${filteredCount} de ${totalCount} cards correspondem aos filtros`}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-10 items-center justify-center rounded-[0.95rem] text-[#d2dbef] transition-colors hover:bg-white/6"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flowboard-scrollbar min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-5">
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-[#dce3f2]">Palavra-chave</h3>
              <Input
                value={filters.keyword}
                onChange={(event) => onUpdateFilters({ keyword: event.target.value })}
                placeholder="Insira uma palavra-chave..."
                className="h-12 rounded-[1rem] border-[#7fa4ff] bg-[#1e2128] text-white placeholder:text-[#79849c]"
              />
              <p className="text-sm leading-6 text-[#98a3bb]">
                Pesquise cartoes, membros, etiquetas e muito mais.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-medium text-[#dce3f2]">Membros</h3>
              <ToggleRow
                checked={filters.noMembers}
                label="Sem membros"
                icon={<UserCircle size={18} />}
                onChange={(checked) => onUpdateFilters({ noMembers: checked })}
              />
              <ToggleRow
                checked={filters.assignedToMe}
                label="Cartoes atribuidos a mim"
                icon={<UserCircle size={18} />}
                onChange={(checked) => onUpdateFilters({ assignedToMe: checked })}
              />
              <SelectorSection
                title="Membros"
                placeholder="Selecionar Membros"
                options={memberOptions}
                selectedIds={filters.memberIds}
                onToggle={(id) =>
                  onUpdateFilters({
                    memberIds: filters.memberIds.includes(id)
                      ? filters.memberIds.filter((item) => item !== id)
                      : [...filters.memberIds, id],
                  })
                }
              />
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-medium text-[#dce3f2]">Card status</h3>
              <ToggleRow
                checked={filters.completed}
                label="Marcado como concluido"
                onChange={(checked) => onUpdateFilters({ completed: checked })}
              />
              <ToggleRow
                checked={filters.notCompleted}
                label="Nao marcado como concluido"
                onChange={(checked) => onUpdateFilters({ notCompleted: checked })}
              />
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-medium text-[#dce3f2]">Data de entrega</h3>
              <ToggleRow
                checked={filters.noDueDate}
                label="Sem datas"
                icon={<CalendarBlank size={18} />}
                onChange={(checked) => onUpdateFilters({ noDueDate: checked })}
              />
              <ToggleRow
                checked={filters.overdue}
                label="Em atraso"
                icon={<Clock size={18} />}
                onChange={(checked) => onUpdateFilters({ overdue: checked })}
              />
              <ToggleRow
                checked={filters.dueToday}
                label="Para hoje"
                onChange={(checked) => onUpdateFilters({ dueToday: checked })}
              />
              <ToggleRow
                checked={filters.dueTomorrow}
                label="Para amanha"
                onChange={(checked) => onUpdateFilters({ dueTomorrow: checked })}
              />
              <ToggleRow
                checked={filters.dueThisWeek}
                label="A ser entregue esta semana"
                onChange={(checked) => onUpdateFilters({ dueThisWeek: checked })}
              />
              <ToggleRow
                checked={filters.dueThisMonth}
                label="A ser entregue em um mes"
                onChange={(checked) => onUpdateFilters({ dueThisMonth: checked })}
              />
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-medium text-[#dce3f2]">Etiquetas</h3>
              <ToggleRow
                checked={filters.noLabels}
                label="Sem etiquetas"
                icon={<Tag size={18} />}
                onChange={(checked) => onUpdateFilters({ noLabels: checked })}
              />
              <div className="space-y-2">
                {labels.map((label) => (
                  <label key={label.id} className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={filters.labelIds.includes(label.id)}
                      onChange={() =>
                        onUpdateFilters({
                          labelIds: filters.labelIds.includes(label.id)
                            ? filters.labelIds.filter((item) => item !== label.id)
                            : [...filters.labelIds, label.id],
                        })
                      }
                      className="size-5 rounded border-white/20 bg-transparent accent-[#7ea5ff]"
                    />
                    <div className="flex-1">
                      <LabelBadge label={label} />
                    </div>
                  </label>
                ))}
              </div>
              <SelectorSection
                title="Etiquetas"
                placeholder="Selecionar Etiquetas"
                options={labelOptions}
                selectedIds={filters.labelIds}
                onToggle={(id) =>
                  onUpdateFilters({
                    labelIds: filters.labelIds.includes(id)
                      ? filters.labelIds.filter((item) => item !== id)
                      : [...filters.labelIds, id],
                  })
                }
              />
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-medium text-[#dce3f2]">Atividade</h3>
              <ToggleRow
                checked={filters.activityRange === "week"}
                label="Ativo na semana passada"
                onChange={(checked) =>
                  onUpdateFilters({ activityRange: checked ? "week" : null })
                }
              />
              <ToggleRow
                checked={filters.activityRange === "twoWeeks"}
                label="Ativo nas ultimas duas semanas"
                onChange={(checked) =>
                  onUpdateFilters({ activityRange: checked ? "twoWeeks" : null })
                }
              />
              <ToggleRow
                checked={filters.activityRange === "fourWeeks"}
                label="Ativo nas ultimas quatro semanas"
                onChange={(checked) =>
                  onUpdateFilters({ activityRange: checked ? "fourWeeks" : null })
                }
              />
            </section>
          </div>

          <div className="border-t border-white/8 px-5 py-4">
            <Button
              onClick={onClearFilters}
              variant="outline"
              className="h-11 w-full rounded-[1rem] border-white/10 bg-white/4 text-white hover:bg-white/8"
            >
              <CheckCircle size={16} />
              Limpar filtros
            </Button>
          </div>
        </div>
      </aside>
    </FloatingPanel>
  );
}
