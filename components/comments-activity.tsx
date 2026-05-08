"use client";

import { useMemo, useState } from "react";
import { ChatCircleText } from "@phosphor-icons/react";
import { CommentEditor } from "@/components/editor/comment-editor";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { isRichTextEmpty, relativeTimestamp } from "@/lib/flowboard-helpers";
import type { ActivityRecord, CommentRecord, MemberRecord } from "@/lib/flowboard-types";

type FeedItem =
  | { type: "comment"; data: CommentRecord }
  | { type: "activity"; data: ActivityRecord };

export function CommentsActivity({
  comments,
  activity,
  currentUser,
  mentionableMembers = [],
  onAddComment,
}: {
  comments: CommentRecord[];
  activity: ActivityRecord[];
  currentUser?: MemberRecord;
  mentionableMembers?: MemberRecord[];
  onAddComment: (text: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  const feed = useMemo<FeedItem[]>(() => {
    const mapped: FeedItem[] = [
      ...comments.map((item) => ({ type: "comment" as const, data: item })),
      ...activity.map((item) => ({ type: "activity" as const, data: item })),
    ];

    return mapped.sort(
      (a, b) =>
        new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime(),
    );
  }, [activity, comments]);

  function handleSave() {
    if (isRichTextEmpty(draft)) {
      return;
    }

    onAddComment(draft);
    setDraft("");
    setExpanded(false);
  }

  return (
    <section className="flex h-full min-h-0 flex-col rounded-[1.35rem] bg-[#1e2026] p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ChatCircleText size={18} className="text-[#d8dff0]" />
          <h3 className="text-[1.15rem] font-medium tracking-[-0.03em] text-white">
            Comentarios e atividade
          </h3>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowDetails((current) => !current)}
          className="h-10 rounded-[0.95rem] border-white/10 bg-white/4 px-4 text-white hover:bg-white/8"
        >
          {showDetails ? "Menos detalhes" : "Mostrar detalhes"}
        </Button>
      </div>

      <div className="mt-5 flex gap-3">
        <Avatar className="bg-[#182131]" size="sm">
          <AvatarFallback className="bg-[#2a3550] text-[#eaf0ff]">
            {currentUser?.initials ?? "FB"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          {expanded ? (
            <div className="rounded-[1rem] border border-white/10 bg-white/4 p-3">
              <CommentEditor
                value={draft}
                onChange={setDraft}
                mentionableMembers={mentionableMembers}
              />
              <div className="mt-3 flex items-center gap-2">
                <Button
                  data-testid="save-comment"
                  onClick={handleSave}
                  className="h-10 rounded-[0.9rem] border border-white/10 bg-[#4f79ff] text-white hover:bg-[#6388ff]"
                >
                  Salvar comentario
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setExpanded(false);
                    setDraft("");
                  }}
                  className="h-10 rounded-[0.9rem] border-white/10 bg-white/4 text-white hover:bg-white/8"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="flex h-12 w-full items-center rounded-[1rem] border border-white/10 bg-white/4 px-4 text-left text-[#8892a8]"
            >
              Escrever um comentario...
            </button>
          )}
        </div>
      </div>

      <div className="flowboard-scrollbar mt-5 flex-1 space-y-3 overflow-y-auto pr-1">
        {feed.map((item) =>
          item.type === "comment" ? (
            <div key={item.data.id} className="rounded-[1rem] border border-white/8 bg-white/4 p-3">
              <div className="flex items-center gap-3">
                <Avatar className="bg-[#182131]" size="sm">
                  <AvatarFallback className="bg-[#2a3550] text-[#eaf0ff]">
                    {item.data.author.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-white">{item.data.author.name}</p>
                  <p className="text-xs text-[#8d97ad]">
                    {relativeTimestamp(item.data.createdAt)}
                  </p>
                </div>
              </div>
              <div
                className="flowboard-rich-copy mt-3 text-sm leading-6 text-[#d0d8ea]"
                dangerouslySetInnerHTML={{ __html: item.data.text }}
              />
            </div>
          ) : showDetails ? (
            <div key={item.data.id} className="rounded-[1rem] border border-white/6 bg-black/10 px-3 py-2.5 text-sm text-[#aab3c9]">
              <span className="text-[#dce3f2]">{item.data.text}</span>
              <span className="ml-2 text-[#7f8bad]">{relativeTimestamp(item.data.createdAt)}</span>
            </div>
          ) : null,
        )}
      </div>
    </section>
  );
}
