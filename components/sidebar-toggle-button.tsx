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
      className="absolute right-0 top-[56%] z-20 flex h-14 w-9 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[999px] border border-white/10 bg-[linear-gradient(180deg,#171717_0%,#101010_100%)] text-[#eef2fb] shadow-[0_16px_34px_-22px_rgba(0,0,0,0.98),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-300 hover:border-white/16 hover:bg-[linear-gradient(180deg,#1d1d1d_0%,#131313_100%)] hover:text-white"
    >
      {collapsed ? <CaretRight size={16} weight="bold" /> : <CaretLeft size={16} weight="bold" />}
    </button>
  );
}
