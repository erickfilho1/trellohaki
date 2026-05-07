"use client";

import { useRef } from "react";
import { Check, ImageSquare, UploadSimple, X } from "@phosphor-icons/react";
import { LABEL_COLOR_SWATCHES } from "@/lib/flowboard-constants";
import type { CardCoverRecord, LabelTone } from "@/lib/flowboard-types";
import { cn } from "@/lib/utils";

const COVER_TONES: LabelTone[] = [
  "green",
  "yellow-dark",
  "orange",
  "red",
  "purple",
  "blue",
  "cyan",
  "green-dark",
  "pink",
  "gray",
];

export function CardCoverPopover({
  cover,
  onToneChange,
  onSizeChange,
  onImageUpload,
  onRemoveImage,
  onClose,
  uploading = false,
}: {
  cover?: CardCoverRecord;
  onToneChange: (tone?: LabelTone) => void;
  onSizeChange: (size: "header" | "full") => void;
  onImageUpload: (file: File) => void;
  onRemoveImage: () => void;
  onClose: () => void;
  uploading?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const activeSize = cover?.size ?? "header";
  const previewTone = cover?.tone ? LABEL_COLOR_SWATCHES[cover.tone].preview : "#2563eb";

  return (
    <div className="flex max-h-[min(36rem,var(--floating-panel-max-height))] w-[min(21.5rem,var(--floating-panel-max-width))] flex-col overflow-hidden rounded-[1.1rem] border border-white/10 bg-[#2a2c31] shadow-[0_28px_90px_-34px_rgba(0,0,0,0.98)]">
      <div className="sticky top-0 z-[2] flex items-center justify-center border-b border-white/8 bg-[#2a2c31]/96 px-4 py-3.5 backdrop-blur-xl">
        <h3 className="text-[1rem] font-medium tracking-[-0.03em] text-white">Capa</h3>
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
          <p className="text-[0.94rem] font-medium text-[#dbe3f7]">Tamanho</p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onSizeChange("header")}
              className={cn(
                "overflow-hidden rounded-[0.95rem] border bg-[#30333b] text-left transition-all",
                activeSize === "header"
                  ? "border-[#81b7ff] shadow-[inset_0_0_0_1px_rgba(129,183,255,0.75)]"
                  : "border-white/10 hover:border-white/20",
              )}
            >
              <div className="h-10 border-b border-white/8" style={{ backgroundColor: previewTone }} />
              <div className="space-y-2 px-3 py-3">
                <div className="h-1.5 w-16 rounded-full bg-white/18" />
                <div className="h-1.5 w-12 rounded-full bg-white/12" />
                <div className="flex justify-end">
                  <div className="size-2.5 rounded-full bg-white/16" />
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSizeChange("full")}
              className={cn(
                "overflow-hidden rounded-[0.95rem] border text-left transition-all",
                activeSize === "full"
                  ? "border-[#81b7ff] shadow-[inset_0_0_0_1px_rgba(129,183,255,0.75)]"
                  : "border-white/10 hover:border-white/20",
              )}
              style={{ backgroundColor: previewTone }}
            >
              <div className="space-y-2 px-3 py-3 pt-8">
                <div className="h-1.5 w-16 rounded-full bg-white/72" />
                <div className="h-1.5 w-12 rounded-full bg-white/52" />
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          <p className="text-[0.94rem] font-medium text-[#dbe3f7]">Prévia</p>
          <div
            className="relative overflow-hidden rounded-[1rem] border border-white/10 bg-[#1f232b]"
            style={{
              backgroundColor: previewTone,
              backgroundImage: cover?.imageUrl
                ? `linear-gradient(180deg, rgba(15,18,24,0.22), rgba(15,18,24,0.38)), url(${cover.imageUrl})`
                : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {activeSize === "header" ? (
              <>
                <div className="h-[96px] w-full bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0))]" />
                <div className="border-t border-white/8 bg-[#2a2d34] px-4 py-3">
                  <div className="h-2 w-20 rounded-full bg-white/18" />
                  <div className="mt-3 h-2 w-36 rounded-full bg-white/12" />
                  <div className="mt-2 h-2 w-14 rounded-full bg-white/10" />
                </div>
              </>
            ) : (
              <div className="px-4 py-5 pt-14">
                <div className="rounded-[0.9rem] bg-[linear-gradient(180deg,rgba(20,22,29,0.08),rgba(20,22,29,0.2))] p-4 backdrop-blur-[1px]">
                  <div className="h-2 w-28 rounded-full bg-white/75" />
                  <div className="mt-3 h-2 w-36 rounded-full bg-white/52" />
                  <div className="mt-2 h-2 w-16 rounded-full bg-white/44" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2.5">
          <p className="text-[0.94rem] font-medium text-[#dbe3f7]">Cores</p>
          <div className="grid grid-cols-5 gap-2.5">
            {COVER_TONES.map((tone) => {
              const swatch = LABEL_COLOR_SWATCHES[tone];
              const active = cover?.tone === tone;
              return (
                <button
                  key={tone}
                  type="button"
                  onClick={() => onToneChange(active ? undefined : tone)}
                  className={cn(
                    "flex h-9 items-center justify-center rounded-[0.85rem] border transition-all",
                    active
                      ? "scale-[1.02] border-white/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)]"
                      : "border-white/10 hover:border-white/24 hover:brightness-110",
                  )}
                  style={{ backgroundColor: swatch.preview }}
                  aria-label={`Cor ${tone}`}
                >
                  {active ? <Check size={14} weight="bold" className="text-white" /> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 border-t border-white/8 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.94rem] font-medium text-[#dbe3f7]">Anexo de imagem</p>
              <p className="mt-1 text-[0.78rem] leading-5 text-[#98a4c1]">
                Use uma imagem para a capa do card.
              </p>
            </div>
            {cover?.imageUrl ? (
              <button
                type="button"
                onClick={onRemoveImage}
                className="shrink-0 rounded-[0.75rem] border border-white/10 bg-white/4 px-2.5 py-2 text-[0.76rem] text-[#d6dced] transition-colors hover:bg-white/8"
              >
                Remover
              </button>
            ) : null}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }
              onImageUpload(file);
              event.currentTarget.value = "";
            }}
          />

          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-[0.9rem] border border-white/10 bg-white/4 px-3 text-[0.9rem] text-white transition-colors hover:bg-white/8 disabled:cursor-wait disabled:opacity-60"
          >
            {cover?.imageUrl ? <ImageSquare size={17} /> : <UploadSimple size={17} />}
            {uploading
              ? "Enviando imagem..."
              : cover?.imageUrl
                ? "Trocar imagem de capa"
                : "Carregar imagem de capa"}
          </button>
        </div>
      </div>
    </div>
  );
}
