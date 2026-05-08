"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ClientLayout } from "@/components/client-layout";
import { Topbar } from "@/components/topbar";
import { BoardContainer } from "@/components/board-container";
import { Board } from "@/components/board";
import { FilterPanel } from "@/components/filter-panel";
import { useFlowBoardData } from "@/hooks/use-flowboard-store";

export function ClientBoardPage({ boardId }: { boardId?: string }) {
  const { board, boards, filters, stats, updateFilters, clearFilters, updateBoard, addCard } =
    useFlowBoardData(boardId);
  const [shareOpen, setShareOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const activeBoard = useMemo(() => {
    if (board) {
      return board;
    }

    return boards[0];
  }, [board, boards]);

  useEffect(() => {
    if (!activeBoard || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem("flowboard-active-board-id", activeBoard.id);
  }, [activeBoard]);

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
        onAddDemand={({ listId, title, description }) => {
          addCard(activeBoard.id, listId, {
            title,
            description: description ?? "",
          });
        }}
        onFilter={() => setFilterOpen(true)}
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
