"use client";

import { useState } from "react";
import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "@phosphor-icons/react";
import { List } from "@/components/list";
import { TaskCard } from "@/components/card";
import { ShareBoardModal } from "@/components/share-board-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFlowBoardData } from "@/hooks/use-flowboard-store";
import type { BoardRecord, CardRecord } from "@/lib/flowboard-types";

type ActiveCardState = {
  card: CardRecord;
  listId: string;
};

export function Board({
  board,
  shareOpen,
  onShareOpenChange,
}: {
  board: BoardRecord;
  shareOpen: boolean;
  onShareOpenChange: (open: boolean) => void;
}) {
  const { addList, moveCard, updateBoard, stats } = useFlowBoardData(board.id);
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 140,
        tolerance: 6,
      },
    }),
  );
  const [newListTitle, setNewListTitle] = useState("");
  const [activeCard, setActiveCard] = useState<ActiveCardState | null>(null);

  function handleCreateList() {
    const trimmed = newListTitle.trim();

    if (!trimmed) {
      return;
    }

    addList(board.id, trimmed);
    setNewListTitle("");
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const data = active.data.current as { type?: string; card?: CardRecord; listId?: string } | undefined;

    if (data?.type === "card" && data.card && data.listId) {
      setActiveCard({
        card: data.card,
        listId: data.listId,
      });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) {
      return;
    }

    const activeData = active.data.current as
      | { type?: string; cardId?: string; listId?: string }
      | undefined;
    const overData = over.data.current as
      | { type?: string; cardId?: string; listId?: string }
      | undefined;

    if (activeData?.type !== "card" || !activeData.cardId || !activeData.listId) {
      return;
    }

    const targetListId = overData?.listId ?? String(over.id);
    const targetCardId = overData?.type === "card" ? overData.cardId : undefined;

    if (!targetListId) {
      return;
    }

    if (activeData.listId === targetListId && (!targetCardId || activeData.cardId === targetCardId)) {
      return;
    }

    moveCard(board.id, activeData.listId, targetListId, activeData.cardId, targetCardId);
  }

  return (
    <div
      data-board-shell="true"
      className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#11131a]"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${board.accent} opacity-[0.86]`} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,20,0.12),rgba(10,12,20,0.34))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_24rem)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.04),transparent_28rem)]" />

      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/7 px-4 py-2 text-[12px] text-[#d7ddef] sm:px-5">
          <div className="rounded-[0.9rem] border border-white/8 bg-white/4 px-2.5 py-1.5">
            {board.lists.length} listas
          </div>
          <div className="rounded-[0.9rem] border border-white/8 bg-white/4 px-2.5 py-1.5">
            {stats?.filteredCards ?? 0}
            {stats && stats.filteredCards !== stats.totalCards ? ` de ${stats.totalCards}` : ""} cards ativos
          </div>
          <div className="rounded-[0.9rem] border border-white/8 bg-white/4 px-2.5 py-1.5">
            {stats?.totalChecklistItems ?? 0} itens de checklist
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-3 py-2 sm:px-4 lg:px-5">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flowboard-scrollbar flex min-h-0 flex-1 items-start gap-3 overflow-x-auto overflow-y-hidden pb-1 pr-2">
              {board.lists.map((list) => (
                <SortableContext
                  key={list.id}
                  items={list.cards.map((card) => card.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <List boardId={board.id} list={list} />
                </SortableContext>
              ))}

              <section className="glass-panel flex max-h-[calc(100dvh-13.5rem)] min-h-0 w-[300px] shrink-0 flex-col rounded-[1.45rem] border border-white/8 bg-[#121722]/92 p-2.5">
                <div className="rounded-[1.1rem] border border-dashed border-white/10 bg-black/10 p-3">
                  <p className="text-sm font-medium text-white">Adicionar nova lista</p>
                  <p className="mt-1 text-xs leading-5 text-[#8f97ab]">
                    Crie novas etapas do fluxo mantendo a leitura igual ao Trello.
                  </p>
                  <Input
                    value={newListTitle}
                    onChange={(event) => setNewListTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleCreateList();
                      }
                    }}
                    placeholder="Ex.: Em revisao"
                    className="mt-4 h-11 rounded-[1rem] border-white/10 bg-white/4 text-white placeholder:text-[#667089]"
                  />
                  <Button
                    onClick={handleCreateList}
                    className="mt-3 h-11 w-full rounded-[1rem] border border-white/10 bg-white text-[#0b0f19] hover:bg-[#dde5ff]"
                  >
                    <Plus size={16} />
                    Criar lista
                  </Button>
                </div>
              </section>
            </div>

            <DragOverlay
              dropAnimation={{
                duration: 180,
                easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
              }}
            >
              {activeCard ? (
                <div className="w-[280px] opacity-[0.98]">
                  <TaskCard
                    boardId={board.id}
                    listId={activeCard.listId}
                    card={activeCard.card}
                    dragging
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      <ShareBoardModal
        board={board}
        open={shareOpen}
        onOpenChange={onShareOpenChange}
        onUpdateBoard={(updates) => updateBoard(board.id, updates)}
      />
    </div>
  );
}
