"use client";

import {
  useState,
} from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarBlank,
  ChatCircleText,
  Check,
  CheckSquare,
  Circle,
  ClockCountdown,
  List,
  Paperclip,
  PencilSimpleLine,
} from "@phosphor-icons/react";
import { CardModal } from "@/components/card-modal";
import { usePomodoro } from "@/components/providers/pomodoro-provider";
import { LabelBadge } from "@/components/label-badge";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { useFlowBoardData } from "@/hooks/use-flowboard-store";
import {
  formatDateTime,
  getChecklistSummary,
  getDueBadgeClass,
  getLabelPreviewColor,
  isDueSoon,
  isOverdue,
  isRichTextEmpty,
} from "@/lib/flowboard-helpers";
import type { CardRecord, LabelTone } from "@/lib/flowboard-types";
import { cn } from "@/lib/utils";

const LABEL_TONE_LABELS: Record<LabelTone, string> = {
  "green-dark": "verde escuro",
  green: "verde",
  "green-light": "verde claro",
  "yellow-dark": "amarelo queimado",
  yellow: "amarelo",
  orange: "laranja",
  "red-dark": "vermelho escuro",
  red: "vermelho",
  coral: "coral",
  "purple-dark": "roxo escuro",
  purple: "roxo",
  lilac: "lilas",
  "blue-dark": "azul escuro",
  blue: "azul",
  "blue-light": "azul claro",
  cyan: "ciano",
  pink: "rosa",
  gray: "cinza",
};

function getLabelTooltipText(label: CardRecord["labels"][number]) {
  return `Cor: ${LABEL_TONE_LABELS[label.tone]}, titulo: "${label.name}"`;
}

function getDueTooltipText(card: CardRecord) {
  if (!card.dates.dueDate) {
    return "";
  }

  if (card.completed) {
    return `Entrega confirmada para ${formatDateTime(card.dates.dueDate)}.`;
  }

  if (isOverdue(card.dates)) {
    return "Este cartão está atrasado.";
  }

  if (isDueSoon(card.dates)) {
    return `Este cartão vence em breve: ${formatDateTime(card.dates.dueDate)}.`;
  }

  return `Data de entrega: ${formatDateTime(card.dates.dueDate)}.`;
}

const MiniCardTooltip = InfoTooltip;

