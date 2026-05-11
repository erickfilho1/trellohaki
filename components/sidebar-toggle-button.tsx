"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function SidebarToggleButton({
  collapsed,
  onToggle,
  theme,
  revealed,
  focused,
  onFocusChange,
  onHoverChange,
}: {
  collapsed: boolean;
  onToggle: () => void;
  theme: "dark" | "light";
  revealed: boolean;
  focused: boolean;
  onFocusChange: (focused: boolean) => void;
  onHoverChange: (hovered: boolean) => void;
}) {
  const isLightTheme = theme === "light";

  return (
    <button
      type="button"
      onClick={onToggle}
      data-testid="sidebar-toggle"
      data-sidebar-toggle="true"
      data-theme={theme}
      data-visible={revealed || focused ? "true" : "false"}
      data-focused={focused ? "true" : "false"}
      aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
      onFocus={() => onFocusChange(true)}
      onBlur={() => onFocusChange(false)}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      className={cn(
        "absolute right-[-9px] top-[59%] z-20 flex h-10 w-[26px] -translate-y-1/2 items-center justify-center rounded-full border text-sm transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dc3933]/30",
        isLightTheme
          ? "border-[#d9d2c8] bg-[linear-gradient(180deg,#f8f4ed_0%,#ece6dc_100%)] text-[#171717] shadow-[0_14px_24px_-20px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.88)] hover:border-[#dc3933]/24 hover:bg-[#dc3933]/10 hover:text-[#dc3933]"
          : "border-white/10 bg-[linear-gradient(180deg,#171717_0%,#101010_100%)] text-[#eef2fb] shadow-[0_14px_28px_-20px_rgba(0,0,0,0.98),inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-white/16 hover:bg-[linear-gradient(180deg,#1d1d1d_0%,#131313_100%)] hover:text-white",
      )}
    >
      {collapsed ? <CaretRight size={14} weight="bold" /> : <CaretLeft size={14} weight="bold" />}
    </button>
  );
}
