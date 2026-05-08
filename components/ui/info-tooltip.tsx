"use client";

import {
  cloneElement,
  isValidElement,
  useState,
  type FocusEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type TooltipTriggerProps = {
  onMouseEnter?: (event: ReactMouseEvent<HTMLElement>) => void;
  onMouseLeave?: (event: ReactMouseEvent<HTMLElement>) => void;
  onFocus?: (event: FocusEvent<HTMLElement>) => void;
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
};

export function InfoTooltip({
  children,
  content,
  align = "center",
  side = "top",
}: {
  children: ReactElement<TooltipTriggerProps>;
  content: string;
  align?: "left" | "center" | "right";
  side?: "top" | "bottom";
}) {
  const childProps = children.props;
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  function updatePosition(target: HTMLElement) {
    const rect = target.getBoundingClientRect();
    setPosition({
      top: side === "top" ? rect.top - 10 : rect.bottom + 10,
      left: align === "left" ? rect.left : align === "right" ? rect.right : rect.left + rect.width / 2,
    });
  }

  if (!isValidElement(children)) {
    return children;
  }

  const trigger = cloneElement(children, {
    onMouseEnter: (event: ReactMouseEvent<HTMLElement>) => {
      updatePosition(event.currentTarget);
      setOpen(true);
      childProps.onMouseEnter?.(event);
    },
    onMouseLeave: (event: ReactMouseEvent<HTMLElement>) => {
      setOpen(false);
      childProps.onMouseLeave?.(event);
    },
    onFocus: (event: FocusEvent<HTMLElement>) => {
      updatePosition(event.currentTarget);
      setOpen(true);
      childProps.onFocus?.(event);
    },
    onBlur: (event: FocusEvent<HTMLElement>) => {
      setOpen(false);
      childProps.onBlur?.(event);
    },
  });

  return (
    <>
      {trigger}
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className={cn(
                "pointer-events-none fixed z-[220] min-w-max max-w-[16rem] rounded-[0.6rem] border border-black/10 bg-[#f2f0ec] px-3 py-1.5 text-[0.78rem] font-medium leading-5 whitespace-nowrap text-[#24262b] shadow-[0_10px_30px_-18px_rgba(0,0,0,0.42)]",
                align === "left" ? "" : align === "right" ? "-translate-x-full" : "-translate-x-1/2",
                side === "top" ? "-translate-y-full" : "",
              )}
              style={{
                top: position.top,
                left: position.left,
              }}
            >
              {content}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