export function TaskCard({
  boardId,
  listId,
  card,
  dragging = false,
}: {
  boardId: string;
  listId: string;
  card: CardRecord;
  dragging?: boolean;
}) {
  const { board, updateCard } = useFlowBoardData(boardId);
  const { isLinkedToCard } = usePomodoro();
  const [open, setOpen] = useState(false);
  const [labelsExpanded, setLabelsExpanded] = useState(false);
  const pomodoroActive = isLinkedToCard(card.id);

  const list = board?.lists.find((item) => item.id === listId);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: "card",
      card,
      cardId: card.id,
      listId,
    },
  });

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const checklistItems = card.checklists.flatMap((checklist) => checklist.items);
  const hasDescription = !isRichTextEmpty(card.description);
  const coverTone = card.cover?.tone;
  const coverSize = card.cover?.size ?? "header";
  const hasCover = Boolean(card.cover && (card.cover.tone || card.cover.imageUrl));
  const coverColor = coverTone ? getLabelPreviewColor(coverTone) : "#2563eb";
  const cardSurfaceStyle =
    hasCover && coverSize === "full"
      ? {
          backgroundColor: coverColor,
          backgroundImage: card.cover?.imageUrl
            ? `linear-gradient(180deg, rgba(9,12,18,0.12), rgba(9,12,18,0.2)), url(${card.cover.imageUrl})`
            : `linear-gradient(180deg, ${coverColor} 0%, color-mix(in srgb, ${coverColor} 86%, #1d2430) 100%)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : undefined;
  const coverStripStyle =
    hasCover && coverSize === "header"
      ? {
          backgroundColor: coverColor,
          backgroundImage: card.cover?.imageUrl
            ? `linear-gradient(180deg, rgba(9,12,18,0.08), rgba(9,12,18,0.14)), url(${card.cover.imageUrl})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : undefined;

  function toggleCompleted() {
    updateCard(
      boardId,
      listId,
      card.id,
      {
        completed: !card.completed,
      },
      !card.completed ? "Você confirmou esta demanda como concluída" : "Você reabriu esta demanda",
    );
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={{
          ...dragStyle,
          ...cardSurfaceStyle,
        }}
        data-testid={`card-${card.id}`}
        data-card-title={card.title}
        data-task-card="true"
        {...attributes}
        {...listeners}
        className={cn(
          "group relative cursor-grab overflow-hidden rounded-[1rem] border border-white/8 bg-[#26292f] shadow-[0_20px_32px_-24px_rgba(0,0,0,0.95)] will-change-transform transition-[background-color,border-color,box-shadow,transform] duration-180 hover:-translate-y-0.5 hover:border-white/14 hover:bg-[#2b2f36] active:cursor-grabbing",
          hasCover && coverSize === "header" ? "border-white/10 shadow-[0_20px_32px_-24px_rgba(0,0,0,0.95)]" : "",
          hasCover && coverSize === "full" ? "border-white/14 shadow-[0_24px_40px_-26px_rgba(0,0,0,0.96)]" : "",
          card.completed ? "border-[#5bbf7a]/35 bg-[#203125]" : "",
          (isDragging || dragging) &&
            "border-white/14 bg-[#2b2f36] opacity-[0.92] shadow-[0_32px_64px_-28px_rgba(0,0,0,1)]",
        )}
      >
        {hasCover && coverSize === "header" ? (
          <div className="h-12 border-b border-black/10" style={coverStripStyle} />
        ) : null}

        {!dragging && pomodoroActive ? (
          <MiniCardTooltip content="Pomodoro ativo neste cartão">
            <span className="pointer-events-none absolute right-11 top-2 z-[2] inline-flex size-8 items-center justify-center rounded-[0.85rem] border border-[#ff655b]/28 bg-[#341613] text-[#ff655b] opacity-0 shadow-[0_10px_20px_-16px_rgba(255,101,91,0.72)] transition-opacity duration-180 group-hover:opacity-100">
              <ClockCountdown size={14} weight="fill" />
            </span>
          </MiniCardTooltip>
        ) : null}

        {!dragging ? (
          <MiniCardTooltip content="Editar cartão">
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                setOpen(true);
              }}
              className={cn(
                "pointer-events-none absolute right-2 z-[2] flex size-8 items-center justify-center rounded-[0.85rem] border border-white/10 bg-black/28 text-[#dfe6f8] opacity-0 shadow-[0_8px_18px_-14px_rgba(0,0,0,0.9)] transition-all duration-180 group-hover:pointer-events-auto group-hover:opacity-100 hover:border-white/18 hover:bg-black/42 hover:text-white",
                hasCover && coverSize === "header" ? "top-2" : "top-2",
              )}
            >
              <PencilSimpleLine size={14} />
            </button>
          </MiniCardTooltip>
        ) : null}

        <div className="px-2.5 pb-2.5 pt-2.5">
          {card.labels.length > 0 ? (
            <div className="mb-1.5 flex flex-wrap gap-1 pr-8">
              {card.labels.map((label) => (
                <MiniCardTooltip key={label.id} content={getLabelTooltipText(label)} align="left">
                  <LabelBadge
                    label={label}
                    compact
                    interactive
                    collapsed={!labelsExpanded}
                    onClick={() => {
                      setLabelsExpanded((current) => !current);
                    }}
                  />
                </MiniCardTooltip>
              ))}
            </div>
          ) : null}

          <div className="flex items-start gap-1.5">
          <div className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5">
            <MiniCardTooltip content={card.completed ? "Demanda concluída" : "Marcar como concluído"} align="left">
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleCompleted();
                }}
                aria-label={card.completed ? `Reabrir ${card.title}` : `Confirmar ${card.title}`}
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border transition-all duration-200",
                  card.completed
                    ? "border-[#74d191] bg-[#74d191] text-[#112417]"
                    : "border-white/28 bg-transparent text-transparent opacity-0 group-hover:opacity-100 hover:border-[#8fdda8] hover:bg-[#8fdda8]/12 hover:text-[#c9f4d7]",
                )}
              >
                {card.completed ? <Check size={12} weight="bold" /> : <Circle size={14} weight="fill" />}
              </button>
            </MiniCardTooltip>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            data-testid={`open-card-${card.id}`}
            className="flex-1 text-left"
          >
            <div className="flex items-start justify-between gap-3">
              <p
                className={cn(
                  "text-[0.92rem] leading-[1.32] tracking-[-0.03em]",
                  hasCover && coverSize === "full" ? "text-white" : "text-[#eef2fb]",
                  card.completed ? "text-[#dbf5e3]" : "",
                )}
              >
                {card.title}
              </p>
            </div>
            {hasDescription ? (
              <div
                className={cn(
                  "mt-1.5 flex items-center",
                  hasCover && coverSize === "full" ? "text-white/72" : "text-[#8f97ab]",
                )}
              >
                <List size={15} weight="bold" />
              </div>
            ) : null}
            {card.dates.dueDate ||
            checklistItems.length > 0 ||
            card.comments.length > 0 ||
            card.attachments.length > 0 ? (
              <div className="mt-2 flex items-end justify-between gap-2">
                <div
                  className={cn(
                    "flex flex-wrap items-center gap-1 text-[10.5px]",
                    hasCover && coverSize === "full" ? "text-white/72" : "text-[#8890a4]",
                  )}
                >
                  {card.dates.dueDate ? (
                    <MiniCardTooltip content={getDueTooltipText(card)} align="left">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-1",
                          card.completed
                            ? "bg-[#75d08e] text-[#14311d]"
                            : getDueBadgeClass(card.dates),
                        )}
                      >
                        <CalendarBlank size={12} />
                        {formatDateTime(card.dates.dueDate)}
                      </span>
                    </MiniCardTooltip>
                  ) : null}

                  {checklistItems.length > 0 ? (
                    <MiniCardTooltip content={`Checklist: ${getChecklistSummary(checklistItems)}`} align="left">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-1",
                          card.completed ? "bg-[#75d08e]/12 text-[#c9efd4]" : "bg-white/5 text-[#d6ddef]",
                        )}
                      >
                        <CheckSquare size={12} />
                        {getChecklistSummary(checklistItems)}
                      </span>
                    </MiniCardTooltip>
                  ) : null}

                  {card.comments.length > 0 ? (
                    <MiniCardTooltip content={`${card.comments.length} comentário${card.comments.length > 1 ? "s" : ""}`} align="left">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-1",
                          card.completed ? "bg-[#75d08e]/12 text-[#c9efd4]" : "bg-white/5 text-[#d6ddef]",
                        )}
                      >
                        <ChatCircleText size={12} />
                        {card.comments.length}
                      </span>
                    </MiniCardTooltip>
                  ) : null}

                  {card.attachments.length > 0 ? (
                    <MiniCardTooltip content={`${card.attachments.length} anexo${card.attachments.length > 1 ? "s" : ""}`} align="left">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-1",
                          card.completed ? "bg-[#75d08e]/12 text-[#c9efd4]" : "bg-white/5 text-[#d6ddef]",
                        )}
                      >
                        <Paperclip size={12} />
                        {card.attachments.length}
                      </span>
                    </MiniCardTooltip>
                  ) : null}
                </div>
              </div>
            ) : null}
          </button>
        </div>
        </div>
      </div>

      {open && board && list ? (
        <CardModal
          board={board}
          list={list}
          card={card}
          open={open}
          onOpenChange={setOpen}
          onUpdateCard={(updates, activityText) => updateCard(boardId, listId, card.id, updates, activityText)}
        />
      ) : null}
    </>
  );
}
