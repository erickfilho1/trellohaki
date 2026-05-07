"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "clientboard-sidebar-collapsed";

function getInitialCollapsedState() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

export function ClientLayout({
  children,
  projectName,
}: {
  children: React.ReactNode;
  projectName: string;
}) {
  const [collapsed, setCollapsed] = useState(getInitialCollapsedState);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  return (
    <div className="grid h-[100dvh] overflow-hidden grid-cols-[auto_minmax(0,1fr)]">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((current) => !current)}
        projectName={projectName}
      />

      <div
        className={cn("flex h-[100dvh] min-h-0 min-w-0 flex-col overflow-hidden transition-all duration-300")}
      >
        {children}
      </div>
    </div>
  );
}
