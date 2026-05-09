"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ClientLayout } from "@/components/client-layout";
import { useAuth } from "@/components/providers/auth-provider";
import { Topbar } from "@/components/topbar";
import { BoardContainer } from "@/components/board-container";
import { Board } from "@/components/board";
import { FilterPanel } from "@/components/filter-panel";
import { cleanProfileName } from "@/lib/account-settings";
import { createComment } from "@/lib/flowboard-helpers";
import { useFlowBoardData } from "@/hooks/use-flowboard-store";

export function ClientBoardPage({ boardId }: { boardId?: string }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [preferredBoardId, setPreferredBoardId] = useState<string | null>(() => {
    if (typeof window === "undefined" || boardId) {
      return null;
    }

    return window.localStorage.getItem("flowboard-active-board-id");
  });
  const resolvedBoardId = boardId ?? preferredBoardId ?? undefined;
  const {
    board,
    boards,
    workspaceAccess,
    filters,
    stats,
    updateFilters,
    clearFilters,
    updateBoard,
    addCard,
    updateCard,
  } = useFlowBoardData(resolvedBoardId);
  const [shareOpen, setShareOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

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
    if (board && accessibleBoards.some((candidate) => candidate.id === board.id)) {
      return board;
    }

    return accessibleBoards[0];
  }, [accessibleBoards, board]);

  const currentMember = useMemo(() => {
    if (!activeBoard) {
      return undefined;
    }

    const cleanedUserName = cleanProfileName(user.name).toLowerCase();
    return (
      activeBoard.members.find((member) => {
        const cleanedMemberName = cleanProfileName(member.name).toLowerCase();
        return (
          member.id === "member-erick" ||
          member.handle === "@erickfilho281" ||
          cleanedMemberName === cleanedUserName
        );
      }) ?? activeBoard.members[0]
    );
  }, [activeBoard, user.name]);

  useEffect(() => {
    if (!activeBoard || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem("flowboard-active-board-id", activeBoard.id);

    if (!boardId) {
      setPreferredBoardId(activeBoard.id);
    }
  }, [activeBoard]);

  useEffect(() => {
    setFilterOpen(false);
  }, [activeBoard?.id]);

  useEffect(() => {
    setFilterOpen(false);
  }, [pathname]);

  if (!activeBoard) {
    return (
      <div className="grid min-h-[100dvh] place-items-center px-6 text-center text-white">
        <div className="glass-panel max-w-lg rounded-[2rem] border border-white/8 bg-[#131925]/92 p-8">
          <p className="text-sm tracking-[0.24em] text-[#7f8bad] uppercase">Sem quadro ativo</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em]">
            Nenhum projeto foi configurado ainda.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#9aa4bb]">
            Assim que um quadro for criado, ele aparecera aqui como mapa principal do cliente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClientLayout projectName={activeBoard.name}>
      <Topbar
        title={activeBoard.name}
        board={activeBoard}
        onAddDemand={(payload) => {
          if (payload.mode === "create-demand") {
            addCard(activeBoard.id, payload.listId, {
              title: payload.title,
              description: payload.description ?? "",
            });
            return;
          }

          const targetList = activeBoard.lists.find((list) => list.id === payload.listId);
          const targetCard = targetList?.cards.find((card) => card.id === payload.cardId);

          if (!targetList || !targetCard || !currentMember) {
            return;
          }

          updateCard(
            activeBoard.id,
            targetList.id,
            targetCard.id,
            {
              comments: [...targetCard.comments, createComment(currentMember, payload.comment)],
            },
            "Você solicitou uma alteração neste card",
          );
        }}
        onFilter={() => setFilterOpen((current) => !current)}
        onUpdateBoardAccent={(accent) => updateBoard(activeBoard.id, { accent })}
        filterButtonRef={filterButtonRef}
        filters={filters}
        compact
      />
      <BoardContainer>
        <Board board={activeBoard} shareOpen={shareOpen} onShareOpenChange={setShareOpen} />
      </BoardContainer>
      {filters && stats ? (
        <FilterPanel
          board={activeBoard}
          filters={filters}
          filteredCount={stats.filteredCards}
          totalCount={stats.totalCards}
          open={filterOpen}
          anchorRef={filterButtonRef}
          onClose={() => setFilterOpen(false)}
          onUpdateFilters={(updates) => updateFilters(activeBoard.id, updates)}
          onClearFilters={() => clearFilters(activeBoard.id)}
        />
      ) : null}
    </ClientLayout>
  );
}
