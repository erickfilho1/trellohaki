"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  CaretDown,
  DotsThree,
  ImageSquare,
  LinkSimple,
  ListBullets,
  ListNumbers,
  Plus,
  Question,
  TextT,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SlashAction = "text" | "heading" | "bulletList" | "orderedList" | "link" | "image";

const placeholderText =
  "Torne sua descricao ainda melhor. Digite '/' para inserir conteudo, formatacao e muito mais.";

const slashItems: Array<{
  id: SlashAction;
  title: string;
  description: string;
}> = [
  { id: "text", title: "Texto", description: "Adicionar um bloco de texto normal" },
  { id: "heading", title: "Titulo", description: "Destacar a secao com um titulo" },
  { id: "bulletList", title: "Lista", description: "Criar uma lista com marcadores" },
  { id: "orderedList", title: "Lista numerada", description: "Criar uma lista ordenada" },
  { id: "link", title: "Link", description: "Inserir um link clicavel" },
  { id: "image", title: "Imagem", description: "Adicionar um bloco de imagem mockado" },
];

function normalizeHtml(html: string) {
  return html.replace(/\s+/g, " ").trim();
}

export function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashFrom, setSlashFrom] = useState<number | null>(null);
  const [slashCoords, setSlashCoords] = useState({ top: 92, left: 18 });
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
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
          "flowboard-rich-editor min-h-[180px] px-5 py-4 text-[15px] leading-7 text-[#e6ecf7] focus:outline-none",
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "/") {
          queueMicrotask(() => {
            const instance = editor;
            if (!instance || !wrapperRef.current) {
              return;
            }
            const position = instance.state.selection.from;
            const coords = instance.view.coordsAtPos(position);
            const wrapperRect = wrapperRef.current.getBoundingClientRect();
            const wrapperWidth = wrapperRef.current.clientWidth;
            setSlashFrom(position - 1);
            setSlashCoords({
              top: coords.bottom - wrapperRect.top + 12,
              left: Math.max(16, Math.min(coords.left - wrapperRect.left, wrapperWidth - 296)),
            });
            setSlashOpen(true);
          });
        }

        if (event.key === "Escape") {
          setSlashOpen(false);
          setTypeMenuOpen(false);
        }

        return false;
      },
    },
    onUpdate: ({ editor: instance }) => {
      const next = instance.getHTML();
      onChange(next);

      if (slashOpen && slashFrom !== null && instance.state.selection.from <= slashFrom) {
        setSlashOpen(false);
      }
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

  const typeLabel = !editor
    ? "Texto"
    : editor.isActive("heading", { level: 2 })
      ? "Titulo"
      : editor.isActive("heading", { level: 3 })
        ? "Subtitulo"
        : "Texto";

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

  function insertImageMock() {
    if (!editor) {
      return;
    }

    const label = window.prompt("Nome da imagem", "Imagem do cliente");
    if (!label) {
      return;
    }

    editor
      .chain()
      .focus()
      .insertContent(
        `<p><a href="#" data-kind="mock-image">[Imagem: ${label.trim()}]</a></p>`,
      )
      .run();
  }

  function applySlashAction(action: SlashAction) {
    if (!editor) {
      return;
    }

    const range =
      slashFrom !== null
        ? { from: slashFrom, to: editor.state.selection.from }
        : undefined;

    const chain = editor.chain().focus();
    if (range) {
      chain.deleteRange(range);
    }

    switch (action) {
      case "text":
        chain.setParagraph().run();
        break;
      case "heading":
        chain.toggleHeading({ level: 2 }).run();
        break;
      case "bulletList":
        chain.toggleBulletList().run();
        break;
      case "orderedList":
        chain.toggleOrderedList().run();
        break;
      case "link":
        chain.run();
        toggleLink();
        break;
      case "image":
        chain.run();
        insertImageMock();
        break;
    }

    setSlashOpen(false);
  }

  if (!editor) {
    return null;
  }

  return (
    <div
      ref={wrapperRef}
      className="relative overflow-hidden rounded-[1.25rem] border border-[#6f95f4]/60 bg-[#1d2027] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-white/8 px-3 py-2.5">
        <div className="relative">
          <button
            type="button"
            onClick={() => setTypeMenuOpen((current) => !current)}
            className="flex h-10 items-center gap-2 rounded-[0.9rem] border border-white/0 px-3 text-[#dce4f5] transition-colors hover:bg-white/6"
          >
            <TextT size={18} />
            <span className="text-sm">{typeLabel}</span>
            <CaretDown size={12} />
          </button>

          {typeMenuOpen ? (
            <div className="absolute left-0 top-[calc(100%+0.5rem)] z-20 w-40 rounded-[1rem] border border-white/10 bg-[#262a33] p-1.5 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.88)]">
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().setParagraph().run();
                  setTypeMenuOpen(false);
                }}
                className="flex w-full items-center rounded-[0.8rem] px-3 py-2 text-left text-sm text-[#dce4f5] transition-colors hover:bg-white/6"
              >
                Texto
              </button>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 2 }).run();
                  setTypeMenuOpen(false);
                }}
                className="flex w-full items-center rounded-[0.8rem] px-3 py-2 text-left text-sm text-[#dce4f5] transition-colors hover:bg-white/6"
              >
                Titulo
              </button>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 3 }).run();
                  setTypeMenuOpen(false);
                }}
                className="flex w-full items-center rounded-[0.8rem] px-3 py-2 text-left text-sm text-[#dce4f5] transition-colors hover:bg-white/6"
              >
                Subtitulo
              </button>
            </div>
          ) : null}
        </div>

        <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <span className="text-base font-semibold">B</span>
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <span className="text-base italic">I</span>
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <ListBullets size={18} />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListNumbers size={18} />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("link")} onClick={toggleLink}>
          <LinkSimple size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={insertImageMock}>
          <ImageSquare size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => setSlashOpen((current) => !current)}>
          <Plus size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().insertContent("<hr />").run()}>
          <DotsThree size={18} />
        </ToolbarButton>
        <div className="ml-auto flex items-center gap-2">
          <ToolbarButton onClick={() => window.alert("Use / para abrir comandos rapidos e a barra superior para formatar o texto.")}>
            <Question size={18} />
          </ToolbarButton>
        </div>
      </div>

      <EditorContent editor={editor} />

      {slashOpen ? (
        <div
          className="absolute z-20 w-[280px] rounded-[1rem] border border-white/10 bg-[#22262e] p-2 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.88)]"
          style={{
            top: slashCoords.top,
            left: slashCoords.left,
          }}
        >
          {slashItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => applySlashAction(item.id)}
              className="flex w-full flex-col rounded-[0.85rem] px-3 py-2.5 text-left transition-colors hover:bg-white/6"
            >
              <span className="text-sm font-medium text-white">{item.title}</span>
              <span className="mt-0.5 text-xs leading-5 text-[#97a1b8]">{item.description}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex justify-end border-t border-white/8 px-4 py-2.5">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.alert("Use negrito, italico, listas, links e o menu '/' para formatar a descricao.")}
          className="h-10 rounded-[0.95rem] border-white/10 bg-white/3 text-[#dbe4f6] hover:bg-white/6"
        >
          Ajuda para formatacao
        </Button>
      </div>
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
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex size-10 items-center justify-center rounded-[0.9rem] border border-white/0 text-[#dce4f5] transition-colors hover:bg-white/6",
        active ? "bg-[#2b4f99] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : "",
      )}
    >
      {children}
    </button>
  );
}
