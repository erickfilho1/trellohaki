"use client";

import { Check, ImageSquare, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const BOARD_BACKGROUND_OPTIONS = [
  "from-[#244d64] via-[#25334f] to-[#302440]",
  "from-[#6b3f12] via-[#83501b] to-[#4f2916]",
  "from-[#1d5a40] via-[#194632] to-[#132d22]",
  "from-[#2c4a87] via-[#202b59] to-[#201a40]",
  "from-[#5a2c5d] via-[#37244a] to-[#201732]",
  "from-[#0f4c5c] via-[#19405a] to-[#232348]",
  "from-[#5e1f3b] via-[#402039] to-[#261826]",
  "from-[#4a5f1f] via-[#31411d] to-[#182414]",
  "from-[#0b0b0b] via-[#131313] to-[#202020]",
  "from-[#1e1c27] via-[#2b1f38] to-[#4a2231]",
  "from-[#102028] via-[#153443] to-[#1d5a6c]",
  "from-[#17140f] via-[#2c2418] to-[#59462a]",
];

export function BoardBackgroundPopover({
  currentAccent,
  onSelectAccent,
  onClose,
}: {
  currentAccent?: string;
  onSelectAccent: (accent: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex max-h-[min(34rem,var(--floating-panel-max-height))] w-[min(22rem,var(--floating-panel-max-width))] flex-col overflow-hidden rounded-[1.2rem] border border-white/10 bg-[#2a2c31] shadow-[0_28px_90px_-34px_rgba(0,0,0,0.98)]">
      <div className="sticky top-0 z-[2] flex items-center justify-center border-b border-white/8 bg-[#2a2c31]/96 px-4 py-3.5 backdrop-blur-xl">
        <h3 className="text-[1rem] font-medium tracking-[-0.03em] text-white">Plano de fundo do quadro</h3>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-[0.95rem] border border-white/10 bg-[#31343d] text-white transition-colors hover:bg-[#3a3d47]"
          aria-label="Fechar"
        >
          <X size={17} />
        </button>
      </div>

      <div className="flowboard-scrollbar flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <div className="space-y-2.5">
          <p className="text-[0.94rem] font-medium text-[#dbe3f7]">Prévia</p>
          <div className="overflow-hidden rounded-[1rem] border border-white/10 bg-[#1f232b]">
            <div className={cn("h-24 w-full bg-gradient-to-br", currentAccent || BOARD_BACKGROUND_OPTIONS[0])} />
            <div className="space-y-3 bg-[#2a2d34] px-4 py-4">
              <div className="h-2 w-28 rounded-full bg-white/18" />
              <div className="h-2 w-36 rounded-full bg-white/12" />
              <div className="h-2 w-16 rounded-full bg-white/10" />
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[0.94rem] font-medium text-[#dbe3f7]">Cores do quadro</p>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11px] text-[#95a0b7]">
              <ImageSquare size={13} />
              mudar fundo
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {BOARD_BACKGROUND_OPTIONS.map((accent) => {
              const active = currentAccent === accent;
              return (
                <button
                  key={accent}
                  type="button"
                  onClick={() => onSelectAccent(accent)}
                  className={cn(
                    "relative h-16 overflow-hidden rounded-[0.95rem] border transition-all",
                    active
                      ? "border-[#81b7ff] shadow-[inset_0_0_0_1px_rgba(129,183,255,0.75)]"
                      : "border-white/10 hover:border-white/24 hover:brightness-110",
                  )}
                >
                  <span className={cn("absolute inset-0 bg-gradient-to-br", accent)} />
                  <span className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_60%)]" />
                  {active ? (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex size-7 items-center justify-center rounded-full border border-white/45 bg-black/25 text-white backdrop-blur-sm">
                        <Check size={14} weight="bold" />
                      </span>
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-[1rem] border border-dashed border-white/10 px-4 py-3 text-sm leading-6 text-[#98a4c1]">
          A alteração aplica o clima visual no canvas inteiro do quadro, mantendo cards e listas intactos.
        </div>
      </div>
    </div>
  );
}

export { BOARD_BACKGROUND_OPTIONS };
