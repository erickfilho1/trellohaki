"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, DotsThree, Eye, FolderSimplePlus, PencilSimple, SealCheck, Trash, X } from "@phosphor-icons/react";
import { ClientLayout } from "@/components/client-layout";
import { DeliveredProjectSummaryModal } from "@/components/delivered-project-summary-modal";
import { FloatingPanel } from "@/components/floating-panel";
import { useAuth } from "@/components/providers/auth-provider";
import { Topbar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createId, getLabelPreviewColor } from "@/lib/flowboard-helpers";
import { useFlowBoardData } from "@/hooks/use-flowboard-store";
import { cn } from "@/lib/utils";
import type { DeliveredFolderRecord, ProjectSummaryRecord } from "@/lib/flowboard-types";
import type { LabelTone } from "@/types/board";

const FOLDER_COLORS: LabelTone[] = ["green", "blue", "orange", "purple", "cyan", "pink"];

function getDeliveredListCards(board: NonNullable<ReturnType<typeof useFlowBoardData>["board"]>) {
  const deliveredList = board.lists.at(-1);
  return deliveredList?.cards ?? [];
}

export function DeliveredProjectsPage() {
  const { user } = useAuth();
  const {
    boards,
    workspaceAccess,
    updateBoard,
    updateCard,
    renameDeliveredFolder,
    deleteDeliveredFolder,
  } = useFlowBoardData();
  const [activeBoardId] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem("flowboard-active-board-id");
  });
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderMenuOpenId, setFolderMenuOpenId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [summaryCardId, setSummaryCardId] = useState<string | null>(null);
  const folderMenuAnchorRef = useRef<HTMLButtonElement | null>(null);
  const folderMenuPanelRef = useRef<HTMLDivElement | null>(null);

  const accessibleBoards = useMemo(() => {
    if (user.panel === "admin") {
      return boards;
    }

    const allowedBoardIds = new Set(
      workspaceAccess
        .filter((access) => access.userId === user.id)
        .map((access) => access.boardId),
    );

    return boards.filter((candidate) => allowedBoardIds.has(candidate.id));
  }, [boards, user.id, user.panel, workspaceAccess]);

  const activeBoard = useMemo(() => {
    if (!accessibleBoards.length) {
      return undefined;
    }

    return accessibleBoards.find((board) => board.id === activeBoardId) ?? accessibleBoards[0];
  }, [accessibleBoards, activeBoardId]);

  const deliveredCards = useMemo(() => {
    if (!activeBoard) {
      return [];
    }

    return getDeliveredListCards(activeBoard);
  }, [activeBoard]);

  const resolvedActiveFolderId =
    activeFolderId && activeBoard?.deliveredFolders.some((folder) => folder.id === activeFolderId)
      ? activeFolderId
      : activeBoard?.deliveredFolders[0]?.id ?? null;

  const folderCards = useMemo(() => {
    if (!resolvedActiveFolderId) {
      return deliveredCards;
    }

    return deliveredCards.filter((card) => card.deliveredFolderId === resolvedActiveFolderId);
  }, [resolvedActiveFolderId, deliveredCards]);

  const activeFolder = useMemo(
    () => activeBoard?.deliveredFolders.find((folder) => folder.id === resolvedActiveFolderId),
    [activeBoard, resolvedActiveFolderId],
  );
  const deliveredListId = activeBoard?.lists.at(-1)?.id;
  const selectedSummaryCard = useMemo(
    () => folderCards.find((card) => card.id === summaryCardId) ?? null,
    [folderCards, summaryCardId],
  );

  useEffect(() => {
    if (!folderMenuOpenId) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (folderMenuPanelRef.current?.contains(target) || folderMenuAnchorRef.current?.contains(target)) {
        return;
      }

      setFolderMenuOpenId(null);
      setEditingFolderId(null);
      setEditingFolderName("");
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setFolderMenuOpenId(null);
        setEditingFolderId(null);
        setEditingFolderName("");
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [folderMenuOpenId]);

  function handleCreateFolder() {
    if (!activeBoard || !newFolderName.trim()) {
      return;
    }

    const createdAt = new Date().toISOString();
    const nextFolder: DeliveredFolderRecord = {
      id: createId("delivered-folder"),
      name: newFolderName.trim(),
      color: FOLDER_COLORS[activeBoard.deliveredFolders.length % FOLDER_COLORS.length],
      createdAt,
    };

    updateBoard(activeBoard.id, {
      deliveredFolders: [...activeBoard.deliveredFolders, nextFolder],
    });
    setActiveFolderId(nextFolder.id);
    setNewFolderName("");
  }

  function openFolderMenu(
    folder: DeliveredFolderRecord,
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    folderMenuAnchorRef.current = event.currentTarget;
    setFolderMenuOpenId((current) => (current === folder.id ? null : folder.id));
    setEditingFolderId(null);
    setEditingFolderName(folder.name);
  }

  function startFolderRename(folder: DeliveredFolderRecord) {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  }

  function submitFolderRename(folderId: string) {
    if (!activeBoard || !editingFolderName.trim()) {
      return;
    }

    renameDeliveredFolder(activeBoard.id, folderId, editingFolderName);
    setEditingFolderId(null);
    setFolderMenuOpenId(null);
    setEditingFolderName("");
  }

  function handleDeleteFolder(folderId: string) {
    if (!activeBoard) {
      return;
    }

    const fallbackFolder = activeBoard.deliveredFolders.find((folder) => folder.id !== folderId);
    deleteDeliveredFolder(activeBoard.id, folderId);
    if (resolvedActiveFolderId === folderId) {
      setActiveFolderId(fallbackFolder?.id ?? null);
    }
    setFolderMenuOpenId(null);
    setEditingFolderId(null);
    setEditingFolderName("");
  }

  if (!activeBoard) {
    return (
      <div className="grid min-h-[100dvh] place-items-center px-6 text-center text-white">
        <div className="glass-panel max-w-lg rounded-[2rem] border border-white/8 bg-[#131925]/92 p-8">
          <p className="text-sm tracking-[0.24em] text-[#7f8bad] uppercase">Sem quadro ativo</p>
          <h1 className="mt-4 text-3xl font-semibold">Nenhum cliente foi configurado ainda.</h1>
        </div>
      </div>
    );
  }

  return (
    <ClientLayout projectName={activeBoard.name}>
      <Topbar
        title="Projetos entregues"
        subtitle={`Pastas finais e entregas consolidadas de ${activeBoard.name}.`}
      />

      <div className="flowboard-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 lg:px-6">
        <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-5 pb-12">
          <section
            data-light-surface="true"
            className="rounded-[1.6rem] border border-white/8 bg-[linear-gradient(180deg,#151515,#101010)] p-5 shadow-[0_28px_80px_-48px_rgba(0,0,0,0.9)]"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7f8bad]">
                  Pastas do cliente
                </p>
                <h2 className="mt-2 text-[1.35rem] font-semibold text-white">
                  Estruture as entregas finais por cliente ou projeto
                </h2>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="flowboard-scrollbar -mx-1 overflow-x-auto px-1 pb-1">
                <div className="flex gap-3">
                  {activeBoard.deliveredFolders.map((folder) => {
                    const active = folder.id === resolvedActiveFolderId;
                    const folderCount = deliveredCards.filter((card) => card.deliveredFolderId === folder.id).length;
                    const isEditing = editingFolderId === folder.id;
                    const canDelete = activeBoard.deliveredFolders.length > 1;

                    return (
                      <div
                        key={folder.id}
                        data-light-keep-dark={active ? "true" : undefined}
                        className={cn(
                          "relative min-w-[15rem] rounded-[1.2rem] border px-4 py-4 text-left transition-all duration-200",
                          active
                            ? "border-[#ff6b57]/34 bg-[#211211] text-white shadow-[0_18px_48px_-28px_rgba(0,0,0,0.85)]"
                            : "border-white/8 bg-white/[0.03] text-[#d5ddef] hover:bg-white/[0.05]",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => setActiveFolderId(folder.id)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span
                                className="size-3 rounded-full"
                                style={{ backgroundColor: getLabelPreviewColor(folder.color) }}
                              />
                                <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[11px] text-[#a3b0c8]">
                                  {folderCount} projetos
                                </span>
                            </div>
                            <p className="mt-4 truncate text-[1rem] font-medium text-white">{folder.name}</p>
                          </button>

                          <button
                            type="button"
                            onClick={(event) => openFolderMenu(folder, event)}
                            className={cn(
                              "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[0.95rem] border text-[#cdd6e8] transition-colors",
                              folderMenuOpenId === folder.id
                                ? "border-white/14 bg-white/[0.08]"
                                : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06]",
                            )}
                          >
                            <DotsThree size={18} />
                          </button>
                        </div>

                        <FloatingPanel
                          anchorRef={folderMenuAnchorRef}
                          open={folderMenuOpenId === folder.id}
                          align="end"
                          estimatedWidth={290}
                          estimatedHeight={isEditing ? 220 : 170}
                          offset={10}
                          className="z-[150]"
                        >
                          <div
                            ref={folderMenuPanelRef}
                            data-light-keep-dark="true"
                            className="w-[290px] overflow-hidden rounded-[1.2rem] border border-white/10 bg-[#151515] p-1.5 shadow-[0_32px_90px_-36px_rgba(0,0,0,0.98)]"
                          >
                            {isEditing ? (
                              <div className="space-y-3 px-2 py-2">
                                <div className="flex items-center justify-between">
                                  <h3 className="text-sm font-medium text-white">Renomear pasta</h3>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingFolderId(null);
                                      setEditingFolderName("");
                                    }}
                                    className="flex size-8 items-center justify-center rounded-[0.8rem] text-[#b9c4d8] transition-colors hover:bg-white/6"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                                <Input
                                  value={editingFolderName}
                                  onChange={(event) => setEditingFolderName(event.target.value)}
                                  placeholder="Nome da pasta"
                                  className="h-11 rounded-[0.95rem] border-white/10 bg-[#1c2028] text-sm text-white"
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      submitFolderRename(folder.id);
                                    }
                                  }}
                                />
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => submitFolderRename(folder.id)}
                                    className="h-10 flex-1 rounded-[0.95rem] border border-white/10 bg-[#dc3933] text-white hover:bg-[#ef5148]"
                                  >
                                    <Check size={16} />
                                    Salvar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setEditingFolderId(null);
                                      setEditingFolderName("");
                                    }}
                                    className="h-10 rounded-[0.95rem] border-white/10 bg-white/4 text-white hover:bg-white/8"
                                  >
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startFolderRename(folder)}
                                  className="flex w-full items-center gap-3 rounded-[0.95rem] px-3 py-3 text-left text-[0.96rem] text-[#e1e8f6] transition-colors hover:bg-white/6"
                                >
                                  <PencilSimple size={16} className="text-[#c8d3e7]" />
                                  Renomear pasta
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteFolder(folder.id)}
                                  disabled={!canDelete}
                                  className={cn(
                                    "flex w-full items-center gap-3 rounded-[0.95rem] px-3 py-3 text-left text-[0.96rem] transition-colors",
                                    canDelete
                                      ? "text-[#ffb2b2] hover:bg-[#7c2e35]/24"
                                      : "cursor-not-allowed text-[#74809b]",
                                  )}
                                >
                                  <Trash size={16} className={cn(canDelete ? "text-[#ff8f8f]" : "text-[#74809b]")} />
                                  Excluir pasta
                                </button>
                                {!canDelete ? (
                                  <p className="px-3 pb-2 pt-1 text-[0.78rem] leading-5 text-[#8e9bb4]">
                                    Mantenha pelo menos uma pasta para continuar recebendo projetos concluídos.
                                  </p>
                                ) : null}
                              </>
                            )}
                          </div>
                        </FloatingPanel>
                      </div>
                    );
                  })}
                </div>
              </div>

                <div
                  data-light-subtle="true"
                  className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4"
                >
                <p className="text-sm font-medium text-[#4f5868]">Criar pasta</p>
                <div className="mt-3 flex gap-2">
                  <Input
                    value={newFolderName}
                    onChange={(event) => setNewFolderName(event.target.value)}
                    placeholder="Ex.: Cliente Astoria"
                    className="h-11 rounded-[1rem] border-white/10 bg-white/4 text-white"
                  />
                  <Button
                    data-light-keep-dark="true"
                    onClick={handleCreateFolder}
                    className="h-11 rounded-[1rem] border border-white/10 bg-[#dc3933] px-4 text-white hover:bg-[#ef5148]"
                  >
                    <FolderSimplePlus size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section
            data-light-surface="true"
            className="rounded-[1.6rem] border border-white/8 bg-[linear-gradient(180deg,#151515,#101010)] p-5 shadow-[0_28px_80px_-48px_rgba(0,0,0,0.9)]"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7f8bad]">
                  Entregas vinculadas
                </p>
                <h2 className="mt-2 text-[1.35rem] font-semibold text-white">
                  {activeFolder?.name ?? "Projetos entregues"}
                </h2>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-sm text-emerald-200">
                <SealCheck size={16} weight="fill" />
                {folderCards.length} entregas
              </div>
            </div>

            {folderCards.length === 0 ? (
              <div
                data-light-subtle="true"
                className="rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.025] px-5 py-10 text-sm leading-7 text-[#92a0b9]"
              >
                Assim que uma demanda vinculada a esta pasta cair na ultima lista do quadro, ela aparece aqui automaticamente.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {folderCards.map((card) => (
                  <article
                    key={card.id}
                    data-light-keep-dark="true"
                    className="rounded-[1.35rem] border border-white/8 bg-[#111111] p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7f8bad]">
                          Entregue em
                        </p>
                        <p className="mt-2 text-sm text-[#d8dff0]">
                          {card.dates.dueDate
                            ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(card.dates.dueDate))
                            : "Sem data final"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-sm text-emerald-200">
                        <SealCheck size={16} weight="fill" />
                        Entregue
                      </div>
                    </div>

                    <h3 className="mt-5 text-[1.6rem] font-semibold leading-tight text-white">{card.title}</h3>
                    <button
                      type="button"
                      onClick={() => setSummaryCardId(card.id)}
                      className="mt-6 flex items-center gap-2 rounded-[1rem] border border-white/10 bg-white/4 px-4 py-3 text-sm text-white transition-colors hover:bg-white/8"
                    >
                      <Eye size={16} />
                      Ver resumo
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <DeliveredProjectSummaryModal
        key={selectedSummaryCard?.id ?? "summary-empty"}
        open={Boolean(summaryCardId && selectedSummaryCard)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSummaryCardId(null);
          }
        }}
        card={selectedSummaryCard}
        folderName={activeFolder?.name ?? activeBoard.name}
        onSave={(summary: ProjectSummaryRecord) => {
          if (!selectedSummaryCard || !deliveredListId) {
            return;
          }

          updateCard(activeBoard.id, deliveredListId, selectedSummaryCard.id, {
            projectSummary: summary,
          });
        }}
      />
    </ClientLayout>
  );
}
