"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { CaretDown, DotsThree, LinkSimple, ListBullets, Paperclip, Plus, Question, TextT } from "@phosphor-icons/react";
import type { MemberRecord } from "@/lib/flowboard-types";
import { cleanProfileName } from "@/lib/account-settings";
import { cn } from "@/lib/utils";

const placeholderText = "Escrever um comentário...";

function normalizeHtml(html: string) {
  return html.replace(/\s+/g, " ").trim();
}

function normalizeMentionValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getMentionMatch(editor: Editor | null) {
  if (!editor) {
    return null;
  }

  const selectionFrom = editor.state.selection.from;
  const lookbehindSize = 80;
  const from = Math.max(0, selectionFrom - lookbehindSize);
  const textBefore = editor.state.doc.textBetween(from, selectionFrom, "\n", "\0");
  const match = textBefore.match(/(?:^|\s)@([^\s@]{0,32})$/);

  if (!match) {
    return null;
  }

  const query = match[1] ?? "";
  const mentionLength = query.length + 1;

  return {
    query,
    range: {
      from: selectionFrom - mentionLength,
      to: selectionFrom,
    },
  };
}

export function CommentEditor({
  value,
  onChange,
  mentionableMembers = [],
}: {
  value: string;
  onChange: (value: string) => void;
  mentionableMembers?: MemberRecord[];
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionRange, setMentionRange] = useState<{ from: number; to: number } | null>(null);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const [mentionCoords, setMentionCoords] = useState({ top: 120, left: 18 });

  const uniqueMentionableMembers = useMemo(() => {
    const seen = new Set<string>();

    return mentionableMembers.filter((member) => {
      const key = member.id || member.handle || member.name;
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }, [mentionableMembers]);

  const filteredMembers = uniqueMentionableMembers.filter((member) => {
    const query = normalizeMentionValue(mentionQuery);
    if (!query) {
      return true;
    }

    const searchable = [
      cleanProfileName(member.name),
      member.handle.replace(/^@/, ""),
      member.initials,
    ]
      .map(normalizeMentionValue)
      .join(" ");

    return searchable.includes(query);
  });

  function updateMentionPosition(instance: Editor, from: number) {
    if (!wrapperRef.current) {
      return;
    }

    const coords = instance.view.coordsAtPos(from);
    const wrapperRect = wrapperRef.current.getBoundingClientRect();
    const wrapperWidth = wrapperRef.current.clientWidth;
    const popupWidth = Math.min(256, Math.max(180, wrapperWidth - 24));

    setMentionCoords({
      top: coords.bottom - wrapperRect.top + 10,
      left: Math.max(12, Math.min(coords.left - wrapperRect.left - 8, wrapperWidth - popupWidth - 12)),
    });
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [3],
        },
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      }),
      Placeholder.configure({
        placeholder: placeholderText,
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "flowboard-rich-editor min-h-[112px] px-4 py-3 text-[14px] leading-6 text-[#e6ecf7] focus:outline-none",
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange(instance.getHTML());
      const mentionMatch = getMentionMatch(instance);
      if (!mentionMatch) {
        setMentionOpen(false);
        setMentionQuery("");
        setMentionRange(null);
        setActiveMentionIndex(0);
        return;
      }

      setMentionOpen(true);
      setMentionQuery(mentionMatch.query);
      setMentionRange(mentionMatch.range);
      setActiveMentionIndex(0);
      updateMentionPosition(instance, mentionMatch.range.from);
    },
    onSelectionUpdate: ({ editor: instance }) => {
      const mentionMatch = getMentionMatch(instance);
      if (!mentionMatch) {
        setMentionOpen(false);
        setMentionQuery("");
        setMentionRange(null);
        return;
      }

      setMentionOpen(true);
      setMentionQuery(mentionMatch.query);
      setMentionRange(mentionMatch.range);
      updateMentionPosition(instance, mentionMatch.range.from);
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const current = normalizeHtml(editor.getHTML());
    const incoming = normalizeHtml(value);
    if (current !== incoming) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return null;
  }

  const editorInstance = editor;

  function toggleLink() {
    const previousUrl = editorInstance.getAttributes("link").href as string | undefined;
    const url = window.prompt("Cole o link", previousUrl ?? "https://");

    if (url === null) {
      return;
    }

    if (!url.trim()) {
      editorInstance.chain().focus().unsetLink().run();
      return;
    }

    editorInstance.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  function insertAttachmentMock() {
    const label = window.prompt("Nome do anexo", "Arquivo do cliente");
    if (!label) {
      return;
    }

    editorInstance.chain().focus().insertContent(`<p>[Anexo: ${label.trim()}]</p>`).run();
  }

  function insertMention(member: MemberRecord) {
    const mentionName = cleanProfileName(member.name);
    const mentionHref = `mention://${member.id}`;
    const mentionContent = {
      type: "text",
      text: `@${mentionName}`,
      marks: [{ type: "link", attrs: { href: mentionHref } }],
    };

    if (mentionRange) {
      editorInstance
        .chain()
        .focus()
        .insertContentAt(mentionRange, [mentionContent, { type: "text", text: " " }])
        .run();
    } else {
      editorInstance.chain().focus().insertContent([mentionContent, { type: "text", text: " " }]).run();
    }

    setMentionOpen(false);
    setMentionQuery("");
    setMentionRange(null);
    setActiveMentionIndex(0);
  }

  function handleEditorKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!mentionOpen || filteredMembers.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveMentionIndex((current) => (current + 1) % filteredMembers.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveMentionIndex((current) => (current - 1 + filteredMembers.length) % filteredMembers.length);
      return;
    }

    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      insertMention(filteredMembers[activeMentionIndex] ?? filteredMembers[0]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setMentionOpen(false);
      setMentionQuery("");
      setMentionRange(null);
      setActiveMentionIndex(0);
    }
  }

  return (
    <div
      ref={wrapperRef}
      className="relative overflow-visible rounded-[1.1rem] border border-[#6f95f4]/55 bg-[#23262d] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-white/8 px-2.5 py-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setTypeMenuOpen((current) => !current)}
            className="flex h-9 items-center gap-1.5 rounded-[0.8rem] border border-white/0 px-2.5 text-[#dce4f5] transition-colors hover:bg-white/6"
          >
            <TextT size={17} />
            <CaretDown size={12} />
          </button>

          {typeMenuOpen ? (
            <div className="absolute left-0 top-[calc(100%+0.45rem)] z-20 w-36 rounded-[0.95rem] border border-white/10 bg-[#262a33] p-1.5 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.88)]">
              <button
                type="button"
                onClick={() => {
                  editorInstance.chain().focus().setParagraph().run();
                  setTypeMenuOpen(false);
                }}
                className="flex w-full rounded-[0.8rem] px-3 py-2 text-left text-sm text-[#dce4f5] transition-colors hover:bg-white/6"
              >
                Texto
              </button>
              <button
                type="button"
                onClick={() => {
                  editorInstance.chain().focus().toggleHeading({ level: 3 }).run();
                  setTypeMenuOpen(false);
                }}
                className="flex w-full rounded-[0.8rem] px-3 py-2 text-left text-sm text-[#dce4f5] transition-colors hover:bg-white/6"
              >
                Titulo
              </button>
            </div>
          ) : null}
        </div>

        <ToolbarButton active={editorInstance.isActive("bold")} onClick={() => editorInstance.chain().focus().toggleBold().run()}>
          <span className="text-[15px] font-semibold">B</span>
        </ToolbarButton>
        <ToolbarButton active={editorInstance.isActive("italic")} onClick={() => editorInstance.chain().focus().toggleItalic().run()}>
          <span className="text-[15px] italic">I</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => editorInstance.chain().focus().toggleBulletList().run()}>
          <ListBullets size={17} />
        </ToolbarButton>
        <ToolbarButton onClick={toggleLink}>
          <LinkSimple size={17} />
        </ToolbarButton>
        <ToolbarButton onClick={insertAttachmentMock}>
          <Paperclip size={17} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editorInstance.chain().focus().insertContent("<p></p>").run()}>
          <Plus size={17} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editorInstance.chain().focus().insertContent("<p>• </p>").run()}>
          <DotsThree size={17} />
        </ToolbarButton>

        <div className="ml-auto">
          <ToolbarButton
            onClick={() =>
              window.alert("Use a barra superior para negrito, italico, listas, links e anexos mockados.")
            }
          >
            <Question size={17} />
          </ToolbarButton>
        </div>
      </div>

      <div className="relative overflow-visible" onKeyDown={handleEditorKeyDown}>
        <EditorContent editor={editorInstance} />

        {mentionOpen && filteredMembers.length > 0 ? (
          <div
            className="absolute z-40 w-[min(16rem,calc(100%-1.5rem))] overflow-hidden rounded-[0.9rem] border border-white/10 bg-[#2a2d34] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.92)]"
            style={{
              top: mentionCoords.top,
              left: mentionCoords.left,
            }}
          >
            <div className="max-h-48 overflow-y-auto py-1">
              {filteredMembers.map((member, index) => (
                <button
                  key={member.id}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    insertMention(member);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition",
                    index === activeMentionIndex ? "bg-[#343944]" : "hover:bg-white/[0.045]",
                  )}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/8 bg-[#1f232b] text-[12px] font-semibold text-white">
                    {member.initials}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-[#eef3ff]">
                      {cleanProfileName(member.name)}
                    </span>
                    <span className="block truncate text-[11px] text-[#8f98ab]">{member.handle}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {uniqueMentionableMembers.length > 0 ? (
        <div className="border-t border-white/8 px-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold tracking-[0.18em] text-[#8f98ab] uppercase">
              Mencionar
            </span>
            {uniqueMentionableMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => insertMention(member)}
                className="inline-flex h-8 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-[#dfe6f7] transition hover:border-white/16 hover:bg-white/[0.08]"
              >
                <span className="grid size-5 place-items-center rounded-full bg-[#1d2330] text-[10px] font-semibold text-white">
                  {member.initials}
                </span>
                <span>@{cleanProfileName(member.name)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ToolbarButton({
  active = false,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex size-9 items-center justify-center rounded-[0.8rem] border border-white/0 text-[#dce4f5] transition-colors hover:bg-white/6",
        active ? "bg-[#2b4f99] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : "",
      )}
    >
      {children}
    </button>
  );
}
