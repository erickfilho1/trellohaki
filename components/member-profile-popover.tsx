"use client";

import type { RefObject } from "react";
import { ArrowSquareOut, FadersHorizontal, Kanban, ShieldCheck, SignOut, X } from "@phosphor-icons/react";
import { FloatingPanel } from "@/components/floating-panel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { BoardRecord } from "@/lib/flowboard-types";

export type ProfilePopoverMember = {
  id: string;
  name: string;
  secondary: string;
  initials: string;
  avatarUrl?: string;
  role?: string;
  isCurrentUser: boolean;
};

export function MemberProfilePopover({
  anchorRef,
  open,
  member,
  board,
  onClose,
  onBoard,
  onSettings,
  onLogout,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  member: ProfilePopoverMember | null;
  board?: BoardRecord;
  onClose: () => void;
  onBoard: () => void;
  onSettings: () => void;
  onLogout: () => void;
}) {
  if (!open || !member) {
    return null;
  }

  return (
    <FloatingPanel
      anchorRef={anchorRef}
      open={open}
      align="end"
      placement="bottom"
      offset={12}
      estimatedWidth={320}
      estimatedHeight={420}
      className="w-[min(20rem,calc(100vw-24px))]"
    >
      <div
        data-member-profile-popover="true"
        className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#0d0f14] text-white shadow-[0_28px_90px_-34px_rgba(0,0,0,0.98)]"
      >
        <div className="relative border-b border-white/8 bg-[linear-gradient(180deg,rgba(220,57,51,0.18),rgba(220,57,51,0.05))] px-4 py-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar perfil"
            className="absolute right-3 top-3 grid size-9 place-items-center rounded-[0.9rem] border border-white/10 bg-white/[0.05] text-[#d4d8e2] transition hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
          >
            <X size={17} />
          </button>

          <div className="flex items-center gap-3 pr-11">
            <Avatar className="size-14 border border-white/10 bg-[#131313] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt={member.name} /> : null}
              <AvatarFallback className="bg-[radial-gradient(circle_at_32%_20%,#2f2f32,#17181c_48%,#0d0d0f)] text-lg font-semibold text-[#f5f7fb]">
                {member.initials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <p className="truncate text-[1.05rem] font-semibold tracking-[-0.03em] text-white">{member.name}</p>
              <p className="mt-1 truncate text-sm text-[#9fa7b8]">{member.secondary}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="grid gap-2">
            <div className="rounded-[1rem] border border-white/8 bg-white/[0.03] px-3 py-3">
              <p className="text-[11px] tracking-[0.18em] text-[#7f889c] uppercase">Quadro atual</p>
              <p className="mt-2 truncate text-sm font-medium text-white">{board?.name ?? "Painel Haki"}</p>
            </div>
            <div className="rounded-[1rem] border border-white/8 bg-white/[0.03] px-3 py-3">
              <p className="text-[11px] tracking-[0.18em] text-[#7f889c] uppercase">Papel</p>
              <p className="mt-2 flex items-center gap-2 text-sm font-medium text-white">
                <ShieldCheck size={15} className="text-[#dc3933]" />
                {member.role ?? (member.isCurrentUser ? "Administrador" : "Membro do quadro")}
              </p>
            </div>
          </div>

          <div className="space-y-1 border-t border-white/8 pt-3">
            <button
              type="button"
              onClick={onBoard}
              className="flex h-11 w-full items-center justify-between rounded-[0.95rem] px-3 text-left text-sm text-[#e7ebf5] transition hover:bg-white/[0.06]"
            >
              <span>Quadro</span>
              <Kanban size={17} className="text-[#8d97aa]" />
            </button>

            {member.isCurrentUser ? (
              <>
                <button
                  type="button"
                  onClick={onSettings}
                  className="flex h-11 w-full items-center justify-between rounded-[0.95rem] px-3 text-left text-sm text-[#e7ebf5] transition hover:bg-white/[0.06]"
                >
                  <span>Configurações</span>
                  <FadersHorizontal size={17} className="text-[#8d97aa]" />
                </button>

                <button
                  type="button"
                  onClick={onLogout}
                  className="flex h-11 w-full items-center justify-between rounded-[0.95rem] px-3 text-left text-sm text-[#e7ebf5] transition hover:bg-white/[0.06]"
                >
                  <span>Logout</span>
                  <SignOut size={17} className="text-[#8d97aa]" />
                </button>
              </>
            ) : (
              <div className="rounded-[1rem] border border-white/8 bg-white/[0.02] px-3 py-3 text-sm leading-6 text-[#9fa7b8]">
                Este perfil participa deste quadro e compartilha os mesmos dados de acesso vinculados ao workspace.
              </div>
            )}
          </div>

          {member.isCurrentUser ? (
            <Button
              variant="outline"
              onClick={onSettings}
              className="h-10 w-full rounded-[0.95rem] border-white/10 bg-white/[0.035] text-white hover:border-[#dc3933]/35 hover:bg-[#dc3933]/12"
            >
              <ArrowSquareOut size={16} />
              Abrir perfil completo
            </Button>
          ) : null}
        </div>
      </div>
    </FloatingPanel>
  );
}
