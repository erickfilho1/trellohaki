"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Plus, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { BoardRecord } from "@/lib/flowboard-types";
import { cn } from "@/lib/utils";

export type AddDemandPayload = {
  listId: string;
  title: string;
  description?: string;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function AddDemandPopover({
  board,
  onCreate,
  onClose,
}: {
  board: BoardRecord;
  onCreate: (payload: AddDemandPayload) => void;
  onClose: () => void;
}) {
  const defaultListId = useMemo(() => {
    const requestList = board.lists.find((list) => normalizeText(list.title).includes("solicit"));
    return requestList?.id ?? board.lists[0]?.id ?? "";
  }, [board.lists]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedListId, setSelectedListId] = useState(defaultListId);

  useEffect(() => {
    setSelectedListId(defaultListId);
  }, [defaultListId]);

  const selectedList = board.lists.find((list) => list.id === selectedListId);
  const canCreate = title.trim().length > 0 && Boolean(selectedListId);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCreate) {
      return;
    }

    onCreate({
      listId: selectedListId,
      title: title.trim(),
      description: description.trim() || undefined,
    });

    setTitle("");
    setDescription("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-h-[min(31rem,var(--floating-panel-max-height))] overflow-y-auto rounded-[1.45rem] border border-white/10 bg-[#111111] text-white shadow-[0_28px_80px_-40px_rgba(0,0,0,0.92),inset_0_1px_0_rgba(255,255,255,0.08)]"
    >
      <div className="flex items-center justify-between gap-4 border-b border-white/8 px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.22em] text-[#a9b2c7] uppercase">
            Quadro atual
          </p>
          <h2 className="mt-1 text-[1.05rem] font-semibold tracking-[-0.03em]">
            Adicionar demanda
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-[#cbd3e4] transition hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
          aria-label="Fechar"
        >
          <X size={17} />
        </button>
      </div>

      <div className="space-y-4 px-5 py-5">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-[#eef2ff]">Titulo da demanda</span>
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex.: Ajuste no banner da home"
            className="h-12 w-full rounded-[1rem] border border-white/10 bg-[#1a1a1a] px-4 text-sm text-white outline-none transition placeholder:text-[#737b8e] focus:border-[#dc3933]/60 focus:ring-4 focus:ring-[#dc3933]/12"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-[#eef2ff]">Lista de destino</span>
          <div className="grid gap-2">
            {board.lists.length > 0 ? (
              board.lists.map((list) => {
                const selected = list.id === selectedListId;

                return (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => setSelectedListId(list.id)}
                    className={cn(
                      "flex min-h-12 items-center justify-between gap-3 rounded-[1rem] border px-3.5 py-2.5 text-left transition-all duration-200",
                      selected
                        ? "border-[#dc3933]/42 bg-[#dc3933]/14 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                        : "border-white/9 bg-white/[0.035] text-[#d8deed] hover:border-white/16 hover:bg-white/[0.07]",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{list.title}</span>
                      <span className="mt-0.5 block text-xs text-[#8f9ab0]">
                        {list.cards.length} {list.cards.length === 1 ? "card" : "cards"}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full border transition",
                        selected
                          ? "border-[#dc3933] bg-[#dc3933] text-white"
                          : "border-white/12 bg-white/[0.04] text-transparent",
                      )}
                    >
                      <Check size={13} weight="bold" />
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="rounded-[1rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-[#a8b1c5]">
                Crie uma lista no quadro antes de adicionar demandas.
              </div>
            )}
          </div>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-[#eef2ff]">Contexto rapido</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Opcional: detalhe links, prioridade ou instrucoes iniciais."
            rows={3}
            className="min-h-24 w-full resize-none rounded-[1rem] border border-white/10 bg-[#1a1a1a] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-[#737b8e] focus:border-[#dc3933]/60 focus:ring-4 focus:ring-[#dc3933]/12"
          />
        </label>

        <div className="rounded-[1rem] border border-white/8 bg-white/[0.035] px-4 py-3 text-xs leading-5 text-[#9aa4bb]">
          A demanda sera criada em{" "}
          <span className="font-semibold text-white">{selectedList?.title ?? "uma lista"}</span>{" "}
          dentro do quadro selecionado.
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-white/8 px-5 py-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-10 rounded-[0.9rem] border-white/10 bg-white/[0.03] px-4 text-[#cbd3e4] hover:bg-white/[0.07]"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={!canCreate}
          className="h-10 rounded-[0.9rem] bg-[#dc3933] px-4 text-white shadow-[0_18px_36px_-24px_rgba(220,57,51,0.7)] hover:bg-[#ef5148]"
        >
          <Plus size={16} />
          Criar demanda
        </Button>
      </div>
    </form>
  );
}
