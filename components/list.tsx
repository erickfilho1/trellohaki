"use client";

import { useDroppable } from "@dnd-kit/core";
import { DotsThree, Plus } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { TaskCard } from "@/components/card";
import { FloatingPanel } from "@/components/floating-panel";
import { ListActionsPopover } from "@/components/list-actions-popover";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFlowBoardData } from "@/hooks/use-flowboard-store";
import { getSurfaceColorClasses } from "@/lib/flowboard-helpers";
import type { ListRecord } from "@/lib/flowboard-types";
import { cn } from "@/lib/utils";

export function List({ boardId, list }: { boardId: string; list: ListRecord }) {
  const { addCard, archiveList, duplicateList, moveList, updateList } = useFlowBoardData(boardId);
  const { setNodeRef, isOver } = useDroppable({
    id: list.id,
    data: {
      type: "list",
      listId: list.id,
    },
  });

  const [cardTitle, setCardTitle] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [editingTitle, setEditingTitle] = useState(list.title);
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const actionsButtonRef = useRef<HTMLButtonElement | null>(null);
  const colorClasses = getSurfaceColorClasses(list.color);

  useEffect(() => {
    if (!actionsOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (actionsRef.current?.contains(target) || actionsButtonRef.current?.contains(target)) {
        return;
      }
      setActionsOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActionsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [actionsOpen]);

  function handleCreateCard() {
    const trimmedTitle = cardTitle.trim();

    if (!trimmedTitle) {
      return;
    }

    addCard(boardId, list.id, {
      title: trimmedTitle,
      description: "",
    });
    setCardTitle("");
    setShowComposer(false);
  }

  function persistTitle() {
    const trimmed = editingTitle.trim();
    if (!trimmed || trimmed === list.title) {
      setEditingTitle(list.title);
      return;
    }

    updateList(boardId, list.id, { title: trimmed });
  }

  function handleArchive() {
    if (window.confirm(`Arquivar a lista "${list.title}"?`)) {
      archiveList(boardId, list.id);
      setActionsOpen(false);
    }
  }

  return (
    <section
      ref={setNodeRef}
      data-testid={`list-${list.id}`}
      data-list-title={list.title}
      className={cn(
        "glass-panel relative flex max-h-[calc(100dvh-13.5rem)] min-h-0 w-[300px] shrink-0 flex-col overflow-hidden rounded-[1.45rem] border p-2.5 transition-colors",
        colorClasses.card,
        isOver ? "border-[#7da4ff]/40 bg-[#131a25]/96" : "",
      )}
    >
      <header
        className={cn(
          "relative z-[1] shrink-0 px-1 pb-3",
          list.color ? cn(colorClasses.header, "mb-1.5") : "mb-1",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Input
              value={editingTitle}
              onChange={(event) => setEditingTitle(event.target.value)}
              onBlur={persistTitle}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  persistTitle();
                }
              }}
              className={cn(
                "h-auto border-transparent bg-transparent px-0 py-0 text-[0.96rem] font-medium tracking-[-0.04em] text-white shadow-none focus-visible:ring-0",
                list.color ? colorClasses.text : "",
              )}
            />
            <p className={cn("mt-0.5 text-[11px] text-[#8f97ab]", list.color ? "text-white/78" : "")}>
              {list.cards.length} cards
            </p>
          </div>

          <div className="relative">
            <InfoTooltip content="Ações da lista" side="bottom">
              <button
                ref={actionsButtonRef}
                type="button"
                data-testid={`list-actions-${list.id}`}
                onClick={() => setActionsOpen((current) => !current)}
                className="flex size-8.5 items-center justify-center rounded-[0.9rem] border border-white/8 bg-white/4 text-[#d6ddef] transition-colors hover:bg-white/8 hover:text-white"
              >
                <DotsThree size={18} weight="bold" />
              </button>
            </InfoTooltip>

            {actionsOpen ? (
              <FloatingPanel
                anchorRef={actionsButtonRef}
                open={actionsOpen}
                align="end"
                estimatedWidth={400}
                estimatedHeight={660}
              >
                <div ref={actionsRef}>
                <ListActionsPopover
                  list={list}
                  onClose={() => setActionsOpen(false)}
                  onAddCard={() => {
                    setShowComposer(true);
                    setActionsOpen(false);
                  }}
                  onCopy={() => {
                    duplicateList(boardId, list.id);
                    setActionsOpen(false);
                  }}
                  onMove={(direction) => {
                    moveList(boardId, list.id, direction);
                    setActionsOpen(false);
                  }}
                  onToggleFollow={() => updateList(boardId, list.id, { following: !list.following })}
                  onColorChange={(tone) => updateList(boardId, list.id, { color: tone })}
                  onRemoveColor={() => updateList(boardId, list.id, { color: null })}
                  onArchive={handleArchive}
                />
                </div>
              </FloatingPanel>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flowboard-scrollbar min-h-0 flex-[0_1_auto] overflow-y-auto overflow-x-hidden pr-1">
        <div className="flex flex-col gap-2.5 px-0.5 pt-0.5">
          {list.cards.map((card) => (
            <TaskCard key={card.id} boardId={boardId} listId={list.id} card={card} />
          ))}
        </div>
      </div>

      {showComposer ? (
        <div className="mt-3 shrink-0 rounded-[1.05rem] border border-white/7 bg-white/3 p-2.5">
          <Input
            autoFocus
            value={cardTitle}
            onChange={(event) => setCardTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleCreateCard();
              }
              if (event.key === "Escape") {
                setShowComposer(false);
                setCardTitle("");
              }
            }}
            placeholder="Adicionar um cartao"
            className="h-10 rounded-[0.9rem] border-white/8 bg-black/10 text-white placeholder:text-[#667089]"
          />
          <div className="mt-2 flex gap-2">
            <Button
              onClick={handleCreateCard}
              className="h-9 rounded-[0.9rem] border border-white/10 bg-white px-3 text-[#0b0f19] hover:bg-[#dde5ff]"
            >
              Salvar
            </Button>
            <Button
              onClick={() => {
                setShowComposer(false);
                setCardTitle("");
              }}
              variant="ghost"
              className="h-9 rounded-[0.9rem] border border-white/0 bg-transparent px-3 text-[#cfd6e6] hover:bg-white/8 hover:text-white"
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowComposer(true)}
          className="mt-3 shrink-0 flex h-10 items-center gap-2 rounded-[0.95rem] border border-white/8 bg-white/4 px-3 text-[13px] text-[#d6ddef] transition-colors hover:bg-white/8"
        >
          <Plus size={16} />
          Adicionar um cartao
        </button>
      )}
    </section>
  );
}
