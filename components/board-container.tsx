"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function BoardContainer({
  children,
}: {
  children: ReactNode;
}) {
  return <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden transition-all duration-300")}>{children}</div>;
}
