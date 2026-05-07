"use client";

import { CaretLeft, CaretRight, X } from "@phosphor-icons/react";
import { LabelColorPicker } from "@/components/label-color-picker";
import type { LabelTone, ListRecord } from "@/lib/flowboard-types";

export function ListActionsPopover({
  list,
  onClose,
  onAddCard,
  onCopy,
  onMove,
  onToggleFollow,
  onColorChange,
  onRemoveColor,
  onArchive,
}: {
  list: ListRecord;
  onClose: () => void;
  onAddCard: () => void;
  onCopy: () => void;
  onMove: (direction: "left" | "right") => void;
  onToggleFollow: () => void;
  onColorChange: (tone: LabelTone) => void;
  onRemoveColor: () => void;
  onArchive: () => void;
}) {
  return (
    <div className="flowboard-scrollbar max-h-[min(78vh,720px)] w-[400px] overflow-y-auto rounded-[1.6rem] border border-white/10 bg-[#2a2c31] p-4 shadow-[0_24px_60px_-26px_rgba(0,0,0,0.95)]">
      <div className="flex items-center justify-between">
        <div className="w-8" />
        <h3 className="text-lg font-medium text-white">Acoes da Lista</h3>
        <button
          type="button"
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-[0.9rem] text-[#d8e5ff] transition-colors hover:bg-white/6"
        >
          <X size={18} />
        </button>
      </div>

      <div className="mt-4 space-y-1 text-[1.05rem] text-white">
        <button data-testid="list-action-add-card" type="button" onClick={onAddCard} className="w-full rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/6">
          Adicionar cartao
        </button>
        <button data-testid="list-action-copy" type="button" onClick={onCopy} className="w-full rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/6">
          Copiar lista
        </button>
        <div className="space-y-3 rounded-[1.15rem] border border-white/8 bg-[#20242d] px-3 py-3.5">
          <div>
            <p className="text-[1rem] text-white">Mover lista</p>
            <p className="mt-1 text-xs leading-5 text-[#8f9bb2]">
              Reordene esta coluna dentro do quadro sem alterar os cards.
            </p>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <button
              data-testid="list-action-move-left"
              type="button"
              onClick={() => onMove("left")}
              className="group flex min-h-[74px] flex-col items-start justify-center rounded-[1rem] border border-white/10 bg-white/4 px-3 py-3 text-left transition-all hover:border-white/16 hover:bg-white/7"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-white">
                <CaretLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
                Trazer para antes
              </span>
              <span className="mt-1 text-xs leading-5 text-[#8d99b0]">
                Move esta lista uma posicao para a esquerda.
              </span>
            </button>

            <div className="flex h-full items-center justify-center px-1">
              <div className="rounded-full border border-white/8 bg-white/4 px-2 py-1 text-[10px] font-semibold tracking-[0.2em] text-[#8c98ae] uppercase">
                Ordem
              </div>
            </div>

            <button
              data-testid="list-action-move-right"
              type="button"
              onClick={() => onMove("right")}
              className="group flex min-h-[74px] flex-col items-start justify-center rounded-[1rem] border border-white/10 bg-white/4 px-3 py-3 text-left transition-all hover:border-white/16 hover:bg-white/7"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-white">
                Levar para depois
                <CaretRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </span>
              <span className="mt-1 text-xs leading-5 text-[#8d99b0]">
                Move esta lista uma posicao para a direita.
              </span>
            </button>
          </div>
        </div>
        <button
          data-testid="list-action-follow"
          type="button"
          onClick={onToggleFollow}
          className="w-full rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/6"
        >
          {list.following ? "Deixar de seguir" : "Seguir"}
        </button>
      </div>

      <div className="mt-4 border-t border-white/8 pt-4">
        <p className="px-1 text-sm text-[#b8c0d4]">Alterar cor da lista</p>
        <div className="mt-3">
          <LabelColorPicker selected={list.color ?? undefined} onSelect={onColorChange} />
        </div>
        <button
          data-testid="list-action-remove-color"
          type="button"
          onClick={onRemoveColor}
          className="mt-3 flex h-11 w-full items-center justify-center rounded-[1rem] border border-white/10 bg-white/4 text-sm text-[#d8dff0] transition-colors hover:bg-white/7"
        >
          <X size={16} />
          Remover cor
        </button>
      </div>
      <div className="mt-4 border-t border-white/8 pt-4">
        <button
          data-testid="list-action-archive"
          type="button"
          onClick={onArchive}
          className="w-full rounded-lg px-3 py-2 text-left text-[#f3d2d0] hover:bg-white/6"
        >
          Arquivar esta lista
        </button>
      </div>
    </div>
  );
}
