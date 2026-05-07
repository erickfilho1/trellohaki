"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  CaretDown,
  DotsThree,
  LinkSimple,
  ListBullets,
  Paperclip,
  Plus,
  Question,
  TextT,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const placeholderText = "Escrever um comentário...";

function normalizeHtml(html: string) {
  return html.replace(/\s+/g, " ").trim();
}

export function CommentEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);

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

  function toggleLink() {
    if (!editor) {
      return;
    }

    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Cole o link", previousUrl ?? "https://");

    if (url === null) {
      return;
    }

    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  function insertAttachmentMock() {
    if (!editor) {
      return;
    }

    const label = window.prompt("Nome do anexo", "Arquivo do cliente");
    if (!label) {
      return;
    }

    editor.chain().focus().insertContent(`<p>[Anexo: ${label.trim()}]</p>`).run();
  }

  return (
    <div
      ref={wrapperRef}
      className="relative overflow-hidden rounded-[1.1rem] border border-[#6f95f4]/55 bg-[#23262d] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
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
                  editor.chain().focus().setParagraph().run();
                  setTypeMenuOpen(false);
                }}
                className="flex w-full rounded-[0.8rem] px-3 py-2 text-left text-sm text-[#dce4f5] transition-colors hover:bg-white/6"
              >
                Texto
              </button>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 3 }).run();
                  setTypeMenuOpen(false);
                }}
                className="flex w-full rounded-[0.8rem] px-3 py-2 text-left text-sm text-[#dce4f5] transition-colors hover:bg-white/6"
              >
                Título
              </button>
            </div>
          ) : null}
        </div>

        <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <span className="text-[15px] font-semibold">B</span>
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <span className="text-[15px] italic">I</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <ListBullets size={17} />
        </ToolbarButton>
        <ToolbarButton onClick={toggleLink}>
          <LinkSimple size={17} />
        </ToolbarButton>
        <ToolbarButton onClick={insertAttachmentMock}>
          <Paperclip size={17} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().insertContent("<p></p>").run()}>
          <Plus size={17} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().insertContent("<p>• </p>").run()}>
          <DotsThree size={17} />
        </ToolbarButton>

        <div className="ml-auto">
          <ToolbarButton
            onClick={() =>
              window.alert("Use a barra superior para negrito, itálico, listas, links e anexos mockados.")
            }
          >
            <Question size={17} />
          </ToolbarButton>
        </div>
      </div>

      <EditorContent editor={editor} />
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
