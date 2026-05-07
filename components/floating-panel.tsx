"use client";

import { useLayoutEffect, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type Align = "start" | "end";
type Placement = "auto" | "bottom" | "top";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function FloatingPanel({
  anchorRef,
  open,
  children,
  className,
  align = "start",
  placement = "auto",
  offset = 12,
  estimatedHeight = 420,
  estimatedWidth = 420,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  children: ReactNode;
  className?: string;
  align?: Align;
  placement?: Placement;
  offset?: number;
  estimatedHeight?: number;
  estimatedWidth?: number;
}) {
  const [style, setStyle] = useState<{ top: number; left: number; opacity: number }>({
    top: 0,
    left: 0,
    opacity: 0,
  });

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      return;
    }

    function updatePosition() {
      const anchor = anchorRef.current;
      if (!anchor) {
        return;
      }

      const rect = anchor.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const panelWidth = Math.min(estimatedWidth, viewportWidth - 24);
      const rawLeft = align === "end" ? rect.right - panelWidth : rect.left;
      const downTop = rect.bottom + offset;
      const upTop = rect.top - estimatedHeight - offset;
      const canOpenDown = downTop + estimatedHeight <= viewportHeight - 12;
      const preferredTop =
        placement === "bottom"
          ? canOpenDown
            ? downTop
            : Math.max(12, viewportHeight - estimatedHeight - 12)
          : placement === "top"
            ? Math.max(12, upTop)
            : canOpenDown
              ? downTop
              : Math.max(12, upTop);

      setStyle({
        top: preferredTop,
        left: clamp(rawLeft, 12, viewportWidth - panelWidth - 12),
        opacity: 1,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [align, anchorRef, estimatedHeight, estimatedWidth, offset, open, placement]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        "fixed z-[140] origin-top data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
        className,
      )}
      data-state={open ? "open" : "closed"}
      style={{
        top: style.top,
        left: style.left,
        opacity: style.opacity,
        maxHeight: `calc(100vh - ${style.top + 16}px)`,
        ["--floating-panel-max-height" as string]: `calc(100vh - ${style.top + 16}px)`,
        ["--floating-panel-max-width" as string]: `calc(100vw - 24px)`,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
