"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function BoardContainer({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-2.5 transition-all duration-300 sm:px-5 lg:px-6")}>
      <div className="glass-panel flex h-full min-h-0 flex-1 overflow-hidden rounded-[1.9rem] border border-white/8 bg-[linear-gradient(180deg,rgba(16,22,33,0.94),rgba(11,15,25,0.94))]">
        {children}
      </div>
    </div>
  );
}
