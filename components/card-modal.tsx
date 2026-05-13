"use client";

import { useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import {
  CaretDown,
  ChatCircleText,
  Check,
  CheckSquare,
  Copy,
  DotsThree,
  ImageSquare,
  Layout,
  NotePencil,
  Paperclip,
  Plus,
  Trash,
  Timer,
  X,
} from "@phosphor-icons/react";
import {
  createComment,
  createId,
  getLabelPreviewColor,
  isRichTextEmpty,
} from "@/lib/flowboard-helpers";
import { AddToCardPopover } from "@/components/add-to-card-popover";
import { CardCoverPopover } from "@/components/card-cover-popover";
import { ChecklistSection } from "@/components/checklist-section";
import { CommentsActivity } from "@/components/comments-activity";
import { DatesPopover } from "@/components/dates-popover";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { FloatingPanel } from "@/components/floating-panel";
import { LabelBadge } from "@/components/label-badge";
import { LabelsPopover } from "@/components/labels-popover";
import { MoveCardPopover } from "@/components/move-card-popover";
import { useAuth } from "@/components/providers/auth-provider";
import { usePomodoro } from "@/components/providers/pomodoro-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useFlowBoardData } from "@/hooks/use-flowboard-store";
import { resolveCurrentBoardMember } from "@/lib/current-board-member";
import {
  uploadCardAttachmentAsset,
  uploadCardCoverAsset,
} from "@/lib/supabase/storage";
import type { BoardRecord, CardRecord, ListRecord, MemberRecord } from "@/lib/flowboard-types";
import { cn } from "@/lib/utils";

type PanelState =
  | "add"
  | "labels"
  | "dates"
  | "cover"
  | "delivery"
  | "members"
  | "attachment"
  | "location"
  | "fields"
  | null;

export function CardModal({
  board,
  list,
  card,
  open,
  onOpenChange,
  onUpdateCard,
}: {
  board: BoardRecord;
  list: ListRecord;
  card: CardRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateCard: (updates: Partial<CardRecord>, activityText?: string) => void;
}) {
  const { user } = useAuth();
  const { canUsePomodoro, openForCard } = usePomodoro();
  const currentUser = useMemo(
    () => resolveCurrentBoardMember(board.members, user),
    [board.members, user],
  );
  const { deleteCard, duplicateCard, moveCard, removeBoardLabel, saveCardTemplate, upsertBoardLabel } =
    useFlowBoardData(board.id);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const optionsPanelRef = useRef<HTMLDivElement | null>(null);
  const movePanelRef = useRef<HTMLDivElement | null>(null);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const labelsButtonRef = useRef<HTMLButtonElement | null>(null);
  const datesButtonRef = useRef<HTMLButtonElement | null>(null);
  const coverButtonRef = useRef<HTMLButtonElement | null>(null);
  const deliveryButtonRef = useRef<HTMLButtonElement | null>(null);
  const attachmentButtonRef = useRef<HTMLButtonElement | null>(null);
  const attachmentFileInputRef = useRef<HTMLInputElement | null>(null);
  const optionsButtonRef = useRef<HTMLButtonElement | null>(null);
  const titleTriggerRef = useRef<HTMLButtonElement | null>(null);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const titleTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [activePanel, setActivePanel] = useState<PanelState>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [movePopoverOpen, setMovePopoverOpen] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [draftAttachmentName, setDraftAttachmentName] = useState("");
  const [draftAttachmentUrl, setDraftAttachmentUrl] = useState("");
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [draftLocation, setDraftLocation] = useState(card.location ?? "");
  const [fieldName, setFieldName] = useState("");
  const [fieldValue, setFieldValue] = useState("");
  const [commentsPanelOpen, setCommentsPanelOpen] = useState(false);
  const [stickyTitleVisible, setStickyTitleVisible] = useState(false);
  const [deliveryPanelFromAdd, setDeliveryPanelFromAdd] = useState(false);
  const [moveTargetListId, setMoveTargetListId] = useState(list.id);
  const [moveTargetPosition, setMoveTargetPosition] = useState(
    Math.max(1, list.cards.findIndex((item) => item.id === card.id) + 1),
  );

  useEffect(() => {
    if (!activePanel) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        panelRef.current?.contains(target) ||
        addButtonRef.current?.contains(target) ||
        labelsButtonRef.current?.contains(target) ||
        datesButtonRef.current?.contains(target) ||
        coverButtonRef.current?.contains(target) ||
        deliveryButtonRef.current?.contains(target) ||
        attachmentButtonRef.current?.contains(target)
      ) {
        return;
      }
      setActivePanel(null);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setActivePanel(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [activePanel]);

  useEffect(() => {
    if (!optionsOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (optionsPanelRef.current?.contains(target) || optionsButtonRef.current?.contains(target)) {
        return;
      }
      setOptionsOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOptionsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [optionsOpen]);

  useEffect(() => {
    if (!movePopoverOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (movePanelRef.current?.contains(target) || titleTriggerRef.current?.contains(target)) {
        return;
      }
      setMovePopoverOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setMovePopoverOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [movePopoverOpen]);

  useEffect(() => {
    const textarea = titleTextareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    const nextHeight = textarea.scrollHeight;
    textarea.style.height = `${nextHeight}px`;
  }, [title, open]);

  const attachedMembers = useMemo(() => card.members, [card.members]);
  const headerTone = list.color ?? card.labels[0]?.tone ?? "red-dark";
  const coverTone = card.cover?.tone ?? headerTone;
  const headerColor = getLabelPreviewColor(coverTone);
  const dueDateLabel = card.dates.dueDate
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(card.dates.dueDate))
    : "Sem data definida";
  const panelAnchorRef =
    activePanel === "labels"
      ? labelsButtonRef
      : activePanel === "dates"
        ? datesButtonRef
      : activePanel === "cover"
          ? coverButtonRef
          : activePanel === "delivery"
            ? deliveryPanelFromAdd
              ? addButtonRef
              : deliveryButtonRef
        : activePanel === "attachment"
          ? attachmentButtonRef
          : addButtonRef;
  const selectedDeliveredFolder =
    board.deliveredFolders.find((folder) => folder.id === card.deliveredFolderId) ?? board.deliveredFolders[0];
  const selectedMoveList = board.lists.find((item) => item.id === moveTargetListId) ?? list;
  const selectedMoveCardsWithoutCurrent = selectedMoveList.cards.filter((item) => item.id !== card.id);
  const selectedMoveMaxPosition = selectedMoveCardsWithoutCurrent.length + 1;
  const normalizedMoveTargetPosition = Math.min(
    Math.max(moveTargetPosition, 1),
    selectedMoveMaxPosition,
  );
  const titleToneClasses =
    title.length > 140
      ? "text-[0.96rem] sm:text-[1.04rem] lg:text-[1.12rem] leading-[1.2]"
      : title.length > 90
        ? "text-[1rem] sm:text-[1.08rem] lg:text-[1.16rem] leading-[1.19]"
        : "text-[1.16rem] sm:text-[1.24rem] lg:text-[1.32rem] leading-[1.16]";
  const titleBoxClasses =
    title.length > 90
      ? "min-h-[3rem] pt-0.5"
      : "min-h-[2.35rem] pt-[0.18rem]";
  const canOpenPomodoro = canUsePomodoro && user.panel !== "cliente";

  function persistTitle() {
    const trimmed = title.trim();
    if (trimmed && trimmed !== card.title) {
      onUpdateCard({ title: trimmed }, "Voce atualizou o titulo do card");
    } else {
      setTitle(card.title);
    }
  }

  function saveDescription() {
    onUpdateCard({ description }, "Voce atualizou a descricao");
    setEditingDescription(false);
  }

  function updateLabels(nextLabels: CardRecord["labels"], activityText?: string) {
    onUpdateCard({ labels: nextLabels }, activityText);
  }

  function updateDates(nextDates: CardRecord["dates"]) {
    onUpdateCard({ dates: nextDates }, "Voce atualizou as datas do card");
  }

  function removeDates() {
    onUpdateCard(
      {
        dates: {
          startDate: undefined,
          dueDate: undefined,
          recurring: "Nunca",
          reminder: "1 dia antes",
        },
      },
      "Voce removeu as datas do card",
    );
  }

  function updateChecklists(checklists: CardRecord["checklists"], activityText?: string) {
    onUpdateCard({ checklists }, activityText);
  }

  function addComment(text: string) {
    onUpdateCard(
      {
        comments: [...card.comments, createComment(currentUser, text)],
      },
      "Voce comentou neste card",
    );
  }

  function toggleMember(member: MemberRecord) {
    const exists = card.members.some((item) => item.id === member.id);
    onUpdateCard(
      {
        members: exists
          ? card.members.filter((item) => item.id !== member.id)
          : [...card.members, member],
      },
      exists ? `Voce removeu ${member.name} do card` : `Voce adicionou ${member.name} ao card`,
    );
  }

  function addAttachment() {
    if (!draftAttachmentUrl.trim()) {
      return;
    }

    onUpdateCard(
      {
        attachments: [
          ...card.attachments,
          {
            id: createId("attachment"),
            name: draftAttachmentName.trim() || "Novo link",
            url: draftAttachmentUrl.trim(),
            kind: "link",
          },
        ],
      },
      "Voce adicionou um anexo",
    );
    setDraftAttachmentName("");
    setDraftAttachmentUrl("");
    setActivePanel(null);
  }

  function saveLocation() {
    onUpdateCard({ location: draftLocation.trim() }, "Voce atualizou o local");
    setActivePanel(null);
  }

  function addCustomField() {
    if (!fieldName.trim() || !fieldValue.trim()) {
      return;
    }

    onUpdateCard(
      {
        customFields: [
          ...card.customFields,
          {
            id: createId("field"),
            name: fieldName.trim(),
            value: fieldValue.trim(),
          },
        ],
      },
      "Voce adicionou um campo personalizado",
    );
    setFieldName("");
    setFieldValue("");
    setActivePanel(null);
  }

  function handleDuplicateCard() {
    duplicateCard(board.id, list.id, card.id);
    setOptionsOpen(false);
    onOpenChange(false);
  }

  function handleSaveTemplate() {
    saveCardTemplate(board.id, list.id, card.id);
    setOptionsOpen(false);
  }

  function handleDeleteCard() {
    deleteCard(board.id, list.id, card.id);
    setOptionsOpen(false);
    onOpenChange(false);
  }

  function handleMoveCard() {
    const targetList = board.lists.find((item) => item.id === moveTargetListId) ?? list;
    const cardsWithoutCurrent = targetList.cards.filter((item) => item.id !== card.id);
    const safePosition = Math.min(Math.max(moveTargetPosition, 1), cardsWithoutCurrent.length + 1);
    const targetCardId = cardsWithoutCurrent[safePosition - 1]?.id;

    moveCard(board.id, list.id, targetList.id, card.id, targetCardId);
    setMovePopoverOpen(false);
  }

  function updateCover(nextCover: CardRecord["cover"], activityText: string) {
    onUpdateCard({ cover: nextCover }, activityText);
  }

  function handleCoverToneChange(tone?: NonNullable<CardRecord["cover"]>["tone"]) {
    const size = card.cover?.size ?? "header";
    const imageUrl = card.cover?.imageUrl;
    if (!tone && !imageUrl) {
      updateCover(undefined, "Voce removeu a cor da capa");
      return;
    }

    updateCover(
      {
        tone,
        imageUrl,
        size,
      },
      tone ? "Voce atualizou a capa do card" : "Voce removeu a cor da capa",
    );
  }

  function handleCoverSizeChange(size: "header" | "full") {
    updateCover(
      {
        tone: card.cover?.tone,
        imageUrl: card.cover?.imageUrl,
        size,
      },
      size === "full" ? "Voce alterou o layout da capa para completo" : "Voce alterou o layout da capa para faixa",
    );
  }

  async function handleCoverImageUpload(file: File) {
    setUploadingCover(true);
    try {
      const uploaded = await uploadCardCoverAsset({
        boardId: board.id,
        cardId: card.id,
        file,
      });
      updateCover(
        {
          tone: card.cover?.tone ?? coverTone,
          imageUrl: uploaded.publicUrl,
          size: card.cover?.size ?? "header",
        },
        "Voce adicionou uma imagem de capa",
      );
    } catch (error) {
      console.warn("Nao foi possivel enviar a imagem de capa.", error);
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleAttachmentFileUpload(file: File) {
    setUploadingAttachment(true);
    try {
      const uploaded = await uploadCardAttachmentAsset({
        boardId: board.id,
        cardId: card.id,
        file,
      });

      onUpdateCard(
        {
          attachments: [
            ...card.attachments,
            {
              id: createId("attachment"),
              name: draftAttachmentName.trim() || uploaded.name,
              url: uploaded.publicUrl,
              kind: "file",
            },
          ],
        },
        "Voce adicionou um arquivo ao card",
      );
      setDraftAttachmentName("");
      setActivePanel(null);
    } catch (error) {
      console.warn("Nao foi possivel enviar o anexo.", error);
    } finally {
      setUploadingAttachment(false);
      if (attachmentFileInputRef.current) {
        attachmentFileInputRef.current.value = "";
      }
    }
  }

  function handleRemoveCoverImage() {
    if (!card.cover?.tone) {
      updateCover(undefined, "Voce removeu a imagem de capa");
      return;
    }

    updateCover(
      {
        tone: card.cover?.tone ?? coverTone,
        size: card.cover?.size ?? "header",
      },
      "Voce removeu a imagem de capa",
    );
  }

  function toggleCompleted() {
    onUpdateCard(
      {
        completed: !card.completed,
      },
      !card.completed ? "Voce confirmou esta demanda como concluida" : "Voce reabriu esta demanda",
    );
  }

  function handleLeftPaneScroll(event: UIEvent<HTMLDivElement>) {
    const nextVisible = event.currentTarget.scrollTop > 64;
    setStickyTitleVisible((current) => (current === nextVisible ? current : nextVisible));
  }

  function renderCompletionButton({
    compact = false,
    withTooltip = false,
    tooltipSide = "right",
  }: {
    compact?: boolean;
    withTooltip?: boolean;
    tooltipSide?: "left" | "right";
  }) {
    return (
      <div className={cn("relative shrink-0", withTooltip ? "group/confirm" : "")}>
        <button
          type="button"
          onClick={toggleCompleted}
          className={cn(
            "relative flex items-center justify-center rounded-full border transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
            compact ? "size-8" : "size-10",
            card.completed
              ? "border-[#d8f7e2] bg-[#76d296] text-[#102717] shadow-[0_8px_20px_-12px_rgba(118,210,150,0.9)] before:absolute before:inset-[-4px] before:rounded-full before:border before:border-[#7fd89d]/35 before:content-['']"
              : "border-white/40 bg-white/[0.04] text-transparent hover:scale-[1.04] hover:border-[#a4e4ba] hover:bg-[#a4e4ba]/12 hover:text-[#d9f5e2]",
          )}
          aria-label={card.completed ? `Reabrir ${card.title}` : `Confirmar ${card.title}`}
        >
          {card.completed ? (
            <Check size={compact ? 16 : 18} weight="bold" />
          ) : (
            <span
              className={cn(
                "rounded-full border border-current",
                compact ? "size-3.5" : "size-4",
              )}
            />
          )}
        </button>

        {withTooltip ? (
          <div className={cn("pointer-events-none absolute top-1/2 z-[6] -translate-y-1/2 rounded-[0.8rem] border border-white/10 bg-[#1f232c]/96 px-3 py-2 text-[0.8rem] font-medium whitespace-nowrap text-white opacity-0 shadow-[0_18px_38px_-22px_rgba(0,0,0,0.95)] transition-all duration-200 group-hover/confirm:opacity-100", tooltipSide === "right" ? "left-[calc(100%+0.6rem)]" : "right-[calc(100%+0.6rem)]")}>
            {card.completed ? "Reabrir demanda" : "Marcar como concluído"}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "h-[86vh] w-[90vw] max-h-[760px] overflow-hidden rounded-[16px] border border-white/10 bg-[#26282e] p-0 text-white shadow-[0_52px_140px_-36px_rgba(0,0,0,0.98)] transition-[max-width,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          commentsPanelOpen ? "max-w-[1260px] xl:max-w-[1320px]" : "max-w-[860px] xl:max-w-[920px]",
        )}
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <header
            className="relative flex h-[136px] shrink-0 items-start justify-between overflow-hidden border-b border-black/20 px-10 py-5"
            style={{
              backgroundColor: headerColor,
              backgroundImage: card.cover?.imageUrl
                ? `linear-gradient(135deg, rgba(7,10,15,0.16) 0%, rgba(7,10,15,0.36) 100%), url(${card.cover.imageUrl})`
                : `linear-gradient(135deg, ${headerColor} 0%, color-mix(in srgb, ${headerColor} 68%, #3f0f12) 100%)`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_24rem)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.14))]" />

            <div className="relative min-w-0">
              <button
                type="button"
                ref={titleTriggerRef}
                onClick={() => {
                  const currentList = board.lists.find((item) => item.id === list.id) ?? list;
                  const currentPosition = Math.max(
                    1,
                    currentList.cards.findIndex((item) => item.id === card.id) + 1,
                  );
                  setMovePopoverOpen((current) => !current);
                  setMoveTargetListId(currentList.id);
                  setMoveTargetPosition(currentPosition);
                  setActivePanel(null);
                  setOptionsOpen(false);
                }}
                className="flex items-center gap-2 rounded-[0.8rem] border border-white/24 bg-black/12 px-3 py-1.5 text-sm text-white/92 backdrop-blur-sm"
              >
                {list.title}
                <CaretDown size={14} />
              </button>
            </div>

            <div className="relative flex items-center gap-2">
              <button
                type="button"
                ref={coverButtonRef}
                onClick={() => {
                  setActivePanel((current) => (current === "cover" ? null : "cover"));
                  setMovePopoverOpen(false);
                  setOptionsOpen(false);
                }}
                className="flex size-10 items-center justify-center rounded-[0.95rem] border border-white/14 bg-black/12 text-white/92 transition-colors hover:bg-black/22"
              >
                <ImageSquare size={18} />
              </button>
              <button
                type="button"
                ref={optionsButtonRef}
                onClick={() => setOptionsOpen((current) => !current)}
                className="flex size-10 items-center justify-center rounded-[0.95rem] border border-white/14 bg-black/12 text-white/92 transition-colors hover:bg-black/22"
              >
                <DotsThree size={20} />
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-10 items-center justify-center rounded-[0.95rem] border border-white/14 bg-black/12 text-white/92 transition-colors hover:bg-black/22"
              >
                <X size={20} />
              </button>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 overflow-hidden">
              <div
                ref={contentScrollRef}
                onScroll={handleLeftPaneScroll}
                className="flowboard-scrollbar relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-10 pb-8 pt-0"
              >
              <div className="pointer-events-none sticky top-0 z-[4] h-0 overflow-visible">
                <div
                  className={cn(
                    "-mx-10 border-b border-white/8 bg-[#26282e]/96 px-10 py-3 backdrop-blur-xl shadow-[0_14px_34px_-26px_rgba(0,0,0,0.92)] transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]",
                    stickyTitleVisible
                      ? "translate-y-0 opacity-100"
                      : "-translate-y-4 opacity-0",
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="pointer-events-auto">
                      {renderCompletionButton({ compact: true, withTooltip: true, tooltipSide: "right" })}
                    </div>
                    <p className="line-clamp-2 min-w-0 text-[1.12rem] font-semibold leading-[1.16] tracking-[-0.035em] text-white sm:text-[1.2rem]">
                      {card.title}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setActivePanel((current) => (current === "add" ? null : "add"))}
                    className="pointer-events-auto h-10 shrink-0 rounded-[0.95rem] border-white/10 bg-white/4 px-4 text-white hover:bg-white/8"
                  >
                    <Plus size={16} />
                    Adicionar
                  </Button>
                </div>
              </div>
              </div>

              <div className="w-full max-w-none pt-8">
                <div className="space-y-4">
                  <div className="min-w-0 pr-5 sm:pr-8 lg:pr-12">
                    <div className="flex items-center gap-4">
                      {renderCompletionButton({ withTooltip: true, tooltipSide: "right" })}

                      <textarea
                        ref={titleTextareaRef}
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        onBlur={persistTitle}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            persistTitle();
                          }
                        }}
                        rows={1}
                        wrap="soft"
                        className={cn(
                          "block w-full min-w-0 max-w-full resize-none overflow-hidden border-0 bg-transparent px-0 pb-0 font-semibold tracking-[-0.034em] text-white [overflow-wrap:anywhere] placeholder:text-white/40 focus:outline-none focus:ring-0",
                          titleToneClasses,
                          titleBoxClasses,
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      ref={addButtonRef}
                      data-testid="card-modal-add"
                      variant="outline"
                      onClick={() => {
                        setDeliveryPanelFromAdd(false);
                        setActivePanel((current) => (current === "add" ? null : "add"));
                      }}
                      className="h-11 shrink-0 rounded-[1rem] border-white/10 bg-white/4 px-4 text-white hover:bg-white/8"
                    >
                      <Plus size={16} />
                      Adicionar
                    </Button>
                  </div>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(16rem,18rem)]">
                  <div className="space-y-2">
                    <p className="text-[0.88rem] font-medium tracking-[-0.02em] text-[#cfd7ea]">
                      Etiquetas
                    </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {card.labels.map((label) => (
                        <LabelBadge key={label.id} label={label} modal />
                        ))}
                      <button
                        type="button"
                        ref={labelsButtonRef}
                        onClick={() => {
                          setDeliveryPanelFromAdd(false);
                          setActivePanel((current) => (current === "labels" ? null : "labels"));
                        }}
                        className="flex h-11 min-w-11 items-center justify-center rounded-[0.9rem] border border-[#8cb8ff] bg-white/[0.03] px-3 text-[#dbe6ff] transition-colors hover:bg-white/7"
                        aria-label="Editar etiquetas"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[0.88rem] font-medium tracking-[-0.02em] text-[#cfd7ea]">
                      Data de entrega
                    </p>
                    <button
                      type="button"
                      ref={datesButtonRef}
                      onClick={() => {
                        setDeliveryPanelFromAdd(false);
                        setActivePanel((current) => (current === "dates" ? null : "dates"));
                      }}
                      className="inline-flex h-11 w-full items-center justify-between rounded-[0.9rem] border border-white/10 bg-white/[0.03] px-4 text-left text-[1rem] text-white transition-colors hover:bg-white/7"
                    >
                      <span className="truncate">{dueDateLabel}</span>
                      <CaretDown size={15} className="shrink-0 text-[#cfd8eb]" />
                    </button>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  <p className="text-[0.88rem] font-medium tracking-[-0.02em] text-[#cfd7ea]">
                    Pasta dos projetos entregues
                  </p>
                  <button
                    type="button"
                    ref={deliveryButtonRef}
                    onClick={() => {
                      setDeliveryPanelFromAdd(false);
                      setActivePanel((current) => (current === "delivery" ? null : "delivery"));
                    }}
                    className="inline-flex min-h-11 w-full items-center justify-between rounded-[0.9rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-[0.98rem] text-white transition-colors hover:bg-white/7"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: getLabelPreviewColor(selectedDeliveredFolder?.color ?? "green") }}
                      />
                      <span className="truncate">
                        {selectedDeliveredFolder?.name ?? "Escolher pasta do cliente"}
                      </span>
                    </span>
                    <CaretDown size={15} className="shrink-0 text-[#cfd8eb]" />
                  </button>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    data-testid="card-modal-checklist"
                    variant="outline"
                    onClick={() => {
                      if (card.checklists.length === 0) {
                        updateChecklists(
                          [
                            {
                              id: `checklist-${crypto.randomUUID().slice(0, 8)}`,
                              title: "Checklist",
                              items: [],
                            },
                          ],
                          "Voce criou uma checklist",
                        );
                      }
                    }}
                    className="h-11 rounded-[1rem] border-white/10 bg-white/4 text-white hover:bg-white/8"
                  >
                    <CheckSquare size={16} />
                    Checklist
                  </Button>
                  <Button
                    ref={attachmentButtonRef}
                    data-testid="card-modal-attachment"
                    variant="outline"
                    onClick={() => {
                      setDeliveryPanelFromAdd(false);
                      setActivePanel((current) => (current === "attachment" ? null : "attachment"));
                    }}
                    className="h-11 rounded-[1rem] border-white/10 bg-white/4 text-white hover:bg-white/8"
                  >
                    <Paperclip size={16} />
                    Anexo
                  </Button>
                  {canOpenPomodoro ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        openForCard({
                          boardId: board.id,
                          listId: list.id,
                          cardId: card.id,
                          cardTitle: card.title,
                          labels: card.labels,
                        })
                      }
                      className="h-11 rounded-[1rem] border-[#ff754d]/16 bg-[#24110d] text-[#ffd8cf] hover:bg-[#311711]"
                    >
                      <Timer size={16} />
                      Pomodoro
                    </Button>
                  ) : null}
                </div>

                <section className="mt-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <NotePencil size={18} className="text-[#dbe2f6]" />
                      <h3 className="text-lg font-medium tracking-[-0.03em] text-white">Descricao</h3>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setEditingDescription((current) => !current)}
                      className="h-10 rounded-[0.95rem] border-white/10 bg-white/4 text-white hover:bg-white/8"
                    >
                      Editar
                    </Button>
                  </div>

                  {editingDescription ? (
                    <div className="mt-4">
                      <RichTextEditor
                        value={description}
                        onChange={setDescription}
                      />
                      <div className="mt-3 flex gap-2">
                        <Button
                          onClick={saveDescription}
                          className="h-10 rounded-[0.95rem] border border-white/10 bg-[#4f79ff] text-white hover:bg-[#6388ff]"
                        >
                          Salvar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setDescription(card.description);
                            setEditingDescription(false);
                          }}
                          className="h-10 rounded-[0.95rem] border-white/10 bg-white/4 text-white hover:bg-white/8"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[1.25rem] border border-white/8 bg-white/3 p-5">
                      {isRichTextEmpty(card.description) ? (
                        <p className="text-base leading-8 text-[#9ba5bc]">Sem descricao ainda.</p>
                      ) : (
                        <div
                          className="flowboard-rich-copy text-base leading-8 text-[#d9e0ef]"
                          dangerouslySetInnerHTML={{ __html: card.description }}
                        />
                      )}
                    </div>
                  )}
                </section>

                <ChecklistSection checklists={card.checklists} onChange={updateChecklists} />

                <section className="mt-8">
                  <div className="flex items-center gap-2">
                    <Paperclip size={18} className="text-[#dbe2f6]" />
                    <h3 className="text-lg font-medium tracking-[-0.03em] text-white">Anexos e links</h3>
                  </div>
                  <div className="mt-4 space-y-3">
                    {card.attachments.length === 0 ? (
                      <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-white/3 p-4 text-sm text-[#8f97ab]">
                        Nenhum anexo adicionado ainda.
                      </div>
                    ) : null}
                    {card.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-[1.15rem] border border-white/8 bg-white/3 px-4 py-3 text-left transition-colors hover:bg-white/6"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">{attachment.name}</p>
                          <p className="mt-1 text-xs text-[#8f97ab]">{attachment.url}</p>
                        </div>
                        <Paperclip size={16} className="text-[#cfd7e9]" />
                      </a>
                    ))}
                  </div>
                </section>

                <section className="mt-8 space-y-3 pb-4">
                  {card.customFields.length > 0 ? (
                    <>
                      <h3 className="text-lg font-medium tracking-[-0.03em] text-white">
                        Campos personalizados
                      </h3>
                      {card.customFields.map((field) => (
                        <div
                          key={field.id}
                          className="rounded-[1.15rem] border border-white/8 bg-white/3 px-4 py-3"
                        >
                          <p className="text-xs tracking-[0.2em] text-[#7f8bad] uppercase">{field.name}</p>
                          <p className="mt-2 text-sm text-white">{field.value}</p>
                        </div>
                      ))}
                    </>
                  ) : null}

                </section>
              </div>
            </div>

            <div
              className={cn(
                "min-h-0 shrink-0 overflow-hidden transition-[width,opacity,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                commentsPanelOpen
                  ? "w-[500px] border-l border-white/8 opacity-100"
                  : "w-0 border-l border-transparent opacity-0",
              )}
              aria-hidden={!commentsPanelOpen}
            >
              <aside className="flowboard-scrollbar h-full min-h-0 w-[500px] overflow-y-auto overflow-x-hidden bg-[#1b1e25] px-7 py-6 pb-24">
                <div className="space-y-4">
                  <CommentsActivity
                    comments={card.comments}
                    activity={card.activity}
                    currentUser={currentUser}
                    mentionableMembers={board.members}
                    onAddComment={addComment}
                  />
                </div>
              </aside>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[5] flex justify-center px-4">
            <div className="pointer-events-auto inline-flex items-center rounded-[1.15rem] border border-white/10 bg-[#191c23]/96 p-1.5 shadow-[0_24px_64px_-30px_rgba(0,0,0,0.96)] backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setCommentsPanelOpen((current) => !current)}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-[0.9rem] px-4 text-sm font-medium transition-colors",
                  commentsPanelOpen
                    ? "bg-[#2b4f99] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-[#3660bb]"
                    : "bg-transparent text-[#dbe3f7] hover:bg-white/6",
                )}
              >
                <ChatCircleText size={18} />
                Comentarios
              </button>
            </div>
          </div>
        </div>
      </DialogContent>

      <FloatingPanel
        anchorRef={titleTriggerRef}
        open={movePopoverOpen}
        placement="bottom"
        align="start"
        offset={14}
        estimatedWidth={380}
        estimatedHeight={420}
        className="z-[150]"
      >
        <div ref={movePanelRef}>
          <MoveCardPopover
            board={board}
            sourceList={list}
            card={card}
            targetListId={moveTargetListId}
            targetPosition={normalizedMoveTargetPosition}
            onTargetListChange={(nextListId) => {
              const nextList = board.lists.find((item) => item.id === nextListId) ?? list;
              const cardsWithoutCurrent = nextList.cards.filter((item) => item.id !== card.id);
              setMoveTargetListId(nextListId);
              setMoveTargetPosition(Math.min(moveTargetPosition, cardsWithoutCurrent.length + 1));
            }}
            onTargetPositionChange={setMoveTargetPosition}
            onMove={handleMoveCard}
            onClose={() => setMovePopoverOpen(false)}
          />
        </div>
      </FloatingPanel>

      <FloatingPanel
        anchorRef={panelAnchorRef}
        open={Boolean(activePanel)}
        placement="bottom"
        align={activePanel === "labels" || activePanel === "dates" ? "start" : "start"}
        estimatedWidth={
          activePanel === "dates"
            ? 360
            : activePanel === "cover"
              ? 372
            : activePanel === "delivery"
              ? 360
            : activePanel === "labels"
              ? 405
              : activePanel === "attachment" || activePanel === "members" || activePanel === "location" || activePanel === "fields"
                ? 360
                : activePanel === "add"
                  ? 380
                  : 420
        }
        estimatedHeight={
          activePanel === "dates"
            ? 720
            : activePanel === "cover"
              ? 560
            : activePanel === "delivery"
              ? 360
            : activePanel === "labels"
              ? 640
              : activePanel === "attachment"
                ? 320
              : activePanel === "add"
                ? 640
                : 420
        }
      >
        <div ref={panelRef}>
          {activePanel === "add" ? (
            <AddToCardPopover
              onClose={() => setActivePanel(null)}
              onSelect={(value) => {
                setDeliveryPanelFromAdd(value === "delivery");
                setActivePanel(value === "checklist" ? null : value);
                if (value === "checklist" && card.checklists.length === 0) {
                  updateChecklists(
                    [
                      ...card.checklists,
                      {
                        id: `checklist-${crypto.randomUUID().slice(0, 8)}`,
                        title: "Checklist",
                        items: [],
                      },
                    ],
                    "Voce criou uma checklist",
                  );
                }
              }}
            />
          ) : null}

          {activePanel === "labels" ? (
            <LabelsPopover
              labels={card.labels}
              catalog={board.labelCatalog}
              onChange={updateLabels}
              onCreateLabel={(label) => upsertBoardLabel(board.id, label)}
              onUpdateLabel={(label) => upsertBoardLabel(board.id, label)}
              onDeleteLabel={(labelId) => removeBoardLabel(board.id, labelId)}
              onClose={() => setActivePanel(null)}
            />
          ) : null}

          {activePanel === "dates" ? (
            <DatesPopover
              dates={card.dates}
              onSave={updateDates}
              onRemove={removeDates}
              onClose={() => setActivePanel(null)}
            />
          ) : null}

          {activePanel === "cover" ? (
            <CardCoverPopover
              cover={card.cover}
              onToneChange={handleCoverToneChange}
              onSizeChange={handleCoverSizeChange}
              onImageUpload={handleCoverImageUpload}
              onRemoveImage={handleRemoveCoverImage}
              uploading={uploadingCover}
              onClose={() => setActivePanel(null)}
            />
          ) : null}

          {activePanel === "delivery" ? (
            <div className="w-[360px] rounded-[1.45rem] border border-white/10 bg-[#2a2c31] p-4 shadow-[0_24px_60px_-26px_rgba(0,0,0,0.95)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-medium text-white">Projetos entregues</h3>
                  <p className="mt-1 text-sm leading-6 text-[#96a3bd]">
                    Escolha a pasta final onde esta entrega vai aparecer.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {board.deliveredFolders.map((folder) => {
                  const active = folder.id === card.deliveredFolderId;
                  return (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => {
                        onUpdateCard(
                          { deliveredFolderId: folder.id },
                          `Voce vinculou este card a pasta ${folder.name}`,
                        );
                        setDeliveryPanelFromAdd(false);
                        setActivePanel(null);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-[1rem] border px-3 py-3 text-left transition-colors",
                        active
                          ? "border-[#4f79ff]/42 bg-[#1d2740] text-white"
                          : "border-white/8 bg-white/[0.03] text-[#d8e0ef] hover:bg-white/[0.06]",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: getLabelPreviewColor(folder.color) }}
                        />
                        <span className="truncate">{folder.name}</span>
                      </span>
                      {active ? <Check size={16} className="text-[#9dc0ff]" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {activePanel === "members" ? (
            <div className="w-[360px] rounded-[1.45rem] border border-white/10 bg-[#2a2c31] p-4 shadow-[0_24px_60px_-26px_rgba(0,0,0,0.95)]">
              <h3 className="text-lg font-medium text-white">Membros</h3>
              <div className="mt-4 space-y-2">
                {board.members.map((member) => {
                  const active = attachedMembers.some((item) => item.id === member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleMember(member)}
                      className={`flex w-full items-center justify-between rounded-[1rem] border px-3 py-3 ${
                        active
                          ? "border-white/14 bg-white/8 text-white"
                          : "border-white/7 bg-white/3 text-[#cbd3e5] hover:bg-white/6"
                      }`}
                    >
                      <span>{member.name}</span>
                      <span className="text-xs text-[#8f97ab]">{active ? "Atribuido" : "Adicionar"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {activePanel === "attachment" ? (
            <div className="w-[360px] rounded-[1.45rem] border border-white/10 bg-[#2a2c31] p-4 shadow-[0_24px_60px_-26px_rgba(0,0,0,0.95)]">
              <h3 className="text-lg font-medium text-white">Anexo</h3>
              <div className="mt-4 space-y-3">
                <Input
                  value={draftAttachmentName}
                  onChange={(event) => setDraftAttachmentName(event.target.value)}
                  placeholder="Nome do link"
                  className="h-11 rounded-[1rem] border-white/10 bg-[#1f2229] text-white"
                />
                <Input
                  value={draftAttachmentUrl}
                  onChange={(event) => setDraftAttachmentUrl(event.target.value)}
                  placeholder="https://..."
                  className="h-11 rounded-[1rem] border-white/10 bg-[#1f2229] text-white"
                />
                <Button
                  onClick={addAttachment}
                  className="h-11 w-full rounded-[1rem] border border-white/10 bg-[#4f79ff] text-white hover:bg-[#6388ff]"
                >
                  Adicionar link
                </Button>
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/8" />
                  <span className="text-xs text-[#8793aa]">ou</span>
                  <div className="h-px flex-1 bg-white/8" />
                </div>
                <input
                  ref={attachmentFileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void handleAttachmentFileUpload(file);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadingAttachment}
                  onClick={() => attachmentFileInputRef.current?.click()}
                  className="h-11 w-full rounded-[1rem] border-white/10 bg-white/4 text-white hover:bg-white/8"
                >
                  <Paperclip size={16} />
                  {uploadingAttachment ? "Enviando arquivo..." : "Carregar arquivo"}
                </Button>
              </div>
            </div>
          ) : null}

          {activePanel === "location" ? (
            <div className="w-[360px] rounded-[1.45rem] border border-white/10 bg-[#2a2c31] p-4 shadow-[0_24px_60px_-26px_rgba(0,0,0,0.95)]">
              <h3 className="text-lg font-medium text-white">Local</h3>
              <Input
                value={draftLocation}
                onChange={(event) => setDraftLocation(event.target.value)}
                placeholder="Ex.: Rua Augusta, Sao Paulo"
                className="mt-4 h-11 rounded-[1rem] border-white/10 bg-[#1f2229] text-white"
              />
              <Button
                onClick={saveLocation}
                className="mt-3 h-11 w-full rounded-[1rem] border border-white/10 bg-[#4f79ff] text-white hover:bg-[#6388ff]"
              >
                Salvar local
              </Button>
            </div>
          ) : null}

          {activePanel === "fields" ? (
            <div className="w-[360px] rounded-[1.45rem] border border-white/10 bg-[#2a2c31] p-4 shadow-[0_24px_60px_-26px_rgba(0,0,0,0.95)]">
              <h3 className="text-lg font-medium text-white">Campos personalizados</h3>
              <div className="mt-4 space-y-3">
                <Input
                  value={fieldName}
                  onChange={(event) => setFieldName(event.target.value)}
                  placeholder="Nome do campo"
                  className="h-11 rounded-[1rem] border-white/10 bg-[#1f2229] text-white"
                />
                <Input
                  value={fieldValue}
                  onChange={(event) => setFieldValue(event.target.value)}
                  placeholder="Valor"
                  className="h-11 rounded-[1rem] border-white/10 bg-[#1f2229] text-white"
                />
                <Button
                  onClick={addCustomField}
                  className="h-11 w-full rounded-[1rem] border border-white/10 bg-[#4f79ff] text-white hover:bg-[#6388ff]"
                >
                  Adicionar campo
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </FloatingPanel>

      <FloatingPanel
        anchorRef={optionsButtonRef}
        open={optionsOpen}
        align="end"
        estimatedWidth={260}
        estimatedHeight={220}
        offset={12}
      >
        <div
          ref={optionsPanelRef}
          className="w-[260px] overflow-hidden rounded-[1.15rem] border border-white/10 bg-[#23262f] p-1.5 shadow-[0_32px_90px_-36px_rgba(0,0,0,0.98)]"
        >
          <button
            type="button"
            onClick={handleDuplicateCard}
            className="flex w-full items-center gap-3 rounded-[0.9rem] px-3 py-3 text-left text-[0.98rem] text-[#dde5f6] transition-colors hover:bg-white/6"
          >
            <Copy size={16} className="text-[#c3d0eb]" />
            Duplicar card
          </button>
          <button
            type="button"
            onClick={handleSaveTemplate}
            className="flex w-full items-center gap-3 rounded-[0.9rem] px-3 py-3 text-left text-[0.98rem] text-[#dde5f6] transition-colors hover:bg-white/6"
          >
            <Layout size={16} className="text-[#c3d0eb]" />
            Usar como template
          </button>
          <button
            type="button"
            onClick={handleDeleteCard}
            className="flex w-full items-center gap-3 rounded-[0.9rem] px-3 py-3 text-left text-[0.98rem] text-[#ffb2b2] transition-colors hover:bg-[#7c2e35]/24"
          >
            <Trash size={16} className="text-[#ff8f8f]" />
            Excluir card
          </button>
        </div>
      </FloatingPanel>
    </Dialog>
  );
}
