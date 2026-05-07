"use client";

import { Check } from "@phosphor-icons/react";
import { LABEL_COLOR_SWATCHES, LABEL_COLOR_ORDER } from "@/lib/flowboard-constants";
import type { LabelTone } from "@/lib/flowboard-types";
import { cn } from "@/lib/utils";

export function LabelColorPicker({
  selected,
  onSelect,
}: {
  selected?: LabelTone | null;
  onSelect: (tone: LabelTone) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {LABEL_COLOR_ORDER.map((tone, index) => {
        const swatch = LABEL_COLOR_SWATCHES[tone];
        const active = selected === tone;

        return (
          <button
            key={`${tone}-${index}`}
            type="button"
            data-testid={`label-color-${tone}-${index}`}
            onClick={() => onSelect(tone)}
            className={cn(
              "flex h-10 items-center justify-center rounded-[0.8rem] transition-all hover:scale-[1.02]",
              swatch.solid,
              active ? "ring-2 ring-white/70" : "ring-1 ring-transparent",
            )}
          >
            {active ? <Check size={18} className={swatch.text} weight="bold" /> : null}
          </button>
        );
      })}
    </div>
  );
}
