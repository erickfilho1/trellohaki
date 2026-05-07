"use client";

import { useState } from "react";
import { CheckSquare, PencilSimpleLine, Plus, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getChecklistProgress } from "@/lib/flowboard-helpers";
import type { ChecklistRecord } from "@/lib/flowboard-types";

export function ChecklistSection({
  checklists,
  onChange,
}: {
  checklists: ChecklistRecord[];
  onChange: (value: ChecklistRecord[], activityText?: string) => void;
}) {
  const [newChecklistName, setNewChecklistName] = useState("");
  const [draftItems, setDraftItems] = useState<Record<string, string>>({});

  function addChecklist() {
    const title = newChecklistName.trim();
    if (!title) {
      return;
    }

    onChange(
      [
        ...checklists,
        {
          id: `checklist-${crypto.randomUUID().slice(0, 8)}`,
          title,
          items: [],
        },
      ],
      `Voce criou a checklist ${title}`,
    );
    setNewChecklistName("");
  }

  function addItem(checklistId: string) {
    const text = draftItems[checklistId]?.trim();
    if (!text) {
      return;
    }

    onChange(
      checklists.map((checklist) =>
        checklist.id === checklistId
          ? {
              ...checklist,
              items: [
                ...checklist.items,
                {
                  id: `item-${crypto.randomUUID().slice(0, 8)}`,
                  text,
                  completed: false,
                },
              ],
            }
          : checklist,
      ),
      `Voce adicionou um item na checklist`,
    );
    setDraftItems((current) => ({ ...current, [checklistId]: "" }));
  }

  function toggleItem(checklistId: string, itemId: string) {
    onChange(
      checklists.map((checklist) =>
        checklist.id === checklistId
          ? {
              ...checklist,
              items: checklist.items.map((item) =>
                item.id === itemId ? { ...item, completed: !item.completed } : item,
              ),
            }
          : checklist,
      ),
      "Voce atualizou uma checklist",
    );
  }

  function removeItem(checklistId: string, itemId: string) {
    onChange(
      checklists.map((checklist) =>
        checklist.id === checklistId
          ? {
              ...checklist,
              items: checklist.items.filter((item) => item.id !== itemId),
            }
          : checklist,
      ),
      "Voce removeu um item da checklist",
    );
  }

  function removeChecklist(checklistId: string) {
    onChange(
      checklists.filter((checklist) => checklist.id !== checklistId),
      "Voce removeu uma checklist",
    );
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CheckSquare size={18} className="text-[#8ca7ff]" />
          <h3 className="text-lg font-medium tracking-[-0.03em] text-white">Checklist</h3>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={newChecklistName}
            onChange={(event) => setNewChecklistName(event.target.value)}
            placeholder="Nova checklist"
            className="h-10 w-44 rounded-[0.95rem] border-white/10 bg-white/4 text-white placeholder:text-[#677189]"
          />
          <Button
            variant="outline"
            onClick={addChecklist}
            className="h-10 rounded-[0.95rem] border-white/10 bg-white/4 text-white hover:bg-white/7"
          >
            <Plus size={14} />
            Criar
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {checklists.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-white/3 p-4 text-sm text-[#8f97ab]">
            Nenhuma checklist criada ainda.
          </div>
        ) : null}

        {checklists.map((checklist) => {
          const progress = getChecklistProgress(checklist.items);

          return (
            <div key={checklist.id} className="rounded-[1.35rem] border border-white/8 bg-white/3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-base font-medium text-white">{checklist.title}</h4>
                  <p className="mt-1 text-sm text-[#8f97ab]">{progress}% concluido</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeChecklist(checklist.id)}
                  className="flex size-9 items-center justify-center rounded-lg text-[#aab4cb] transition-colors hover:bg-white/7 hover:text-white"
                >
                  <Trash size={16} />
                </button>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/6">
                <div
                  className="h-full rounded-full bg-[#63a57d]"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="mt-4 space-y-2">
                {checklist.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-[1rem] border border-white/6 bg-[#1b202b] px-3 py-2.5"
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleItem(checklist.id, item.id)}
                      className="size-4 accent-[#79a4ff]"
                    />
                    <span className={`flex-1 text-sm ${item.completed ? "text-[#7f8bad] line-through" : "text-[#dce3f3]"}`}>
                      {item.text}
                    </span>
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-lg text-[#aab4cb] hover:bg-white/6"
                    >
                      <PencilSimpleLine size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(checklist.id, item.id)}
                      className="flex size-8 items-center justify-center rounded-lg text-[#aab4cb] hover:bg-white/6"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <Input
                  data-testid={`checklist-input-${checklist.id}`}
                  value={draftItems[checklist.id] ?? ""}
                  onChange={(event) =>
                    setDraftItems((current) => ({ ...current, [checklist.id]: event.target.value }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      addItem(checklist.id);
                    }
                  }}
                  placeholder="Adicionar item"
                  className="h-10 rounded-[0.95rem] border-white/10 bg-white/4 text-white placeholder:text-[#677189]"
                />
                <Button
                  data-testid={`checklist-add-${checklist.id}`}
                  onClick={() => addItem(checklist.id)}
                  className="h-10 rounded-[0.95rem] border border-white/10 bg-white text-[#0b0f19] hover:bg-[#dde5ff]"
                >
                  <Plus size={14} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
