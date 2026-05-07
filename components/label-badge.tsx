"use client";

import { Badge } from "@/components/ui/badge";
import { getLabelToneStyles } from "@/lib/flowboard-helpers";
import type { LabelRecord } from "@/lib/flowboard-types";
import { cn } from "@/lib/utils";

export function LabelBadge({
  label,
  compact = false,
  collapsed = false,
  interactive = false,
  modal = false,
  onClick,
  title,
}: {
  label: LabelRecord;
  compact?: boolean;
  collapsed?: boolean;
  interactive?: boolean;
  modal?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  const content = (
    <Badge
      className={cn(
        "overflow-hidden border-none font-medium tracking-[-0.01em] transition-all duration-200",
        getLabelToneStyles(label.tone),
        collapsed
          ? "h-3.5 w-[3.3rem] rounded-full px-0 py-0"
          : compact
            ? "rounded-md px-2 py-0.5 text-[10px] leading-4"
            : modal
              ? "rounded-[0.55rem] px-4 py-[0.72rem] text-[1.02rem] leading-5 tracking-[-0.025em]"
              : "rounded-md px-3 py-1.5 text-xs",
        interactive && "cursor-pointer active:scale-[0.98]",
      )}
    >
      {collapsed ? <span className="sr-only">{label.name}</span> : label.name}
    </Badge>
  );

  if (!interactive) {
    return content;
  }

  return (
    <button
      type="button"
      title={title}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      className="inline-flex"
    >
      {content}
    </button>
  );
}
