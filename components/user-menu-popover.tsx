"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowSquareOut,
  X,
  FadersHorizontal,
  Kanban,
  Package,
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { AuthUser } from "@/components/providers/auth-provider";

function initialsFromUser(user: AuthUser) {
  return user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function UserMenuHeader({ user }: { user: AuthUser }) {
  return (
    <div className="border-b border-[#0000001a] bg-[#6fa0f1] px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="bg-[#182131] shadow-[0_10px_24px_-18px_rgba(0,0,0,0.8)]" size="lg">
            <AvatarFallback className="bg-[#11b6d6] text-[1.9rem] font-semibold text-[#093044]">
              {initialsFromUser(user)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-[1rem] font-medium text-[#07111e]">{user.name}</p>
            <p className="truncate text-sm text-[#0c345f]">{user.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      aria-label="Fechar menu"
      onClick={onClose}
      className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-[0.8rem] border border-white/65 bg-[#84aef3] text-[#173052] transition-colors hover:bg-[#97baf5]"
    >
      <X size={18} />
    </button>
  );
}

function HeaderBlock({ user, onClose }: { user: AuthUser; onClose: () => void }) {
  return (
    <div className="relative">
      <CloseButton onClose={onClose} />
      <UserMenuHeader user={user} />
    </div>
  );
}

function CompactMenuItem({
  label,
  icon,
  onSelect,
  testId,
}: {
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onSelect}
      className="flex h-10 items-center gap-3 rounded-[0.9rem] px-3 text-sm text-[#e5ebf7] transition-colors hover:bg-white/6"
    >
      <span className="text-[#9aa5bc]">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function AccountLinks({
  onBoard,
  onProjects,
  onSettings,
  onLogout,
}: {
  onBoard: () => void;
  onProjects: () => void;
  onSettings: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="px-3 py-3">
      <CompactMenuItem label="Ver perfil" icon={<Kanban size={18} />} onSelect={onBoard} testId="user-menu-board" />
      <div className="my-2 border-t border-white/8" />
      <CompactMenuItem
        label="Projetos"
        icon={<Package size={18} />}
        onSelect={onProjects}
        testId="user-menu-projects"
      />
      <CompactMenuItem
        label="Configuracoes"
        icon={<FadersHorizontal size={18} />}
        onSelect={onSettings}
        testId="user-menu-settings"
      />
      <CompactMenuItem
        label="Desconectar"
        icon={<ArrowSquareOut size={18} />}
        onSelect={onLogout}
        testId="user-menu-logout"
      />
    </div>
  );
}

export function UserMenuPopover({
  user,
  open,
  onClose,
  onLogout,
}: {
  user: AuthUser;
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}) {
  const router = useRouter();
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) {
        return;
      }
      onClose();
    }

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      ref={popoverRef}
      data-testid="user-menu-popover"
      className="absolute right-0 top-[calc(100%+0.85rem)] z-[40] w-[280px] origin-top-right overflow-hidden rounded-[1.2rem] border border-white/10 bg-[#171b22] shadow-[0_28px_90px_-36px_rgba(0,0,0,0.96)] animate-in fade-in-0 zoom-in-95 duration-150"
    >
      <HeaderBlock user={user} onClose={onClose} />
      <AccountLinks
        onBoard={() => {
          onClose();
          router.push("/");
        }}
        onProjects={() => {
          onClose();
          router.push("/projetos-entregues");
        }}
        onSettings={() => {
          onClose();
          router.push("/configuracoes");
        }}
        onLogout={() => {
          onClose();
          onLogout();
          router.replace("/login");
        }}
      />
    </div>
  );
}
