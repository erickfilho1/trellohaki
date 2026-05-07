"use client";

import { ClientBoardPage } from "@/components/client-board-page";
import { useFlowBoardData } from "@/hooks/use-flowboard-store";

export function BoardRoute({ boardId }: { boardId: string }) {
  const { board } = useFlowBoardData(boardId);

  if (!board) {
    return <ClientBoardPage />;
  }

  return <ClientBoardPage boardId={boardId} />;
}
