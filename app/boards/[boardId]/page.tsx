import { BoardRoute } from "@/components/board-route";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;

  return <BoardRoute boardId={boardId} />;
}
