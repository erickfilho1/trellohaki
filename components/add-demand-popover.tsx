"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, NotePencil, Plus, X } from "@phosphor-icons/react";
import { CommentEditor } from "@/components/editor/comment-editor";
import { Button } from "@/components/ui/button";
import { isRichTextEmpty } from "@/lib/flowboard-helpers";
import type { BoardRecord, CardRecord } from "@/lib/flowboard-types";
import { cn } from "@/lib/utils";

export type AddDemandPayload =
  | {
      mode: "create-demand";
      listId: string;
      title: string;
      description?: string;
    }
  | {
      mode: "request-change";
      listId: string;
      cardId: string;
      comment: string;
    };

type QuickActionMode = "menu" | "create-demand" | "request-change";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function firstListWithCards(board: BoardRecord) {
  return board.lists.find((list) => list.cards.length > 0)?.id ?? board.lists[0]?.id ?? "";
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
  const requestListId = useMemo(() => {
    const requestList = board.lists.find((list) => normalizeText(list.title).includes("solicit"));
    return requestList?.id ?? board.lists[0]?.id ?? "";
  }, [board.lists]);

  const initialChangeListId = useMemo(() => firstListWithCards(board), [board]);

  const [mode, setMode] = useState<QuickActionMode>("menu");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDemandListId, setSelectedDemandListId] = useState(requestListId);
  const [selectedChangeListId, setSelectedChangeListId] = useState(initialChangeListId);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [changeComment, setChangeComment] = useState("");

  useEffect(() => {
    setSelectedDemandListId(requestListId);
  }, [requestListId]);

  useEffect(() => {
    setSelectedChangeListId(initialChangeListId);
  }, [initialChangeListId]);

  useEffect(() => {
    const cards = board.lists.find((list) => list.id === selectedChangeListId)?.cards ?? [];
    if (!cards.some((card) => card.id === selectedCardId)) {
      setSelectedCardId(cards[0]?.id ?? "");
    }
  }, [board.lists, selectedCardId, selectedChangeListId]);

  const selectedDemandList = board.lists.find((list) => list.id === selectedDemandListId);
  const selectedChangeList = board.lists.find((list) => list.id === selectedChangeListId);
  const selectedChangeCard =
    selectedChangeList?.cards.find((card) => card.id === selectedCardId) ?? null;
  const canCreateDemand = title.trim().length > 0 && Boolean(selectedDemandListId);
  const canRequestChange = Boolean(selectedChangeListId && selectedCardId) && !isRichTextEmpty(changeComment);

  function resetAndClose() {
    setMode("menu");
    setTitle("");
    setDescription("");
    setChangeComment("");
    setSelectedDemandListId(requestListId);
    setSelectedChangeListId(initialChangeListId);
    setSelectedCardId("");
    onClose();
  }

  function submitCreateDemand(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCreateDemand) {
      return;
    }

    onCreate({
      mode: "create-demand",
      listId: selectedDemandListId,
      title: title.trim(),
      description: description.trim() || undefined,
    });

    resetAndClose();
  }

  function submitRequestChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canRequestChange) {
      return;
    }

    onCreate({
      mode: "request-change",
      listId: selectedChangeListId,
      cardId: selectedCardId,
      comment: changeComment,
    });

    resetAndClose();
  }

  function renderHeader(titleText: string, subtitle: string, showBack = false) {
    return (
      <div className="flex items-center justify-between gap-4 border-b border-white/8 px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          {showBack ? (
            <button
              type="button"
              onClick={() => setMode("menu")}
              className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-[#cbd3e4] transition hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
              aria-label="Voltar"
            >
              <ArrowLeft size={15} />
            </button>
          ) : null}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-[#a9b2c7] uppercase">
              Quadro atual
            </p>
            <h2 className="mt-1 text-[1.05rem] font-semibold tracking-[-0.03em] text-white">
              {titleText}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#8f97ab]">{subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={resetAndClose}
          className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-[#cbd3e4] transition hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
          aria-label="Fechar"
        >
          <X size={17} />
        </button>
      </div>
    );
  }

  function renderListSelector({
    lists,
    selectedId,
    onSelect,
  }: {
    lists: BoardRecord["lists"];
    selectedId: string;
    onSelect: (listId: string) => void;
  }) {
    return (
      <div className="grid gap-2">
        {lists.map((list) => {
          const selected = list.id === selectedId;

          return (
            <button
              key={list.id}
              type="button"
              onClick={() => onSelect(list.id)}
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
        })}
      </div>
    );
  }

  function renderCardSelector(cards: CardRecord[]) {
    if (cards.length === 0) {
      return (
        <div className="rounded-[1rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-[#a8b1c5]">
          Essa lista ainda não tem cards para receber pedido de alteração.
        </div>
      );
    }

    return (
      <div className="grid gap-2">
        {cards.map((card) => {
          const selected = card.id === selectedCardId;

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setSelectedCardId(card.id)}
              className={cn(
                "flex items-center justify-between gap-3 rounded-[1rem] border px-3.5 py-3 text-left transition-all duration-200",
                selected
                  ? "border-[#dc3933]/42 bg-[#dc3933]/14 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "border-white/9 bg-white/[0.035] text-[#d8deed] hover:border-white/16 hover:bg-white/[0.07]",
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{card.title}</span>
                <span className="mt-0.5 block text-xs text-[#8f9ab0]">
                  {card.comments.length} comentário{card.comments.length === 1 ? "" : "s"}
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
        })}
      </div>
    );
  }

  return (
    <div
      className="max-h-[min(40rem,var(--floating-panel-max-height))] overflow-y-auto rounded-[1.45rem] border border-white/10 bg-[#111111] text-white shadow-[0_28px_80px_-40px_rgba(0,0,0,0.92),inset_0_1px_0_rgba(255,255,255,0.08)]"
    >
      {mode === "menu" ? (
        <>
          {renderHeader("Novo fluxo rápido", "Escolha se você quer criar uma demanda ou pedir uma alteração.")}
          <div className="space-y-3 px-5 py-5">
            <button
              type="button"
              onClick={() => setMode("create-demand")}
              className="flex w-full items-start gap-4 rounded-[1.2rem] border border-white/10 bg-white/[0.035] px-4 py-4 text-left transition-all duration-200 hover:border-white/16 hover:bg-white/[0.07]"
            >
              <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.04] text-[#ffd9d7]">
                <Plus size={18} weight="bold" />
              </span>
              <span className="min-w-0">
                <span className="block text-[1rem] font-semibold text-white">Criar demanda</span>
                <span className="mt-1 block text-sm leading-6 text-[#95a0b7]">
                  Abre o fluxo já existente para criar um mini card em qualquer lista do quadro.
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMode("request-change")}
              className="flex w-full items-start gap-4 rounded-[1.2rem] border border-white/10 bg-white/[0.035] px-4 py-4 text-left transition-all duration-200 hover:border-white/16 hover:bg-white/[0.07]"
            >
              <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.04] text-[#ffd9d7]">
                <NotePencil size={18} weight="duotone" />
              </span>
              <span className="min-w-0">
                <span className="block text-[1rem] font-semibold text-white">Pedir alteração</span>
                <span className="mt-1 block text-sm leading-6 text-[#95a0b7]">
                  Escolha a lista, selecione o card e envie a alteração direto para os comentários dele.
                </span>
              </span>
            </button>
          </div>
        </>
      ) : null}

      {mode === "create-demand" ? (
        <form onSubmit={submitCreateDemand}>
          {renderHeader("Adicionar demanda", "Crie um mini card no quadro atual.", true)}
          <div className="space-y-4 px-5 py-5">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[#eef2ff]">Título da demanda</span>
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
              {board.lists.length > 0 ? (
                renderListSelector({
                  lists: board.lists,
                  selectedId: selectedDemandListId,
                  onSelect: setSelectedDemandListId,
                })
              ) : (
                <div className="rounded-[1rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-[#a8b1c5]">
                  Crie uma lista no quadro antes de adicionar demandas.
                </div>
              )}
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-[#eef2ff]">Contexto rápido</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Opcional: detalhe links, prioridade ou instruções iniciais."
                rows={3}
                className="min-h-24 w-full resize-none rounded-[1rem] border border-white/10 bg-[#1a1a1a] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-[#737b8e] focus:border-[#dc3933]/60 focus:ring-4 focus:ring-[#dc3933]/12"
              />
            </label>

            <div className="rounded-[1rem] border border-white/8 bg-white/[0.035] px-4 py-3 text-xs leading-5 text-[#9aa4bb]">
              A demanda será criada em{" "}
              <span className="font-semibold text-white">{selectedDemandList?.title ?? "uma lista"}</span>.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-white/8 px-5 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMode("menu")}
              className="h-10 rounded-[0.9rem] border-white/10 bg-white/[0.03] px-4 text-[#cbd3e4] hover:bg-white/[0.07]"
            >
              Voltar
            </Button>
            <Button
              type="submit"
              disabled={!canCreateDemand}
              className="h-10 rounded-[0.9rem] bg-[#dc3933] px-4 text-white shadow-[0_18px_36px_-24px_rgba(220,57,51,0.7)] hover:bg-[#ef5148]"
            >
              <Plus size={16} />
              Criar demanda
            </Button>
          </div>
        </form>
      ) : null}

      {mode === "request-change" ? (
        <form onSubmit={submitRequestChange}>
          {renderHeader("Pedir alteração", "Escolha o card e envie a alteração direto para os comentários.", true)}
          <div className="space-y-4 px-5 py-5">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[#eef2ff]">Lista</span>
              {renderListSelector({
                lists: board.lists,
                selectedId: selectedChangeListId,
                onSelect: setSelectedChangeListId,
              })}
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-[#eef2ff]">Card</span>
              {renderCardSelector(selectedChangeList?.cards ?? [])}
            </label>

            <div className="space-y-2">
              <span className="text-sm font-medium text-[#eef2ff]">Texto da alteração</span>
              <div className="rounded-[1rem] border border-white/8 bg-white/[0.025] p-2.5">
                <CommentEditor value={changeComment} onChange={setChangeComment} />
              </div>
            </div>

            <div className="rounded-[1rem] border border-white/8 bg-white/[0.035] px-4 py-3 text-xs leading-5 text-[#9aa4bb]">
              {selectedChangeCard ? (
                <>
                  A alteração será publicada automaticamente nos comentários de{" "}
                  <span className="font-semibold text-white">{selectedChangeCard.title}</span>.
                </>
              ) : (
                "Selecione um card para publicar a alteração."
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-white/8 px-5 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMode("menu")}
              className="h-10 rounded-[0.9rem] border-white/10 bg-white/[0.03] px-4 text-[#cbd3e4] hover:bg-white/[0.07]"
            >
              Voltar
            </Button>
            <Button
              type="submit"
              disabled={!canRequestChange}
              className="h-10 rounded-[0.9rem] bg-[#dc3933] px-4 text-white shadow-[0_18px_36px_-24px_rgba(220,57,51,0.7)] hover:bg-[#ef5148]"
            >
              <NotePencil size={16} />
              Enviar alteração
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
