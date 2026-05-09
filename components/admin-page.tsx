"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Copy,
  LinkSimple,
  PaperPlaneTilt,
  Plus,
  WhatsappLogo,
} from "@phosphor-icons/react";
import { ClientLayout } from "@/components/client-layout";
import { Topbar } from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFlowBoardStore } from "@/components/providers/flowboard-provider";
import { prepareSupabaseWorkspaceInvite } from "@/lib/supabase/access";
import { syncSupabaseBoardRecordContent } from "@/lib/supabase/board-content";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { syncSupabaseWorkspacesFromBoards } from "@/lib/supabase/workspaces";
import { cn } from "@/lib/utils";

const ACCENT_OPTIONS = [
  "from-[#2a2a2a] via-[#181818] to-[#0f0f0f]",
  "from-[#6b3f12] via-[#83501b] to-[#4f2916]",
  "from-[#1d5a40] via-[#194632] to-[#132d22]",
  "from-[#45201f] via-[#251312] to-[#111111]",
];

function slugFromEmail(email: string) {
  return email
    .trim()
    .toLowerCase()
    .split("@")[0]
    .replace(/[^a-z0-9._-]/g, "-");
}

function titleFromEmail(email: string) {
  return slugFromEmail(email)
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildInviteLink(boardId: string, email: string) {
  const params = new URLSearchParams({
    email: email.trim().toLowerCase(),
    board: boardId,
    mode: "register",
  });

  const origin = typeof window === "undefined" ? "https://clientboard.local" : window.location.origin;
  return `${origin}/login?${params.toString()}`;
}

function getInviteFailureMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null
        ? [
            "message" in error && typeof error.message === "string" ? error.message : "",
            "details" in error && typeof error.details === "string" ? error.details : "",
            "hint" in error && typeof error.hint === "string" ? error.hint : "",
            "error_description" in error && typeof error.error_description === "string"
              ? error.error_description
              : "",
            "code" in error && typeof error.code === "string" ? `(${error.code})` : "",
          ]
            .filter(Boolean)
            .join(" ")
        : String(error ?? "");

  if (/Somente administradores/i.test(message)) {
    return "Sua conta ainda nao esta com permissao de admin no Supabase. Entre novamente ou ajuste o perfil admin.";
  }

  if (/Email invalido/i.test(message)) {
    return "Confira o email do convite. O Supabase recusou porque ele parece invalido.";
  }

  if (/Tipo de acesso invalido/i.test(message)) {
    return "Escolha se o convite e para cliente ou colaborador antes de preparar.";
  }

  if (/Supabase nao esta configurado/i.test(message)) {
    return "Supabase nao esta configurado neste ambiente. O convite nao pode ser gravado no backend agora.";
  }

  if (/duplicate key value violates unique constraint/i.test(message)) {
    return "Ja existe um registro antigo para esse email no backend. O convite foi reaproveitado, mas vale revisar o usuario no Supabase se ele foi apagado manualmente.";
  }

  return message || "Nao foi possivel preparar o convite.";
}

function SectionShell({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      data-light-panel="true"
      className={cn(
        "glass-panel rounded-[1.9rem] border border-white/8 bg-[linear-gradient(180deg,#151515_0%,#101010_100%)] p-5 shadow-[0_28px_80px_-46px_rgba(0,0,0,0.95)]",
        className,
      )}
    >
      <div className="mb-5 border-b border-white/6 pb-4">
        <h2 className="text-[1.1rem] font-semibold tracking-[-0.04em] text-white">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-[#92a0b8]">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function WorkspaceCard({
  boardId,
  title,
  accent,
  accessCount,
}: {
  boardId: string;
  title: string;
  accent: string;
  accessCount: number;
}) {
  return (
    <Link
      href={`/boards/${boardId}`}
      data-workspace-card="true"
      className="group relative block min-w-[228px] max-w-[228px] rounded-[1.9rem] border border-white/8 bg-[linear-gradient(180deg,#151515_0%,#101010_100%)] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/14 hover:bg-[#181818]"
    >
      <div className={cn("relative h-28 overflow-hidden rounded-[1.45rem] bg-gradient-to-br", accent)}>
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_58%)]" />
      </div>
      <div className="mt-4">
        <p className="truncate text-[1rem] font-medium tracking-[-0.035em] text-white">{title}</p>
        <p className="mt-2 text-[11px] tracking-[0.24em] text-[#7886a1] uppercase">Workspace ativo</p>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Badge className="rounded-full border-0 bg-white/6 px-2.5 py-1 text-[11px] text-[#dbe4fb]">
          {accessCount} acessos
        </Badge>
        <span className="flex size-9 items-center justify-center rounded-[0.95rem] border border-white/8 bg-white/4 text-[#dbe4fb] transition-transform duration-200 group-hover:translate-x-0.5">
          <ArrowUpRight size={16} />
        </span>
      </div>
    </Link>
  );
}

function AccentPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {ACCENT_OPTIONS.map((accent) => {
        const active = accent === value;
        return (
          <button
            key={accent}
            type="button"
            onClick={() => onChange(accent)}
            className={cn(
              "rounded-[1rem] border p-1 transition-all",
              active ? "border-[#87a8ff]" : "border-white/8 hover:border-white/14",
            )}
          >
            <span className={cn("block h-14 w-full rounded-[0.8rem] bg-gradient-to-r", accent)} />
          </button>
        );
      })}
    </div>
  );
}

export function AdminPage() {
  const {
    boards,
    adminUsers,
    workspaceAccess,
    upsertAdminUser,
    grantWorkspaceAccess,
    createWorkspace,
    duplicateWorkspace,
  } = useFlowBoardStore();

  const [creationMode, setCreationMode] = useState<"blank" | "template">("blank");
  const [workspaceForm, setWorkspaceForm] = useState({
    name: "",
    description: "",
    accent: ACCENT_OPTIONS[0],
  });
  const [templateForm, setTemplateForm] = useState({
    sourceBoardId: "",
    name: "",
    description: "",
  });
  const [inviteForm, setInviteForm] = useState({
    email: "",
    boardId: "",
    kind: "cliente" as "cliente" | "colaborador",
  });
  const [inviteStatus, setInviteStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [preparingInvite, setPreparingInvite] = useState(false);
  const lastWorkspaceSyncSignature = useRef("");

  const boardCards = useMemo(() => {
    return boards.map((board) => ({
      id: board.id,
      title: board.name,
      accent: board.accent || ACCENT_OPTIONS[0],
      accessCount: workspaceAccess.filter((access) => access.boardId === board.id).length,
    }));
  }, [boards, workspaceAccess]);

  useEffect(() => {
    if (!hasSupabaseEnv() || boards.length === 0) {
      return;
    }

    const signature = boards
      .map((board) => `${board.id}:${board.name}:${board.description}:${board.accent}:${board.shareLink ?? ""}`)
      .join("|");

    if (signature === lastWorkspaceSyncSignature.current) {
      return;
    }

    lastWorkspaceSyncSignature.current = signature;
    void (async () => {
      await syncSupabaseWorkspacesFromBoards(boards);
      await Promise.all(boards.map((board) => syncSupabaseBoardRecordContent(board)));
    })().catch((error) => {
      console.warn("Nao foi possivel sincronizar os quadros com o Supabase.", error);
    });
  }, [boards]);

  const invitePreview = useMemo(() => {
    if (!inviteForm.email.trim() || !inviteForm.boardId) {
      return null;
    }

    const email = inviteForm.email.trim().toLowerCase();
    const board = boards.find((item) => item.id === inviteForm.boardId);
    if (!board) {
      return null;
    }

    const existingUser = adminUsers.find((user) => user.email.toLowerCase() === email);
    const name = existingUser?.name || titleFromEmail(email) || "Novo acesso";
    const link = buildInviteLink(board.id, email);
    const message = `Seu acesso ao painel ${board.name} ja esta preparado.\n\nConclua o cadastro aqui: ${link}`;
    const emailHref = `mailto:${email}?subject=${encodeURIComponent(`Acesso ao painel ${board.name}`)}&body=${encodeURIComponent(message)}`;
    const whatsappHref = `https://wa.me/?text=${encodeURIComponent(message)}`;

    return {
      email,
      board,
      name,
      link,
      emailHref,
      whatsappHref,
    };
  }, [adminUsers, boards, inviteForm.boardId, inviteForm.email]);

  const templateSourceBoard = useMemo(
    () => boards.find((board) => board.id === templateForm.sourceBoardId) ?? boards[0] ?? null,
    [boards, templateForm.sourceBoardId],
  );

  const handleCreateWorkspace = () => {
    if (!workspaceForm.name.trim()) {
      return;
    }

    createWorkspace({
      name: workspaceForm.name.trim(),
      description: workspaceForm.description.trim() || "Novo workspace criado pela area administrativa.",
      accent: workspaceForm.accent,
    });

    setWorkspaceForm({
      name: "",
      description: "",
      accent: ACCENT_OPTIONS[0],
    });
  };

  const handleDuplicateWorkspace = () => {
    const sourceBoardId = templateForm.sourceBoardId || boards[0]?.id;
    if (!sourceBoardId || !templateForm.name.trim()) {
      return;
    }

    duplicateWorkspace({
      sourceBoardId,
      name: templateForm.name.trim(),
      description: templateForm.description.trim() || undefined,
    });

    setTemplateForm({
      sourceBoardId,
      name: "",
      description: "",
    });
  };

  const handlePrepareInvite = async () => {
    if (!invitePreview) {
      return;
    }

    setPreparingInvite(true);
    setInviteStatus(null);

    const existingUser = adminUsers.find(
      (user) => user.email.toLowerCase() === invitePreview.email.toLowerCase(),
    );
    const userId = existingUser?.id ?? `admin-invite-${slugFromEmail(invitePreview.email)}`;
    const nextName = existingUser?.name || invitePreview.name;
    const boardRole = inviteForm.kind === "cliente" ? "Observador" : "Membro";
    const panel = inviteForm.kind === "cliente" ? "cliente" : "colaborador";

    try {
      if (hasSupabaseEnv()) {
        await prepareSupabaseWorkspaceInvite({
          board: invitePreview.board,
          email: invitePreview.email,
          kind: inviteForm.kind,
        });
      }

      upsertAdminUser({
        id: userId,
        name: nextName,
        email: invitePreview.email,
        kind: inviteForm.kind,
        status: "pendente",
        company: invitePreview.board.name,
        title: inviteForm.kind === "cliente" ? "Cliente convidado para registro" : "Colaborador convidado para registro",
      });

      grantWorkspaceAccess({
        userId,
        boardId: invitePreview.board.id,
        boardRole,
        panel,
      });

      let emailMessage = "Convite preparado e vinculado ao backend.";
      if (hasSupabaseEnv()) {
        const supabase = getSupabaseBrowserClient();
        const { data: sessionData } = supabase
          ? await supabase.auth.getSession()
          : { data: { session: null } };
        const accessToken = sessionData.session?.access_token;

        if (accessToken) {
          const response = await fetch("/api/invites/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              to: invitePreview.email,
              recipientName: nextName,
              boardName: invitePreview.board.name,
              inviteLink: invitePreview.link,
              accessKind: inviteForm.kind,
            }),
          });
          const result = (await response.json()) as { id?: string | null; error?: string };

          if (!response.ok) {
            emailMessage = `Convite preparado, mas o email real ainda nao saiu: ${result.error ?? "erro desconhecido"}`;
          } else {
            emailMessage = "Convite preparado, vinculado ao backend e enviado por email.";
          }
        } else {
          emailMessage =
            "Convite preparado, mas nao encontrei a sessao Supabase para disparar o email real.";
        }
      }

      setInviteStatus({
        type: "success",
        message: emailMessage,
      });
    } catch (error) {
      setInviteStatus({
        type: "error",
        message: getInviteFailureMessage(error),
      });
    } finally {
      setPreparingInvite(false);
    }
  };

  return (
    <ClientLayout projectName="Controle interno">
      <Topbar
        title="Area admin"
        subtitle="Crie quadros, distribua convites e controle acessos em um fluxo mais limpo."
        compact
      />

      <main className="flowboard-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-full w-full max-w-[1700px] flex-col gap-5">
          <SectionShell
            title="Quadros"
            description="Um mapa rapido dos workspaces para abrir, revisar e administrar sem ruído visual."
          >
            <div className="flowboard-scrollbar -mx-1 overflow-x-auto overflow-y-visible px-1 py-2">
              <div className="flex gap-4">
                {boardCards.map((board) => (
                  <WorkspaceCard
                    key={board.id}
                    boardId={board.id}
                    title={board.title}
                    accent={board.accent}
                    accessCount={board.accessCount}
                  />
                ))}
              </div>
            </div>
          </SectionShell>

          <SectionShell
            title="Criacao de quadro"
            description="Crie um workspace do zero ou duplique o template do quadro atual sem perder o clima visual."
          >
            <div className="mb-5 flex">
              <div className="inline-flex rounded-[1rem] border border-white/10 bg-white/[0.03] p-1">
                <button
                  type="button"
                  onClick={() => setCreationMode("blank")}
                  className={cn(
                    "h-10 rounded-[0.85rem] px-4 text-sm transition-all",
                    creationMode === "blank"
                      ? "bg-[#1f2840] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                      : "text-[#94a0b7] hover:text-white",
                  )}
                >
                  Criar do zero
                </button>
                <button
                  type="button"
                  onClick={() => setCreationMode("template")}
                  className={cn(
                    "h-10 rounded-[0.85rem] px-4 text-sm transition-all",
                    creationMode === "template"
                      ? "bg-[#1f2840] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                      : "text-[#94a0b7] hover:text-white",
                  )}
                >
                  Usar template
                </button>
              </div>
            </div>

            {creationMode === "blank" ? (
              <>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                  <div className="space-y-4">
                    <label className="block space-y-2">
                      <span className="text-sm text-[#c6d0e2]">Nome do quadro</span>
                      <Input
                        value={workspaceForm.name}
                        onChange={(event) =>
                          setWorkspaceForm((current) => ({ ...current, name: event.target.value }))
                        }
                        className="h-11 rounded-[1rem] border-white/10 bg-white/4 text-white"
                        placeholder="Ex.: Portal Astoria"
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="text-sm text-[#c6d0e2]">Resumo rapido</span>
                      <Input
                        value={workspaceForm.description}
                        onChange={(event) =>
                          setWorkspaceForm((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        className="h-11 rounded-[1rem] border-white/10 bg-white/4 text-white"
                        placeholder="Ex.: fluxo de design, entregas e alinhamentos do cliente."
                      />
                    </label>

                    <div className="rounded-[1.2rem] border border-white/8 bg-[#111] p-4">
                      <p className="text-[11px] font-semibold tracking-[0.24em] text-[#7a89a5] uppercase">
                        Previa do quadro
                      </p>
                      <div className="mt-3 flex items-center gap-4">
                        <div
                          className={cn(
                            "h-16 w-16 shrink-0 rounded-[1.05rem] bg-gradient-to-br shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
                            workspaceForm.accent,
                          )}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[1rem] font-medium tracking-[-0.03em] text-white">
                            {workspaceForm.name.trim() || "Novo quadro"}
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#8e9cb4]">
                            {workspaceForm.description.trim() ||
                              "O resumo do workspace aparece aqui antes da criacao."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm text-[#c6d0e2]">Clima visual</p>
                    <AccentPicker
                      value={workspaceForm.accent}
                      onChange={(accent) =>
                        setWorkspaceForm((current) => ({
                          ...current,
                          accent,
                        }))
                      }
                    />
                    <div className="rounded-[1rem] border border-dashed border-white/10 px-4 py-3 text-sm leading-6 text-[#8f9db5]">
                      O quadro ja nasce preparado para receber listas, convites e o dashboard do cliente.
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <Button
                    onClick={handleCreateWorkspace}
                    className="h-11 rounded-[1rem] border border-white/10 bg-[#dc3933] px-5 text-white hover:bg-[#ef5148]"
                  >
                    <Plus size={16} />
                    Criar quadro
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <span className="text-sm text-[#c6d0e2]">Escolher template-base</span>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {boards.map((board) => {
                          const active =
                            (templateForm.sourceBoardId || boards[0]?.id) === board.id;
                          return (
                            <button
                              key={board.id}
                              type="button"
                              onClick={() =>
                                setTemplateForm((current) => ({
                                  ...current,
                                  sourceBoardId: board.id,
                                  name: current.name || `${board.name} (copia)`,
                                  description: current.description || board.description,
                                }))
                              }
                              className={cn(
                                "rounded-[1rem] border px-3 py-3 text-left transition-all",
                                active
                                  ? "border-[#ff6b57]/35 bg-[#211211] text-white"
                                  : "border-white/8 bg-white/3 text-[#aab5cb] hover:bg-white/6 hover:text-white",
                              )}
                            >
                              <p className="truncate text-sm font-medium">{board.name}</p>
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-inherit/70">
                                {board.lists.length} listas e{" "}
                                {board.lists.reduce((sum, list) => sum + list.cards.length, 0)} cards-base
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <label className="block space-y-2">
                      <span className="text-sm text-[#c6d0e2]">Nome do novo quadro</span>
                      <Input
                        value={templateForm.name}
                        onChange={(event) =>
                          setTemplateForm((current) => ({ ...current, name: event.target.value }))
                        }
                        className="h-11 rounded-[1rem] border-white/10 bg-white/4 text-white"
                        placeholder="Ex.: Agencia Vibefor (copia)"
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="text-sm text-[#c6d0e2]">Resumo opcional</span>
                      <Input
                        value={templateForm.description}
                        onChange={(event) =>
                          setTemplateForm((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        className="h-11 rounded-[1rem] border-white/10 bg-white/4 text-white"
                        placeholder="Se quiser, ajuste o texto antes de duplicar."
                      />
                    </label>
                  </div>

                  <div className="rounded-[1.2rem] border border-white/8 bg-[#111] p-4">
                    <p className="text-[11px] font-semibold tracking-[0.24em] text-[#7a89a5] uppercase">
                      Previa do template
                    </p>

                    {templateSourceBoard ? (
                      <>
                        <div className="mt-3 flex items-center gap-4">
                          <div
                            className={cn(
                              "h-16 w-16 shrink-0 rounded-[1.05rem] bg-gradient-to-br shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
                              templateSourceBoard.accent || ACCENT_OPTIONS[0],
                            )}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-[1rem] font-medium tracking-[-0.03em] text-white">
                              {templateForm.name.trim() || `${templateSourceBoard.name} (copia)`}
                            </p>
                            <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#8e9cb4]">
                              {templateForm.description.trim() ||
                                templateSourceBoard.description ||
                                "Esse template replica a estrutura atual do quadro-base."}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Badge className="rounded-full border-0 bg-white/6 px-2.5 py-1 text-[11px] text-[#dbe4fb]">
                            {templateSourceBoard.lists.length} listas
                          </Badge>
                          <Badge className="rounded-full border-0 bg-white/6 px-2.5 py-1 text-[11px] text-[#dbe4fb]">
                            {templateSourceBoard.lists.reduce((sum, list) => sum + list.cards.length, 0)} cards
                          </Badge>
                          <Badge className="rounded-full border-0 bg-white/6 px-2.5 py-1 text-[11px] text-[#dbe4fb]">
                            visual preservado
                          </Badge>
                        </div>

                        <div className="mt-4 rounded-[1rem] border border-dashed border-white/10 px-4 py-3 text-sm leading-6 text-[#8f9db5]">
                          Duplica listas, cards, capas, etiquetas, campos e estrutura visual do quadro-base.
                        </div>
                      </>
                    ) : (
                      <div className="mt-3 rounded-[1rem] border border-dashed border-white/10 px-4 py-8 text-sm leading-6 text-[#8f9db5]">
                        Assim que existir um quadro ativo, ele pode virar template de duplicação aqui.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <Button
                    onClick={handleDuplicateWorkspace}
                    className="h-11 rounded-[1rem] border border-white/10 bg-[#dc3933] px-5 text-white hover:bg-[#ef5148]"
                  >
                    <Copy size={16} />
                    Duplicar template
                  </Button>
                </div>
              </>
            )}
          </SectionShell>

          <SectionShell
            title="Mandar link de registro por email"
            description="Convite curto e direto: email, tipo de acesso, quadro escolhido e link pronto para disparar."
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm text-[#c6d0e2]">Email da pessoa</span>
                  <Input
                    value={inviteForm.email}
                    onChange={(event) =>
                      setInviteForm((current) => ({ ...current, email: event.target.value }))
                    }
                    className="h-11 rounded-[1rem] border-white/10 bg-white/4 text-white"
                    placeholder="contato@cliente.com"
                  />
                </label>

                <div className="space-y-2">
                  <span className="text-sm text-[#c6d0e2]">Tipo de acesso</span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "cliente" as const, label: "Cliente", helper: "Painel do cliente" },
                      { value: "colaborador" as const, label: "Colaborador", helper: "Painel operacional" },
                    ].map((option) => {
                      const active = inviteForm.kind === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            setInviteForm((current) => ({
                              ...current,
                              kind: option.value,
                            }))
                          }
                          className={cn(
                            "rounded-[1rem] border px-3 py-3 text-left transition-all",
                            active
                              ? "border-[#ff6b57]/35 bg-[#211211] text-white"
                              : "border-white/8 bg-white/3 text-[#aab5cb] hover:bg-white/6 hover:text-white",
                          )}
                        >
                          <p className="text-sm font-medium">{option.label}</p>
                          <p className="mt-1 text-xs text-inherit/70">{option.helper}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-sm text-[#c6d0e2]">Vincular ao quadro</span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {boards.map((board) => {
                      const active = inviteForm.boardId === board.id;
                      return (
                        <button
                          key={board.id}
                          type="button"
                          onClick={() =>
                            setInviteForm((current) => ({
                              ...current,
                              boardId: board.id,
                            }))
                          }
                          className={cn(
                            "rounded-[1rem] border px-3 py-3 text-left transition-all",
                            active
                              ? "border-[#ff6b57]/35 bg-[#211211] text-white"
                              : "border-white/8 bg-white/3 text-[#aab5cb] hover:bg-white/6 hover:text-white",
                          )}
                        >
                          <p className="truncate text-sm font-medium">{board.name}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b57]" />
                            <span className="text-xs text-inherit/70">
                              {workspaceAccess.filter((access) => access.boardId === board.id).length} acessos ativos
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-1">
                  <Button
                    onClick={handlePrepareInvite}
                    disabled={preparingInvite}
                    className="h-11 rounded-[1rem] border border-white/10 bg-[#dc3933] px-5 text-white hover:bg-[#ef5148]"
                  >
                    <PaperPlaneTilt size={16} />
                    {preparingInvite ? "Preparando..." : "Preparar convite"}
                  </Button>
                </div>

                {inviteStatus ? (
                  <div
                    className={cn(
                      "rounded-[1rem] border px-4 py-3 text-sm leading-6",
                      inviteStatus.type === "success"
                        ? "border-[#255f47] bg-[#10251d] text-[#c7ffe3]"
                        : "border-[#6e2d38] bg-[#331a22] text-[#ffd3da]",
                    )}
                  >
                    {inviteStatus.message}
                  </div>
                ) : null}
              </div>

              <div className="rounded-[1.5rem] border border-white/8 bg-[#111111] p-4">
                <p className="text-[11px] font-semibold tracking-[0.24em] text-[#7e8ca7] uppercase">
                  Preview do convite
                </p>

                {invitePreview ? (
                  <>
                    <div className="mt-4 rounded-[1.2rem] border border-white/8 bg-white/3 p-4">
                      <p className="text-sm text-[#8fa0ba]">Email</p>
                      <p className="mt-1 text-base font-medium text-white">{invitePreview.email}</p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge className="rounded-full border-0 bg-[#233252] px-2.5 py-1 text-[11px] text-[#dce4fb]">
                          {invitePreview.board.name}
                        </Badge>
                        <Badge className="rounded-full border-0 bg-[#1d3f32] px-2.5 py-1 text-[11px] text-[#d8ffe9]">
                          {inviteForm.kind === "cliente" ? "painel cliente" : "painel colaborador"}
                        </Badge>
                        <Badge className="rounded-full border-0 bg-[#5a4416] px-2.5 py-1 text-[11px] text-[#ffeab4]">
                          registro pendente
                        </Badge>
                      </div>

                      <div className="mt-4 rounded-[1rem] border border-white/8 bg-[#151515] px-3 py-3">
                        <p className="text-xs text-[#8ea0bb]">Link pronto</p>
                        <p className="mt-2 break-all text-sm text-white">{invitePreview.link}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href={invitePreview.whatsappHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-[1rem] border border-white/10 bg-[#173b2a] px-4 text-sm text-[#d6ffe8] transition-colors hover:bg-[#1d4b34]"
                      >
                        <WhatsappLogo size={16} />
                        Mandar por WhatsApp
                      </Link>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(invitePreview.link)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-[1rem] border border-white/10 bg-white/4 px-4 text-sm text-white transition-colors hover:bg-white/8"
                      >
                        <LinkSimple size={16} />
                        Copiar link
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 rounded-[1.2rem] border border-dashed border-white/10 px-4 py-8 text-sm leading-6 text-[#8ea0bb]">
                    Preencha o email e escolha um quadro. O link nasce com o email amarrado ao dashboard certo.
                  </div>
                )}
              </div>
            </div>
          </SectionShell>

          <div className="h-3 shrink-0" aria-hidden="true" />
        </div>
      </main>
    </ClientLayout>
  );
}
