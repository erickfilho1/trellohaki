"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { FunnelSimple, ImageSquare, Lightning, ShareNetwork } from "@phosphor-icons/react";
import { AutomationHoverPopover } from "@/components/automation-hover-popover";
import { BoardBackgroundPopover } from "@/components/board-background-popover";
import { FloatingPanel } from "@/components/floating-panel";
import { useAuth } from "@/components/providers/auth-provider";
import { UserMenuPopover } from "@/components/user-menu-popover";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { BoardFiltersRecord, BoardRecord } from "@/lib/flowboard-types";
import { cn } from "@/lib/utils";

function initialsFromName(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Topbar({
  title,
  subtitle,
  eyebrow,
  board,
  onShare,
  onFilter,
  onUpdateBoardAccent,
  filterButtonRef,
  filters,
  filteredCount,
  totalCount,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  board?: BoardRecord;
  onShare?: () => void;
  onFilter?: () => void;
  onUpdateBoardAccent?: (accent: string) => void;
  filterButtonRef?: RefObject<HTMLButtonElement | null>;
  filters?: BoardFiltersRecord;
  filteredCount?: number;
  totalCount?: number;
  compact?: boolean;
}) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [automationOpen, setAutomationOpen] = useState(false);
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  const backgroundButtonRef = useRef<HTMLButtonElement | null>(null);
  const automationButtonRef = useRef<HTMLButtonElement | null>(null);
  const automationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeFilterCount = filters
    ? [
        Boolean(filters.keyword.trim()),
        filters.memberIds.length > 0,
        filters.assignedToMe,
        filters.noMembers,
        filters.completed,
        filters.notCompleted,
        filters.noDueDate,
        filters.overdue,
        filters.dueToday,
        filters.dueTomorrow,
        filters.dueThisWeek,
        filters.dueThisMonth,
        filters.labelIds.length > 0,
        filters.noLabels,
        Boolean(filters.activityRange),
      ].filter(Boolean).length
    : 0;

  useEffect(() => {
    return () => {
      if (automationTimerRef.current) {
        clearTimeout(automationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!backgroundOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      const insideButton = backgroundButtonRef.current?.contains(target);
      const insidePanel = target instanceof HTMLElement ? target.closest("[data-board-background-popover='true']") : null;

      if (!insideButton && !insidePanel) {
        setBackgroundOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setBackgroundOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [backgroundOpen]);

  function openAutomation() {
    if (automationTimerRef.current) {
      clearTimeout(automationTimerRef.current);
      automationTimerRef.current = null;
    }
    setAutomationOpen(true);
  }

  function closeAutomationWithDelay() {
    if (automationTimerRef.current) {
      clearTimeout(automationTimerRef.current);
    }

    automationTimerRef.current = setTimeout(() => {
      setAutomationOpen(false);
      automationTimerRef.current = null;
    }, 140);
  }

  return (
    <header
      data-app-topbar="true"
      className={`relative z-[20] border-b border-white/7 bg-[#0b0b0b]/88 backdrop-blur ${
        compact ? "px-4 py-2.5 sm:px-6 lg:px-8" : "px-4 py-4 sm:px-6 lg:px-8"
      }`}
    >
      <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="truncate text-[11px] font-semibold tracking-[0.28em] text-[#7f8bad] uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h1
            className={`truncate font-semibold tracking-[-0.05em] text-white ${
              compact ? "text-[1.15rem] leading-none" : "mt-2 text-[1.55rem]"
            }`}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 truncate text-sm text-[#94a0b7]">{subtitle}</p>
          ) : null}
          {typeof filteredCount === "number" && typeof totalCount === "number" ? (
            <p className="mt-2 text-xs text-[#7f8bad]">
              {filteredCount === totalCount
                ? `${totalCount} cards visiveis`
                : `${filteredCount} de ${totalCount} cards visiveis`}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {board && onUpdateBoardAccent ? (
            <>
              <button
                ref={backgroundButtonRef}
                type="button"
                onClick={() => setBackgroundOpen((current) => !current)}
                title="Plano de fundo do quadro"
                className={cn(
                  "inline-flex items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.04] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-200 hover:-translate-y-[1px] hover:border-white/16 hover:bg-white/[0.08]",
                  compact ? "size-10" : "size-11",
                  backgroundOpen && "border-white/16 bg-white/[0.08]",
                )}
              >
                <ImageSquare size={17} weight="duotone" />
              </button>

              <FloatingPanel
                anchorRef={backgroundButtonRef}
                open={backgroundOpen}
                align="end"
                placement="bottom"
                offset={12}
                estimatedWidth={352}
                estimatedHeight={420}
                className="w-[min(22rem,calc(100vw-24px))]"
              >
                <div data-board-background-popover="true">
                  <BoardBackgroundPopover
                    currentAccent={board.accent}
                    onSelectAccent={(accent) => {
                      onUpdateBoardAccent(accent);
                      setBackgroundOpen(false);
                    }}
                    onClose={() => setBackgroundOpen(false)}
                  />
                </div>
              </FloatingPanel>
            </>
          ) : null}

          {board ? (
            <Button
              ref={filterButtonRef}
              data-testid="open-filter-panel"
              variant="outline"
              onClick={onFilter}
              className={`relative rounded-[1rem] border border-white/10 bg-white/4 px-4 text-white hover:bg-white/8 ${
                compact ? "h-10" : "h-11"
              }`}
            >
              <FunnelSimple size={16} />
              Filtro
              {activeFilterCount > 0 ? (
                <span className="ml-1 rounded-full bg-[#4f79ff] px-2 py-0.5 text-[11px] text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
          ) : null}

          {board ? (
            <>
              <button
                ref={automationButtonRef}
                type="button"
                onMouseEnter={openAutomation}
                onMouseLeave={closeAutomationWithDelay}
                title="Automações"
                className={cn(
                  "inline-flex items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.04] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-200 hover:-translate-y-[1px] hover:border-white/16 hover:bg-white/[0.08]",
                  compact ? "size-10" : "size-11",
                )}
              >
                <Lightning size={17} weight="duotone" />
              </button>

              <AutomationHoverPopover
                anchorRef={automationButtonRef}
                open={automationOpen}
                onMouseEnter={openAutomation}
                onMouseLeave={closeAutomationWithDelay}
              />
            </>
          ) : null}

          {board ? (
            <div className="relative">
              <AvatarGroup className="items-center">
                <button
                  type="button"
                  data-testid="open-user-menu"
                  onClick={() => setMenuOpen((current) => !current)}
                  title={user.name}
                  className="rounded-full transition-transform duration-150 hover:-translate-y-0.5"
                >
                  <Avatar className="bg-[#161616] ring-2 ring-[#0b0b0b]" size="default">
                    <AvatarFallback className="bg-[#242424] text-[#f4f4f5]">
                      {initialsFromName(user.name)}
                    </AvatarFallback>
                  </Avatar>
                </button>
                {board.members
                  .filter((member) => !member.name.includes("(voce)"))
                  .slice(0, 1)
                  .map((member) => (
                    <div key={member.id} title={member.name}>
                      <Avatar className="bg-[#151515] ring-2 ring-[#0b0b0b]" size="default">
                        <AvatarFallback className="bg-[#13a9c9] text-[#073245]">
                          {member.initials}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  ))}
              </AvatarGroup>

              <UserMenuPopover
                user={user}
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                onLogout={logout}
              />
            </div>
          ) : null}

          {board ? (
            <Button
              data-testid="share-board-primary"
              onClick={onShare}
              className={`rounded-[1rem] border border-white/10 bg-[#4f79ff] px-4 text-white hover:bg-[#6388ff] ${
                compact ? "h-10" : "h-11"
              }`}
            >
              <ShareNetwork size={16} />
              Compartilhar
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
