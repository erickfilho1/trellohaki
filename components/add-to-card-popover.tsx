"use client";

import {
  CalendarBlank,
  FolderSimple,
  Paperclip,
  SquaresFour,
  Tag,
  User,
  X,
} from "@phosphor-icons/react";

type AddAction =
  | "labels"
  | "dates"
  | "delivery"
  | "checklist"
  | "members"
  | "attachment"
  | "fields";

const items: Array<{
  key: AddAction;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { key: "labels", title: "Etiquetas", description: "Organize, categorize e priorize", icon: Tag },
  { key: "dates", title: "Datas", description: "Datas de inicio, datas de entrega e lembretes", icon: CalendarBlank },
  {
    key: "delivery",
    title: "Pasta do cliente",
    description: "Conecte este card com a pasta certa dos projetos entregues",
    icon: FolderSimple,
  },
  { key: "checklist", title: "Checklist", description: "Adicionar subtarefas", icon: SquaresFour },
  { key: "members", title: "Membros", description: "Atribuir membros", icon: User },
  { key: "attachment", title: "Anexo", description: "Adicione links, paginas, itens de trabalho e muito mais", icon: Paperclip },
  { key: "fields", title: "Campos Personalizados", description: "Criar seus proprios campos", icon: SquaresFour },
];

export function AddToCardPopover({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (value: AddAction) => void;
}) {
  return (
    <div className="flowboard-scrollbar max-h-[min(76vh,640px)] w-[380px] overflow-y-auto rounded-[1.6rem] border border-white/10 bg-[#2a2c31] shadow-[0_24px_60px_-26px_rgba(0,0,0,0.95)]">
      <div className="sticky top-0 z-[1] flex items-center justify-between border-b border-white/8 bg-[#2a2c31] px-4 py-4">
        <h3 className="pl-2 text-center text-lg font-medium tracking-[-0.03em] text-white">
          Adicionar ao cartão
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="flex size-11 items-center justify-center rounded-[1rem] border border-[#88adff] text-[#d8e5ff] transition-colors hover:bg-white/6"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-1.5 p-4 pt-3">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className="flex w-full items-start gap-4 rounded-[1.1rem] border border-white/0 px-3 py-3 text-left transition-colors hover:border-white/8 hover:bg-white/5"
            >
              <span className="mt-0.5 flex size-12 shrink-0 items-center justify-center rounded-[0.95rem] border border-white/8 text-[#cdd5e7]">
                <Icon size={20} />
              </span>
              <span className="min-w-0">
                <span className="block text-[1.02rem] text-white">{item.title}</span>
                <span className="mt-1 block text-sm leading-6 text-[#b7c0d4]">
                  {item.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
