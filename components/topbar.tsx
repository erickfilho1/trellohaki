"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { FunnelSimple, ImageSquare, Plus } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { AddDemandPopover, type AddDemandPayload } from "@/components/add-demand-popover";
import { BoardBackgroundPopover } from "@/components/board-background-popover";
import { FloatingPanel } from "@/components/floating-panel";
import { MemberProfilePopover, type ProfilePopoverMember } from "@/components/member-profile-popover";
import { useAuth } from "@/components/providers/auth-provider";
import { useFlowBoardStore } from "@/components/providers/flowboard-provider";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ADMIN_EMAIL } from "@/lib/auth/demo-credentials";
import { cleanProfileName, resolveUserProfileIdentity } from "@/lib/account-settings";
import type { BoardFiltersRecord, BoardRecord } from "@/lib/flowboard-types";
import { cn } from "@/lib/utils";

function initialsFromName(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function panelRoleLabel(panel: "admin" | "cliente" | "colaborador") {
  if (panel === "admin") {
    return "Administrador";
  }

  return panel === "colaborador" ? "Colaborador" : "Cliente";
}

function normalizeIdentityKey(value: string) {
  return value.trim().toLowerCase();
}

function isPlaceholderWorkspaceUser(email: string) {
  return normalizeIdentityKey(email).endsWith("@clientboard.local");
}

export function Topbar({
  title,
  subtitle,
  eyebrow,
  board,
  onAddDemand,
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
  onAddDemand?: (payload: AddDemandPayload) => void;
  onFilter?: () => void;
  onUpdateBoardAccent?: (accent: string) => void;
  filterButtonRef?: RefObject<HTMLButtonElement | null>;
  filters?: BoardFiltersRecord;
  filteredCount?: number;
  totalCount?: number;
  compact?: boolean;
}) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { adminUsers, workspaceAccess } = useFlowBoardStore();
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  const [demandOpen, setDemandOpen] = useState(false);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const backgroundButtonRef = useRef<HTMLButtonElement | null>(null);
  const demandButtonRef = useRef<HTMLButtonElement | null>(null);
  const memberAnchorRefs = useRef<Record<string, HTMLButtonElement | null>>({});
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
  const currentIdentity = useMemo(() => resolveUserProfileIdentity(user), [user]);

  const topbarMembers = useMemo<ProfilePopoverMember[]>(() => {
    if (!board) {
      return [];
    }

    const deduped = new Map<string, ProfilePopoverMember>();
    const currentEmail = normalizeIdentityKey(user.email);
    const currentName = cleanProfileName(user.name).toLowerCase();
    const boardAccess = workspaceAccess.filter((access) => access.boardId === board.id);
    const primaryAdmin =
      adminUsers.find((adminUser) => normalizeIdentityKey(adminUser.email) === normalizeIdentityKey(ADMIN_EMAIL)) ??
      null;

    const pushMember = (member: ProfilePopoverMember) => {
      const identityKey = normalizeIdentityKey(member.secondary || member.id);
      if (!deduped.has(identityKey)) {
        deduped.set(identityKey, member);
      }
    };

    boardAccess.forEach((access) => {
      const accessUser = adminUsers.find((adminUser) => adminUser.id === access.userId);
      if (!accessUser) {
        return;
      }

      const normalizedEmail = normalizeIdentityKey(accessUser.email);
      const normalizedName = cleanProfileName(accessUser.name).toLowerCase();
      const isCurrentUser = normalizedEmail === currentEmail || normalizedName === currentName;

      if (accessUser.kind === "admin" || isPlaceholderWorkspaceUser(accessUser.email)) {
        return;
      }

      pushMember({
        id: accessUser.id,
        name: isCurrentUser ? currentIdentity.name : cleanProfileName(accessUser.name),
        secondary: isCurrentUser ? user.email : accessUser.email,
        initials: isCurrentUser ? currentIdentity.initials : initialsFromName(accessUser.name),
        avatarUrl: isCurrentUser ? currentIdentity.avatarUrl : accessUser.avatarUrl,
        role: access.boardRole,
        isCurrentUser,
      });
    });

    if (primaryAdmin) {
      const isCurrentUser =
        normalizeIdentityKey(primaryAdmin.email) === currentEmail ||
        cleanProfileName(primaryAdmin.name).toLowerCase() === currentName;

      pushMember({
        id: primaryAdmin.id,
        name: isCurrentUser ? currentIdentity.name : cleanProfileName(primaryAdmin.name),
        secondary: isCurrentUser ? user.email : primaryAdmin.email,
        initials: isCurrentUser ? currentIdentity.initials : initialsFromName(primaryAdmin.name),
        avatarUrl: isCurrentUser ? currentIdentity.avatarUrl : primaryAdmin.avatarUrl,
        role: "Administrador",
        isCurrentUser,
      });
    }

    if (!Array.from(deduped.values()).some((member) => member.isCurrentUser) && user.email) {
      pushMember({
        id: "current-user",
        name: currentIdentity.name,
        secondary: user.email,
        initials: currentIdentity.initials,
        avatarUrl: currentIdentity.avatarUrl,
        role: panelRoleLabel(user.panel),
        isCurrentUser: true,
      });
    }

    return Array.from(deduped.values()).sort((left, right) => {
      if (left.isCurrentUser && !right.isCurrentUser) {
        return -1;
      }

      if (!left.isCurrentUser && right.isCurrentUser) {
        return 1;
      }

      return left.name.localeCompare(right.name, "pt-BR");
    });
  }, [adminUsers, board, currentIdentity, user.email, user.name, user.panel, workspaceAccess]);

  const activeMember = topbarMembers.find((member) => member.id === activeMemberId) ?? null;
  const activeMemberAnchorRef = useMemo(
    () => ({ current: activeMemberId ? memberAnchorRefs.current[activeMemberId] ?? null : null }),
    [activeMemberId],
  );

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
      const insidePanel =
        target instanceof HTMLElement ? target.closest("[data-board-background-popover='true']") : null;

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

  useEffect(() => {
    if (!demandOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      const insideButton = demandButtonRef.current?.contains(target);
      const insidePanel =
        target instanceof HTMLElement ? target.closest("[data-add-demand-popover='true']") : null;

      if (!insideButton && !insidePanel) {
        setDemandOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDemandOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [demandOpen]);

  useEffect(() => {
    if (!activeMemberId) {
      return;
    }

    const currentMemberId = activeMemberId;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      const anchor = memberAnchorRefs.current[currentMemberId];
      const insideButton = anchor?.contains(target);
      const insidePanel =
        target instanceof HTMLElement ? target.closest("[data-member-profile-popover='true']") : null;

      if (!insideButton && !insidePanel) {
        setActiveMemberId(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveMemberId(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [activeMemberId]);

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
          {subtitle ? <p className="mt-1 truncate text-sm text-[#94a0b7]">{subtitle}</p> : null}
          {typeof filteredCount === "number" && typeof totalCount === "number" ? (
            <p className="mt-2 text-xs text-[#7f8bad]">
              {filteredCount === totalCount
                ? `${totalCount} cards visíveis`
                : `${filteredCount} de ${totalCount} cards visíveis`}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {board && onUpdateBoardAccent ? (
            <>
              <InfoTooltip content="Plano de fundo do quadro" side="bottom">
                <button
                  ref={backgroundButtonRef}
                  type="button"
                  onClick={() => setBackgroundOpen((current) => !current)}
                  className={cn(
                    "inline-flex items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.04] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-200 hover:-translate-y-[1px] hover:border-white/16 hover:bg-white/[0.08]",
                    compact ? "size-10" : "size-11",
                    backgroundOpen && "border-white/16 bg-white/[0.08]",
                  )}
                >
                  <ImageSquare size={17} weight="duotone" />
                </button>
              </InfoTooltip>

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
                <span className="ml-1 rounded-full bg-[#dc3933] px-2 py-0.5 text-[11px] text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
          ) : null}

          {board ? (
            <div className="relative">
              <AvatarGroup className="items-center">
                {topbarMembers.slice(0, 4).map((member) => (
                  <InfoTooltip key={member.id} content={member.name} side="bottom">
                    <button
                      ref={(node) => {
                        memberAnchorRefs.current[member.id] = node;
                      }}
                      type="button"
                      data-testid={
                        member.isCurrentUser
                          ? "open-user-menu"
                          : `open-member-menu-${member.id}`
                      }
                      onClick={() =>
                        setActiveMemberId((current) => (current === member.id ? null : member.id))
                      }
                      className="rounded-full transition-transform duration-150 hover:-translate-y-0.5"
                    >
                      <Avatar className="bg-[#121212] ring-2 ring-[#0b0b0b]" size="default">
                        {member.avatarUrl ? (
                          <AvatarImage src={member.avatarUrl} alt={member.name} />
                        ) : null}
                        <AvatarFallback className="bg-[radial-gradient(circle_at_32%_20%,#313136,#17181c_50%,#0d0d0f)] text-[12px] font-semibold text-[#f5f7fb]">
                          {member.initials}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </InfoTooltip>
                ))}
                {topbarMembers.length > 4 ? (
                  <AvatarGroupCount className="bg-[#171717] text-[#f4f4f5] ring-[#0b0b0b]">
                    +{topbarMembers.length - 4}
                  </AvatarGroupCount>
                ) : null}
              </AvatarGroup>

              <MemberProfilePopover
                anchorRef={activeMemberAnchorRef}
                open={Boolean(activeMember)}
                member={activeMember}
                board={board}
                onClose={() => setActiveMemberId(null)}
                onBoard={() => {
                  setActiveMemberId(null);
                  router.push("/");
                }}
                onSettings={() => {
                  setActiveMemberId(null);
                  router.push("/configuracoes");
                }}
                onLogout={() => {
                  setActiveMemberId(null);
                  void logout().then(() => {
                    router.replace("/login");
                  });
                }}
              />
            </div>
          ) : null}

          {board ? (
            <>
              <InfoTooltip content="Novo fluxo" side="bottom">
                <Button
                  ref={demandButtonRef}
                  data-testid="open-add-demand"
                  onClick={() => setDemandOpen((current) => !current)}
                  className={`rounded-[1rem] border border-white/10 bg-[#dc3933] px-0 text-white shadow-[0_18px_36px_-24px_rgba(220,57,51,0.72)] hover:bg-[#ef5148] ${
                    compact ? "size-10" : "size-11"
                  }`}
                  aria-label="Novo fluxo"
                >
                  <Plus size={16} weight="bold" />
                </Button>
              </InfoTooltip>

              <FloatingPanel
                anchorRef={demandButtonRef}
                open={demandOpen}
                align="end"
                placement="bottom"
                offset={12}
                estimatedWidth={420}
                estimatedHeight={680}
                className="w-[min(26rem,calc(100vw-24px))]"
              >
                <div data-add-demand-popover="true">
                  <AddDemandPopover
                    board={board}
                    onCreate={(payload) => {
                      onAddDemand?.(payload);
                      setDemandOpen(false);
                    }}
                    onClose={() => setDemandOpen(false)}
                  />
                </div>
              </FloatingPanel>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
