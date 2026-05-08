"use client";

import {
  ArrowsClockwise,
  ChatTeardropDots,
  CheckSquare,
  EnvelopeSimple,
  Kanban,
  Lightning,
  NotionLogo,
  Rows,
} from "@phosphor-icons/react";
import type { RefObject } from "react";
import { FloatingPanel } from "@/components/floating-panel";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const AUTOMATION_APPS = [
  {
    name: "Trello",
    copy: "Espelhe cards, listas e atualizações do quadro.",
    icon: Kanban,
    accent: "bg-[#163246] text-[#7dc5ff]",
  },
  {
    name: "Slack",
    copy: "Dispare alertas de prazo e comentários novos.",
    icon: ChatTeardropDots,
    accent: "bg-[#341c37] text-[#f0a9ff]",
  },
  {
    name: "Asana",
    copy: "Sincronize tarefas ativas e status de entrega.",
    icon: CheckSquare,
    accent: "bg-[#35271a] text-[#ffc782]",
  },
  {
    name: "Notion",
    copy: "Publique resumos e documentação do projeto.",
    icon: NotionLogo,
    accent: "bg-[#202734] text-[#d9e3f5]",
  },
  {
    name: "Email",
    copy: "Envie convites e mensagens transacionais.",
    icon: EnvelopeSimple,
    accent: "bg-[#183626] text-[#9af0bd]",
  },
  {
    name: "Webhooks",
    copy: "Abra integrações livres com backend e CRM.",
    icon: Rows,
    accent: "bg-[#20213d] text-[#a7afff]",
  },
];

export function AutomationHoverPopover({
  anchorRef,
  open,
  onMouseEnter,
  onMouseLeave,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <FloatingPanel
      anchorRef={anchorRef}
      open={open}
      align="end"
      placement="bottom"
      offset={12}
      estimatedWidth={336}
      estimatedHeight={432}
      className="w-[min(336px,calc(100vw-20px))]"
    >
      <div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="max-h-[min(28rem,var(--floating-panel-max-height))] overflow-hidden rounded-[1.25rem] border border-white/10 bg-[linear-gradient(180deg,#151515_0%,#0d0d0d_100%)] shadow-[0_28px_90px_-38px_rgba(0,0,0,0.92)]"
      >
        <div className="border-b border-white/6 px-3.5 py-3">
          <div className="flex items-start gap-3">
            <div className="flex size-8 items-center justify-center rounded-[0.9rem] border border-white/10 bg-[#1d1d1d] text-[#ff6b57] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <Lightning size={15} weight="fill" />
            </div>
            <div className="min-w-0">
              <p className="text-[0.92rem] font-medium tracking-[-0.03em] text-white">Automações</p>
              <p className="mt-1 text-[0.78rem] leading-5 text-[#8e9ab2]">
                Conecte o Painel Haki com ferramentas externas sem sair do fluxo.
              </p>
            </div>
          </div>
        </div>

        <div className="flowboard-scrollbar max-h-[min(23rem,calc(var(--floating-panel-max-height)-4.5rem))] overflow-y-auto overflow-x-hidden overscroll-contain px-3.5 pb-4 pt-3">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7584a0]">
              Catálogo inicial
            </p>
            <Badge className="rounded-full border-0 bg-[#1d2638] px-2 py-0.5 text-[10px] text-[#d7e0f5]">
              design em preparo
            </Badge>
          </div>

          <div className="grid gap-1.5 overflow-x-hidden pb-1">
            {AUTOMATION_APPS.map((app) => {
              const Icon = app.icon;
              return (
                <div
                  key={app.name}
                  className="group overflow-hidden rounded-[1rem] border border-white/7 bg-white/[0.03] px-3 py-2.5 transition-all duration-200 hover:border-white/12 hover:bg-white/[0.055]"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[0.8rem] border border-white/6",
                        app.accent,
                      )}
                    >
                      <Icon size={15} weight="duotone" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[0.86rem] font-medium tracking-[-0.02em] text-white">
                          {app.name}
                        </p>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/8 bg-white/[0.03] px-1.5 py-0.5 text-[8px] uppercase tracking-[0.18em] text-[#7b89a4]">
                          <ArrowsClockwise size={10} />
                          em breve
                        </span>
                      </div>
                      <p className="mt-1 text-[0.76rem] leading-5 text-[#8e9ab2]">{app.copy}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </FloatingPanel>
  );
}
