"use client";

import { useMemo } from "react";
import { useFlowBoardStore } from "@/components/providers/flowboard-provider";

export function useFlowBoardData(boardId?: string) {
  const store = useFlowBoardStore();

  const board = useMemo(
    () => store.boards.find((item) => item.id === boardId),
    [boardId, store.boards],
  );

  const stats = useMemo(
    () => (boardId ? store.getBoardStats(boardId) : undefined),
    [boardId, store],
  );

  const filters = useMemo(
    () => (boardId ? store.filters[boardId] : undefined),
    [boardId, store.filters],
  );

  return {
    ...store,
    board,
    stats,
    filters,
  };
}
