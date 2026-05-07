"use client";

import { ArrowLeft, X } from "@phosphor-icons/react";
import { createLabel, getLabelPreviewColor } from "@/lib/flowboard-helpers";
import type { LabelRecord, LabelTone } from "@/lib/flowboard-types";
import { LabelBadge } from "@/components/label-badge";
import { LabelColorPicker } from "@/components/label-color-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LabelEditorModal({
  mode,
  draftName,
  draftTone,
  onDraftNameChange,
  onDraftToneChange,
  onBack,
  onClose,
  onSave,
  onDelete,
}: {
  mode: "create" | "edit";
  draftName: string;
  draftTone: LabelTone | null;
  onDraftNameChange: (value: string) => void;
  onDraftToneChange: (value: LabelTone | null) => void;
  onBack: () => void;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
}) {
  const previewTone = draftTone ?? "gray";
  const previewLabel: LabelRecord = createLabel(draftName.trim() || "Nova etiqueta", previewTone, "preview");

  return (
    <div className="flowboard-scrollbar max-h-[min(82vh,760px)] w-[395px] overflow-y-auto rounded-[1.6rem] border border-white/10 bg-[#2a2c31] shadow-[0_24px_60px_-26px_rgba(0,0,0,0.95)]">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex size-11 items-center justify-center rounded-[1rem] border border-[#88adff] text-[#d8e5ff] transition-colors hover:bg-white/6"
        >
          <ArrowLeft size={18} />
        </button>
        <h3 className="text-lg font-medium text-white">
          {mode === "create" ? "Criar Etiqueta" : "Editar etiqueta"}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-[0.9rem] text-[#d8e5ff] transition-colors hover:bg-white/6"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-5 px-4 py-5">
        <div className="rounded-[1.2rem] bg-[#202127] px-6 py-6">
          <div
            className="h-10 rounded-[0.7rem]"
            style={{ backgroundColor: getLabelPreviewColor(previewTone) }}
          />
          <div className="mt-3">
            <LabelBadge label={previewLabel} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-[#ced6e8]">Titulo</label>
          <Input
            data-testid="label-editor-title"
            value={draftName}
            onChange={(event) => onDraftNameChange(event.target.value)}
            className="h-11 rounded-[1rem] border-white/10 bg-transparent text-white"
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm text-[#ced6e8]">Selecionar uma cor</label>
          <LabelColorPicker selected={draftTone ?? undefined} onSelect={onDraftToneChange} />
          <button
            type="button"
            onClick={() => onDraftToneChange(null)}
            className="flex h-11 w-full items-center justify-center rounded-[1rem] border border-white/10 bg-white/4 text-sm text-[#d8dff0] transition-colors hover:bg-white/7"
          >
            <X size={16} />
            Remover cor
          </button>
        </div>

        <div className="border-t border-white/8 pt-5">
          <div className="flex items-center justify-between gap-3">
            <Button
              data-testid={mode === "create" ? "create-label-submit" : "edit-label-submit"}
              onClick={onSave}
              className="h-11 rounded-[1rem] border border-white/10 bg-[#6c9dff] px-5 text-[#10203b] hover:bg-[#82adff]"
            >
              {mode === "create" ? "Criar" : "Salvar"}
            </Button>

            {mode === "edit" && onDelete ? (
              <Button
                data-testid="delete-label-submit"
                onClick={onDelete}
                className="h-11 rounded-[1rem] border border-[#ff8078]/10 bg-[#ff7e73] px-5 text-[#2d0e0b] hover:bg-[#ff978f]"
              >
                Excluir
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
