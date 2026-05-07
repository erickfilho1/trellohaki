"use client";

import { useMemo, useState } from "react";
import { PencilSimpleLine, X } from "@phosphor-icons/react";
import { createLabel } from "@/lib/flowboard-helpers";
import { LabelBadge } from "@/components/label-badge";
import { LabelEditorModal } from "@/components/label-editor-modal";
import { Input } from "@/components/ui/input";
import type { LabelRecord, LabelTone } from "@/lib/flowboard-types";

type ViewMode = "list" | "create" | "edit";

function labelSelected(labels: LabelRecord[], labelId: string) {
  return labels.some((label) => label.id === labelId);
}

export function LabelsPopover({
  labels,
  catalog,
  onChange,
  onCreateLabel,
  onUpdateLabel,
  onDeleteLabel,
  onClose,
}: {
  labels: LabelRecord[];
  catalog: LabelRecord[];
  onChange: (labels: LabelRecord[], activityText?: string) => void;
  onCreateLabel: (label: LabelRecord) => void;
  onUpdateLabel: (label: LabelRecord) => void;
  onDeleteLabel: (labelId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("list");
  const [draftName, setDraftName] = useState("");
  const [draftTone, setDraftTone] = useState<LabelTone | null>("purple");
  const [editingLabel, setEditingLabel] = useState<LabelRecord | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return catalog;
    }

    return catalog.filter((label) => label.name.toLowerCase().includes(normalized));
  }, [catalog, query]);

  function toggleLabel(label: LabelRecord) {
    if (labelSelected(labels, label.id)) {
      onChange(
        labels.filter((item) => item.id !== label.id),
        `Voce removeu a etiqueta ${label.name}`,
      );
      return;
    }

    onChange([...labels, createLabel(label.name, label.tone, label.id)], `Voce adicionou a etiqueta ${label.name}`);
  }

  function openCreate() {
    setDraftName("");
    setDraftTone("purple");
    setEditingLabel(null);
    setView("create");
  }

  function openEdit(label: LabelRecord) {
    setDraftName(label.name);
    setDraftTone(label.tone);
    setEditingLabel(label);
    setView("edit");
  }

  function handleCreate() {
    const trimmed = draftName.trim();
    if (!trimmed || !draftTone) {
      return;
    }

    const label = createLabel(trimmed, draftTone);
    onCreateLabel(label);
    onChange(
      [...labels, createLabel(label.name, label.tone, label.id)],
      `Voce adicionou a etiqueta ${label.name}`,
    );
    setView("list");
  }

  function handleUpdate() {
    if (!editingLabel || !draftTone || !draftName.trim()) {
      return;
    }

    const updated = createLabel(draftName.trim(), draftTone, editingLabel.id);
    onUpdateLabel(updated);
    onChange(
      labels.map((item) => (item.id === updated.id ? updated : item)),
      `Voce atualizou a etiqueta ${updated.name}`,
    );
    setView("list");
  }

  function handleDelete() {
    if (!editingLabel) {
      return;
    }

    onDeleteLabel(editingLabel.id);
    onChange(
      labels.filter((item) => item.id !== editingLabel.id),
      `Voce removeu a etiqueta ${editingLabel.name}`,
    );
    setView("list");
  }

  if (view === "create") {
    return (
      <LabelEditorModal
        mode="create"
        draftName={draftName}
        draftTone={draftTone}
        onDraftNameChange={setDraftName}
        onDraftToneChange={setDraftTone}
        onBack={() => setView("list")}
        onClose={onClose}
        onSave={handleCreate}
      />
    );
  }

  if (view === "edit" && editingLabel) {
    return (
      <LabelEditorModal
        mode="edit"
        draftName={draftName}
        draftTone={draftTone}
        onDraftNameChange={setDraftName}
        onDraftToneChange={setDraftTone}
        onBack={() => setView("list")}
        onClose={onClose}
        onSave={handleUpdate}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <div className="flowboard-scrollbar max-h-[min(78vh,760px)] w-[405px] overflow-y-auto rounded-[1.6rem] border border-white/10 bg-[#2a2c31] p-4 shadow-[0_24px_60px_-26px_rgba(0,0,0,0.95)]">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium tracking-[-0.03em] text-white">Etiquetas</h3>
        <button
          type="button"
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-[0.9rem] text-[#ced6e8] transition-colors hover:bg-white/6"
        >
          <X size={18} />
        </button>
      </div>

      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar etiquetas..."
        className="mt-4 h-12 rounded-[1rem] border-[#86a9ff] bg-[#1e2128] text-white placeholder:text-[#79849c]"
      />

      <div className="mt-5">
        <p className="text-sm font-medium text-[#ced6e8]">Etiquetas</p>
        <div className="mt-3 space-y-2">
          {filtered.map((label) => {
            const checked = labelSelected(labels, label.id);

            return (
              <div key={label.id} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleLabel(label)}
                  className="size-5 rounded border-white/20 bg-transparent accent-[#7fa4ff]"
                />
                <button
                  type="button"
                  onClick={() => toggleLabel(label)}
                  data-testid={`label-option-${label.name.toLowerCase().replaceAll("/", "-").replaceAll(" ", "-")}`}
                  className="flex-1 text-left"
                >
                  <div className="w-full">
                    <LabelBadge label={label} />
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(label)}
                  className="flex size-8 items-center justify-center rounded-lg text-[#c6d0e7] transition-colors hover:bg-white/6"
                >
                  <PencilSimpleLine size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 space-y-2 border-t border-white/8 pt-4">
        <button
          type="button"
          onClick={openCreate}
          className="h-11 w-full rounded-[1rem] border border-white/10 bg-white/4 text-sm text-[#d9e0ee] transition-colors hover:bg-white/7"
        >
          Criar uma nova etiqueta
        </button>
        <button
          type="button"
          className="h-11 w-full rounded-[1rem] border border-white/10 bg-white/4 text-sm text-[#d9e0ee] transition-colors hover:bg-white/7"
        >
          Mostrar mais etiquetas
        </button>
        <button
          type="button"
          className="min-h-14 w-full rounded-[1rem] border border-white/10 bg-white/4 px-4 text-sm leading-6 text-[#aeb8cf] transition-colors hover:bg-white/7"
        >
          Habilitar o modo compativel para usuarios com daltonismo
        </button>
      </div>
    </div>
  );
}
