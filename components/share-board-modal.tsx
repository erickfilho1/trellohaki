"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CaretDown, Check, Copy, LinkSimple, X } from "@phosphor-icons/react";
import { BOARD_ROLES } from "@/lib/flowboard-constants";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FloatingPanel } from "@/components/floating-panel";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { BoardRecord, BoardRole } from "@/lib/flowboard-types";

function PermissionSelect({
  value,
  onChange,
  className,
  panelWidthClassName,
}: {
  value: BoardRole;
  onChange: (value: BoardRole) => void;
  className?: string;
  panelWidthClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(220);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    setPanelWidth(triggerRef.current?.offsetWidth ?? 220);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-12 min-w-0 items-center justify-between gap-3 rounded-[1rem] border border-white/10 bg-[#2a2d36] px-4 text-left text-white transition-colors hover:border-white/18 hover:bg-[#313540] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7fa4ff]/45",
          className,
        )}
      >
        <span className="truncate text-[1.02rem]">{value}</span>
        <CaretDown
          size={16}
          className={cn("shrink-0 text-[#c4cee3] transition-transform", open && "rotate-180")}
        />
      </button>

      <FloatingPanel
        anchorRef={triggerRef}
        open={open}
        align="start"
        placement="bottom"
        offset={12}
        estimatedWidth={panelWidth}
        estimatedHeight={220}
        className={panelWidthClassName}
      >
        <div
          ref={panelRef}
          className="rounded-[1rem] border border-white/10 bg-[#23262f] p-2 shadow-[0_28px_80px_-30px_rgba(0,0,0,0.94)]"
          style={{ width: panelWidth }}
        >
          <div className="flex flex-col gap-1.5">
            {BOARD_ROLES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  onChange(item);
                  setOpen(false);
                }}
                className={cn(
                  "flex min-h-11 w-full items-center justify-between rounded-[0.85rem] px-3 py-2.5 text-left text-[0.98rem] transition-colors",
                  item === value
                    ? "bg-[#6c9dff]/18 text-white ring-1 ring-inset ring-[#8eb2ff]/18"
                    : "text-[#d6dced] hover:bg-white/6 hover:text-white",
                )}
              >
                <span>{item}</span>
                {item === value ? <Check size={16} className="text-[#97b8ff]" /> : null}
              </button>
            ))}
          </div>
        </div>
      </FloatingPanel>
    </>
  );
}

export function ShareBoardModal({
  board,
  open,
  onOpenChange,
  onUpdateBoard,
}: {
  board: BoardRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateBoard: (updates: Partial<BoardRecord>) => void;
}) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<BoardRole>("Membro");
  const [tab, setTab] = useState<"members" | "requests">("members");

  const shareLink = useMemo(
    () => board.shareLink || `https://flowboard.local/share/${board.id}`,
    [board.id, board.shareLink],
  );

  function createLink() {
    onUpdateBoard({ shareLink });
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareLink);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="!w-[1040px] !max-w-[92vw] overflow-hidden rounded-[1.8rem] border border-white/8 bg-[#26282f] p-0 text-white shadow-[0_42px_120px_-36px_rgba(0,0,0,0.96)]"
        style={{
          width: "1040px",
          maxWidth: "92vw",
          height: "min(82vh, 760px)",
        }}
      >
        <DialogHeader className="border-b border-white/8 px-8 py-6">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="text-[1.9rem] font-medium tracking-[-0.05em] text-white">
              Compartilhar quadro
            </DialogTitle>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex size-11 items-center justify-center rounded-[0.95rem] border border-white/10 text-[#dbe3f6] transition-colors hover:bg-white/6"
            >
              <X size={20} />
            </button>
          </div>
        </DialogHeader>

        <div className="flowboard-scrollbar h-full overflow-y-auto px-8 py-6">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_190px]">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Endereço de e-mail ou nome"
              className="h-12 rounded-[1rem] border-white/10 bg-[#2a2d36] text-white placeholder:text-[#8089a0]"
            />
            <PermissionSelect value={role} onChange={setRole} className="w-full" />
            <Button className="h-12 rounded-[1rem] border border-white/10 bg-[#6c9dff] text-[#10203b] shadow-[0_18px_30px_-18px_rgba(108,157,255,0.8)] hover:bg-[#82adff]">
              Compartilhar
            </Button>
          </div>

          <div className="mt-6 rounded-[1.25rem] border border-white/8 bg-white/3 p-5">
            <div className="flex items-start gap-4">
              <span className="flex size-12 items-center justify-center rounded-[1rem] bg-white/6 text-[#d8e1f4]">
                <LinkSimple size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base text-white">Compartilhar este quadro com um link</p>
                <button
                  type="button"
                  onClick={createLink}
                  data-testid="create-share-link"
                  className="mt-1 text-sm text-[#7fa4ff] hover:text-[#a5c0ff]"
                >
                  Criar link
                </button>
                {board.shareLink ? (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <span className="min-w-0 flex-1 truncate rounded-lg border border-white/10 bg-[#20242d] px-3 py-2 text-sm text-[#dbe3f6]">
                      {board.shareLink}
                    </span>
                    <Button
                      variant="outline"
                      onClick={copyLink}
                      data-testid="copy-share-link"
                      className="h-10 rounded-[0.9rem] border-white/10 bg-white/4 text-white hover:bg-white/8"
                    >
                      <Copy size={14} />
                      Copiar
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-white/8 pb-3">
            <button
              type="button"
              onClick={() => setTab("members")}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-[0.95rem] border px-4 text-[0.98rem] transition-colors",
                tab === "members"
                  ? "border-white/10 bg-white/6 text-[#8fb1ff]"
                  : "border-transparent text-[#c8d1e3] hover:bg-white/4 hover:text-white",
              )}
            >
              Membros do quadro
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs text-inherit">
                {board.members.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTab("requests")}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-[0.95rem] border px-4 text-[0.98rem] transition-colors",
                tab === "requests"
                  ? "border-white/10 bg-white/6 text-[#8fb1ff]"
                  : "border-transparent text-[#c8d1e3] hover:bg-white/4 hover:text-white",
              )}
            >
              Solicitações para entrar
            </button>
          </div>

          <div className="mt-4 overflow-hidden rounded-[1.2rem] border border-white/8 bg-white/3">
            {(tab === "members" ? board.members : board.joinRequests).map((member) => (
              <div
                key={member.id}
                className="grid gap-3 border-b border-white/8 px-4 py-4 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="bg-[#182131]">
                    <AvatarFallback className="bg-[#2a3550] text-[#eaf0ff]">
                      {member.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-[1rem] text-white">{member.name}</p>
                    <p className="break-words text-sm text-[#99a4bc]">
                      {member.handle}
                      {tab === "members" && member.name.includes("voce")
                        ? " • Administrador da Área de trabalho"
                        : tab === "members"
                          ? " • Convidado da Área de trabalho"
                          : " • Solicitando acesso"}
                    </p>
                  </div>
                </div>
                <PermissionSelect
                  value={member.role}
                  onChange={(nextRole) => {
                    if (tab !== "members") {
                      return;
                    }

                    onUpdateBoard({
                      members: board.members.map((item) =>
                        item.id === member.id ? { ...item, role: nextRole } : item,
                      ),
                    });
                  }}
                  className="h-11 w-full rounded-[0.95rem]"
                />
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
