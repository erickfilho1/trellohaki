"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";

export function SidebarToggleButton({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      data-testid="sidebar-toggle"
      aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
      className="absolute right-0 top-1/2 z-20 flex h-12 w-8 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-[#162033] text-[#dce5ff] shadow-[0_0_22px_rgba(113,156,255,0.25)] transition-all duration-300 hover:bg-[#1b2941]"
    >
      {collapsed ? <CaretRight size={16} weight="bold" /> : <CaretLeft size={16} weight="bold" />}
    </button>
  );
}
