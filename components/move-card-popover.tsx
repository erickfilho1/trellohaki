"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { CaretDown, Check, X } from "@phosphor-icons/react";
import { FloatingPanel } from "@/components/floating-panel";
import { cn } from "@/lib/utils";
import type { BoardRecord, CardRecord, ListRecord } from "@/lib/flowboard-types";

function StaticField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[#d7def0]">{label}</span>
      <div className="flex h-11 items-center rounded-[0.95rem] border border-white/10 bg-[#20232b] px-3.5 text-[0.92rem] text-white/92">
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}

function DropdownField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  triggerRef,
  open,
  onOpenChange,
  widthClassName,
  estimatedWidth,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widthClassName?: string;
  estimatedWidth: number;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      onOpenChange(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onOpenChange, open, triggerRef]);

  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[#d7def0]">{label}</span>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-[0.95rem] border border-white/10 bg-[#20232b] px-3.5 text-left text-[0.92rem] text-white transition-colors hover:border-white/18 hover:bg-[#272b34] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7fa4ff]/45"
      >
        <span className="min-w-0 flex-1 truncate pr-1" title={selectedOption?.label}>
          {selectedOption?.label}
        </span>
        <CaretDown
          size={14}
          className={cn("shrink-0 text-[#c4cee3] transition-transform", open && "rotate-180")}
        />
      </button>

      <FloatingPanel
        anchorRef={triggerRef}
        open={open}
        align="start"
        placement="bottom"
        offset={10}
        estimatedWidth={estimatedWidth}
        estimatedHeight={260}
        className={cn("z-[170]", widthClassName)}
      >
        <div
          ref={panelRef}
          className="overflow-hidden rounded-[1rem] border border-white/10 bg-[#23262f] p-1.5 shadow-[0_28px_80px_-30px_rgba(0,0,0,0.94)]"
        >
          <div className="flowboard-scrollbar flex max-h-[240px] flex-col gap-1 overflow-y-auto overflow-x-hidden">
            {options.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    onOpenChange(false);
                  }}
                  className={cn(
                    "flex min-h-10 w-full items-center justify-between rounded-[0.8rem] px-3 py-2 text-left text-[0.92rem] transition-colors",
                    active
                      ? "bg-[#6c9dff]/18 text-white ring-1 ring-inset ring-[#8eb2ff]/18"
                      : "text-[#d6dced] hover:bg-white/6 hover:text-white",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate pr-2" title={option.label}>
                    {option.label}
                  </span>
                  {active ? <Check size={15} className="text-[#97b8ff]" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      </FloatingPanel>
    </div>
  );
}

export function MoveCardPopover({
  board,
  sourceList,
  card,
  targetListId,
  targetPosition,
  onTargetListChange,
  onTargetPositionChange,
  onMove,
  onClose,
}: {
  board: BoardRecord;
  sourceList: ListRecord;
  card: CardRecord;
  targetListId: string;
  targetPosition: number;
  onTargetListChange: (listId: string) => void;
  onTargetPositionChange: (position: number) => void;
  onMove: () => void;
  onClose: () => void;
}) {
  const targetList = board.lists.find((list) => list.id === targetListId) ?? sourceList;
  const availableCards = targetList.cards.filter((item) => item.id !== card.id);
  const maxPosition = availableCards.length + 1;

  const listTriggerRef = useRef<HTMLButtonElement | null>(null);
  const positionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [positionOpen, setPositionOpen] = useState(false);

  const listOptions = board.lists.map((list) => ({
    value: list.id,
    label: list.title,
  }));

  const positionOptions = Array.from({ length: maxPosition }, (_, index) => ({
    value: index + 1,
    label: String(index + 1),
  }));

  return (
    <div className="w-[min(404px,calc(100vw-1rem))] overflow-visible rounded-[1.2rem] border border-white/10 bg-[#2a2c31] shadow-[0_28px_90px_-34px_rgba(0,0,0,0.98)]">
      <div className="sticky top-0 z-[2] flex items-center justify-center border-b border-white/8 bg-[#2a2c31]/96 px-5 py-5 backdrop-blur-xl">
        <h3 className="text-[1.08rem] font-medium tracking-[-0.03em] text-white">Mover cartão</h3>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-[1rem] border border-[#8aa7ff] bg-[#31343d] text-white transition-colors hover:bg-[#3a3d47]"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-5 px-6 py-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[#dbe3f7]">Cartão atual</p>
          <div className="rounded-[1rem] border border-white/8 bg-[#23262e] px-4 py-3">
            <p className="truncate text-[0.98rem] font-medium text-white">{card.title}</p>
            <p className="mt-1 text-sm text-[#99a5c3]">Lista atual: {sourceList.title}</p>
          </div>
        </div>

        <div className="space-y-4 border-t border-white/8 pt-4">
          <p className="text-sm font-medium text-[#dbe3f7]">Selecionar destino</p>

          <StaticField label="Quadro" value={board.name} />

          <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-3">
            <DropdownField
              label="Lista"
              value={targetListId}
              options={listOptions}
              onChange={(nextListId) => {
                setPositionOpen(false);
                onTargetListChange(nextListId);
              }}
              triggerRef={listTriggerRef}
              open={listOpen}
              onOpenChange={(open) => {
                setListOpen(open);
                if (open) {
                  setPositionOpen(false);
                }
              }}
              widthClassName="w-[280px]"
              estimatedWidth={280}
            />

            <DropdownField
              label="Posição"
              value={targetPosition}
              options={positionOptions}
              onChange={onTargetPositionChange}
              triggerRef={positionTriggerRef}
              open={positionOpen}
              onOpenChange={(open) => {
                setPositionOpen(open);
                if (open) {
                  setListOpen(false);
                }
              }}
              widthClassName="w-[92px]"
              estimatedWidth={92}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onMove}
          className="flex h-12 w-full items-center justify-center rounded-[0.95rem] border border-[#6f92f4] bg-[#5a84f7] text-[1rem] font-medium text-white transition-colors hover:bg-[#6a90fb] active:translate-y-px"
        >
          Mover
        </button>
      </div>
    </div>
  );
}
