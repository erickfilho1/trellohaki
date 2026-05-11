"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowSquareOut,
  ClockCounterClockwise,
  Kanban,
  ShieldCheck,
  Trash,
  UserMinus,
} from "@phosphor-icons/react";
import { ClientLayout } from "@/components/client-layout";
import { Topbar } from "@/components/topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useFlowBoardStore } from "@/components/providers/flowboard-provider";
import type { AdminActivity, WorkspaceAccess } from "@/types/board";
import { cn } from "@/lib/utils";

const CLOSED_LIST_PATTERNS = [
  "concluido",
  "concluído",
  "entregue",
  "entregas",
  "arquivado",
];

function formatDate(value?: string) {
  if (!value) {
    return "Sem data";
  }

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "Sem data";
  }
}

function isClosedList(title: string) {
  const normalized = title.toLowerCase();
  return CLOSED_LIST_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function normalizeIdentityKey(value: string) {
  return value.trim().toLowerCase();
}

function isPlaceholderWorkspaceUser(email: string) {
  return normalizeIdentityKey(email).endsWith("@clientboard.local");
}

function getBoardPeopleCount(
  boardId: string,
  workspaceAccess: WorkspaceAccess[],
  adminUsers: Array<{
    id: string;
    email: string;
    kind: string;
  }>,
) {
  const deduped = new Set<string>();

  workspaceAccess
    .filter((access) => access.boardId === boardId)
    .forEach((access) => {
      const user = adminUsers.find((item) => item.id === access.userId);
      if (!user) {
        return;
      }

      const isCurrentAdmin = normalizeIdentityKey(user.email) === "erickfilho281@gmail.com";
      if (!isCurrentAdmin && (user.kind === "admin" || isPlaceholderWorkspaceUser(user.email))) {
        return;
      }

      deduped.add(normalizeIdentityKey(user.email || user.id));
    });

  return deduped.size;
}

function StatRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/6 py-3 last:border-b-0 last:pb-0 first:pt-0">
      <span className="text-sm text-[#8d9ab2]">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}

function SectionShell({
  title,
  copy,
  children,
  className,
}: {
  title: string;
  copy?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      data-light-panel="true"
      className={cn(
        "glass-panel rounded-[1.8rem] border border-white/8 bg-[linear-gradient(180deg,#151515_0%,#101010_100%)] p-5 shadow-[0_28px_80px_-46px_rgba(0,0,0,0.95)] sm:p-6",
        className,
      )}
    >
      <div className="mb-5">
        <h2 className="text-[1.06rem] font-semibold tracking-[-0.045em] text-white">{title}</h2>
        {copy ? <p className="mt-1 text-sm leading-6 text-[#8d9ab2]">{copy}</p> : null}
      </div>
      {children}
    </section>
  );
}

function EmptyBlock({
  title,
  copy,
}: {
  title: string;
  copy: string;
}) {
  return (
    <div className="rounded-[1.3rem] border border-dashed border-white/10 px-4 py-8 text-center">
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-[42ch] text-sm leading-6 text-[#8c99b2]">{copy}</p>
    </div>
  );
}

export function AdminManagementPage() {
  const {
    boards,
    adminUsers,
    workspaceAccess,
    adminActivity,
    revokeWorkspaceAccess,
    deleteWorkspace,
    getBoardStats,
  } = useFlowBoardStore();

  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(boards[0]?.id ?? null);

  const selectedBoard = useMemo(
    () => boards.find((board) => board.id === selectedBoardId) ?? boards[0] ?? null,
    [boards, selectedBoardId],
  );

  const selectedBoardAccess = useMemo(() => {
    if (!selectedBoard) {
      return [];
    }

    return workspaceAccess.filter((access) => access.boardId === selectedBoard.id);
  }, [selectedBoard, workspaceAccess]);

  const selectedBoardUsers = useMemo(() => {
    const deduped = new Map<string, { access: WorkspaceAccess; user: (typeof adminUsers)[number] }>();

    selectedBoardAccess
      .map((access) => {
        const user = adminUsers.find((item) => item.id === access.userId);
        if (!user) {
          return null;
        }

        return {
          access,
          user,
        };
      })
      .filter(Boolean)
      .forEach((entry) => {
        if (!entry) {
          return;
        }

        const isCurrentAdmin = normalizeIdentityKey(entry.user.email) === "erickfilho281@gmail.com";
        if (!isCurrentAdmin && (entry.user.kind === "admin" || isPlaceholderWorkspaceUser(entry.user.email))) {
          return;
        }

        const key = normalizeIdentityKey(entry.user.email || entry.user.id);
        if (!deduped.has(key)) {
          deduped.set(key, entry);
        }
      });

    return Array.from(deduped.values()) as Array<{ access: WorkspaceAccess; user: (typeof adminUsers)[number] }>;
  }, [adminUsers, selectedBoardAccess]);

  const activeCards = useMemo(() => {
    if (!selectedBoard) {
      return [];
    }

    return selectedBoard.lists
      .filter((list) => !isClosedList(list.title))
      .flatMap((list) =>
        list.cards.map((card) => ({
          id: card.id,
          title: card.title,
          dueDate: card.dates.dueDate,
          listTitle: list.title,
          completed: Boolean(card.completed),
          memberCount: card.members.length,
          labelCount: card.labels.length,
        })),
      )
      .filter((card) => !card.completed);
  }, [selectedBoard]);

  const selectedBoardActivity = useMemo(() => {
    if (!selectedBoard) {
      return [];
    }

    return adminActivity.filter((entry) => entry.boardId === selectedBoard.id).slice(0, 8);
  }, [adminActivity, selectedBoard]);

  const boardStats = useMemo(() => {
    if (!selectedBoard) {
      return null;
    }

    return getBoardStats(selectedBoard.id);
  }, [getBoardStats, selectedBoard]);

  const panelMix = useMemo(() => {
    return selectedBoardUsers.reduce(
      (acc, entry) => {
        acc[entry.access.panel] += 1;
        return acc;
      },
      {
        admin: 0,
        cliente: 0,
        colaborador: 0,
      },
    );
  }, [selectedBoardUsers]);

  const clientFacingUsers = selectedBoardUsers.filter((entry) => entry.user.kind !== "admin");

  const handleDeleteBoard = () => {
    if (!selectedBoard) {
      return;
    }

    const confirmed = window.confirm(
      `Excluir o quadro ${selectedBoard.name}? Essa ação remove listas, cards, acessos e histórico local desse workspace.`,
    );

    if (!confirmed) {
      return;
    }

    deleteWorkspace(selectedBoard.id);
  };

  return (
    <ClientLayout projectName="Controle interno">
      <Topbar
        title="Gerenciamento"
        subtitle="Selecione um quadro para revisar pessoas, andamento, acessos e ações administrativas sem abrir o board."
        compact
      />

      <main
        data-light-main="true"
        data-admin-management="true"
        className="flowboard-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-20 sm:px-6 lg:px-8"
      >
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
          <SectionShell
            title="Quadros em gerenciamento"
            copy="Clique em um quadro para inspecionar pessoas, cards ativos, últimos eventos e ações críticas."
          >
            {boards.length ? (
              <div className="flowboard-scrollbar -mx-1 overflow-x-auto overflow-y-visible px-1 py-2">
                <div className="flex gap-3">
                  {boards.map((board) => {
                    const active = board.id === selectedBoardId;
                    const stats = getBoardStats(board.id);
                    return (
                      <button
                        key={board.id}
                        type="button"
                        onClick={() => setSelectedBoardId(board.id)}
                        className={cn(
                          "group min-w-[230px] max-w-[230px] rounded-[1.6rem] border p-4 text-left transition-all duration-200",
                          active
                            ? "border-[#ff6b57]/35 bg-[#211211]"
                            : "border-white/8 bg-white/[0.025] hover:border-white/14 hover:bg-white/[0.05]",
                        )}
                      >
                        <div
                          className={cn(
                            "h-24 rounded-[1.2rem] bg-gradient-to-br",
                            board.accent || "from-[#244d64] via-[#25334f] to-[#302440]",
                          )}
                        />
                        <div className="mt-4">
                          <p className="truncate text-[1rem] font-medium tracking-[-0.04em] text-white">
                            {board.name}
                          </p>
                          <p className="mt-1 text-sm text-[#8d9ab2]">{stats.totalCards} cards no fluxo</p>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <Badge className="rounded-full border-0 bg-white/6 px-2.5 py-1 text-[11px] text-[#e3ebff]">
                            {getBoardPeopleCount(board.id, workspaceAccess, adminUsers)} pessoas
                          </Badge>
                          <span className="text-xs text-[#8190ab]">{formatDate(board.updatedAt)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <EmptyBlock
                title="Nenhum quadro criado ainda"
                copy="Crie um workspace na área admin para começar a usar o gerenciamento interno."
              />
            )}
          </SectionShell>

          {selectedBoard ? (
            <>
              <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_360px]">
                <SectionShell
                  title="Visão geral do quadro"
                  copy="Uma leitura rápida do workspace sem precisar entrar no dashboard do cliente."
                >
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-5">
                      <div className="rounded-[1.55rem] border border-white/8 bg-[#111111] p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7d8cab]">
                              Quadro selecionado
                            </p>
                            <h3 className="mt-2 text-[1.5rem] font-semibold tracking-[-0.055em] text-white">
                              {selectedBoard.name}
                            </h3>
                            <p className="mt-2 max-w-[58ch] text-sm leading-6 text-[#92a1ba]">
                              {selectedBoard.description || "Esse quadro ainda nao recebeu um resumo administrativo."}
                            </p>
                          </div>

                          <div
                            className={cn(
                              "h-16 w-16 shrink-0 rounded-[1.15rem] bg-gradient-to-br shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
                              selectedBoard.accent || "from-[#244d64] via-[#25334f] to-[#302440]",
                            )}
                          />
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                          <Link
                            href={`/boards/${selectedBoard.id}`}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-[1rem] border border-white/10 bg-[#dc3933] px-4 text-sm text-white transition-colors hover:bg-[#ef5148]"
                          >
                            <ArrowSquareOut size={16} />
                            Abrir quadro
                          </Link>

                          <Button
                            variant="outline"
                            onClick={handleDeleteBoard}
                            className="h-11 rounded-[1rem] border border-[#6c3340] bg-[#2b161d] px-4 text-[#ffd4da] hover:bg-[#341a22] hover:text-white"
                          >
                            <Trash size={16} />
                            Excluir quadro
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-[1.55rem] border border-white/8 bg-[#111111] p-5">
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-[0.95rem] border border-white/10 bg-white/[0.04] text-white">
                            <Kanban size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">Projetos em andamento</p>
                            <p className="text-sm text-[#8d9ab2]">
                              Cards vivos fora das listas de conclusão.
                            </p>
                          </div>
                        </div>

                        {activeCards.length ? (
                          <div className="space-y-3">
                            {activeCards.slice(0, 6).map((card) => (
                              <div
                                key={card.id}
                                className="rounded-[1.15rem] border border-white/8 bg-white/[0.03] px-4 py-3"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-white">{card.title}</p>
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#8d9ab2]">
                                      <span>{card.listTitle}</span>
                                      <span className="h-1 w-1 rounded-full bg-white/20" />
                                      <span>{card.memberCount} responsaveis</span>
                                      <span className="h-1 w-1 rounded-full bg-white/20" />
                                      <span>{card.labelCount} etiquetas</span>
                                    </div>
                                  </div>

                                  <Badge className="rounded-full border-0 bg-[#1f2d1f] px-2.5 py-1 text-[11px] text-[#d7ffe7]">
                                    {formatDate(card.dueDate)}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <EmptyBlock
                            title="Nenhum card ativo no momento"
                            copy="Quando os fluxos estiverem rodando, os cards em andamento aparecem aqui para leitura rápida."
                          />
                        )}
                      </div>
                    </div>

                    <div className="rounded-[1.55rem] border border-white/8 bg-[#111111] p-5">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-[0.95rem] border border-white/10 bg-white/[0.04] text-white">
                          <ShieldCheck size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">Leitura operacional</p>
                          <p className="text-sm text-[#8d9ab2]">O que esse quadro concentra hoje.</p>
                        </div>
                      </div>

                      {boardStats ? (
                        <div>
                          <StatRow label="Cards no fluxo" value={String(boardStats.totalCards)} />
                          <StatRow label="Checklist pendente" value={String(boardStats.totalChecklistItems)} />
                          <StatRow label="Pessoas vinculadas" value={String(clientFacingUsers.length)} />
                          <StatRow label="Cliente neste quadro" value={panelMix.cliente ? "Sim" : "Nao"} />
                          <StatRow label="Colaboradores ativos" value={String(panelMix.colaborador)} />
                          <StatRow label="Ultima atualizacao" value={formatDate(selectedBoard.updatedAt)} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </SectionShell>

                <SectionShell
                  title="Painéis e perfis"
                  copy="Qual tipo de acesso entra nesse workspace e para qual dashboard ele segue."
                >
                  <div className="space-y-3">
                    {[
                      {
                        label: "Admin",
                        value: panelMix.admin,
                        tone: "bg-[#2a1a18] text-[#ffd8d2]",
                      },
                      {
                        label: "Cliente",
                        value: panelMix.cliente,
                        tone: "bg-[#1f3b2f] text-[#ddffea]",
                      },
                      {
                        label: "Colaborador",
                        value: panelMix.colaborador,
                        tone: "bg-[#4e3918] text-[#ffe8b2]",
                      },
                    ].map((entry) => (
                      <div
                        key={entry.label}
                        className="flex items-center justify-between rounded-[1.15rem] border border-white/8 bg-white/[0.03] px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">{entry.label}</p>
                          <p className="mt-1 text-xs text-[#8d9ab2]">
                            {entry.label === "Cliente"
                              ? "Entra no dashboard do cliente."
                              : entry.label === "Colaborador"
                                ? "Entra no painel operacional."
                                : "Mantem controle total do workspace."}
                          </p>
                        </div>
                        <Badge className={cn("rounded-full border-0 px-2.5 py-1 text-[11px]", entry.tone)}>
                          {entry.value}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </SectionShell>
              </section>

              <section className="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
                <SectionShell
                  title="Pessoas vinculadas ao quadro"
                  copy="Remova acessos sem sair do painel e veja rapidamente quem responde por esse workspace."
                >
                  {selectedBoardUsers.length ? (
                    <div className="space-y-3">
                      {selectedBoardUsers.map(({ access, user }) => (
                        <div
                          key={access.id}
                          className="flex flex-wrap items-center justify-between gap-4 rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar className="bg-[#182033] ring-1 ring-white/10" size="default">
                              <AvatarFallback className="bg-[#2f3c5d] text-[#eef2ff]">
                                {user.name
                                  .split(" ")
                                  .slice(0, 2)
                                  .map((part) => part[0]?.toUpperCase() ?? "")
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-white">{user.name}</p>
                              <p className="truncate text-sm text-[#8d9ab2]">{user.email}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="rounded-full border-0 bg-white/6 px-2.5 py-1 text-[11px] text-[#e3ebff]">
                              {access.boardRole}
                            </Badge>
                            <Badge
                              className={cn(
                                "rounded-full border-0 px-2.5 py-1 text-[11px]",
                                access.panel === "cliente"
                                  ? "bg-[#1f3b2f] text-[#ddffea]"
                                  : access.panel === "colaborador"
                                    ? "bg-[#4e3918] text-[#ffe8b2]"
                                    : "bg-[#2a1a18] text-[#ffd8d2]",
                              )}
                            >
                              painel {access.panel}
                            </Badge>

                            {user.kind !== "admin" ? (
                              <Button
                                variant="outline"
                                onClick={() => revokeWorkspaceAccess(access.id)}
                                className="h-10 rounded-[0.95rem] border border-white/10 bg-white/[0.02] px-3 text-white hover:bg-white/[0.07]"
                              >
                                <UserMinus size={15} />
                                Tirar do quadro
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyBlock
                      title="Nenhuma pessoa vinculada"
                      copy="Convide clientes ou colaboradores na área admin para começar a distribuir acessos."
                    />
                  )}
                </SectionShell>

                <SectionShell
                  title="Ultimos acontecimentos"
                  copy="Um rastro administrativo do que foi feito nesse quadro recentemente."
                >
                  {selectedBoardActivity.length ? (
                    <div className="space-y-3">
                      {selectedBoardActivity.map((entry: AdminActivity) => (
                        <div
                          key={entry.id}
                          className="rounded-[1.15rem] border border-white/8 bg-white/[0.03] px-4 py-3"
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[0.9rem] border border-white/10 bg-white/[0.04] text-white">
                              <ClockCounterClockwise size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm leading-6 text-white">{entry.message}</p>
                              <p className="mt-1 text-xs text-[#8d9ab2]">{formatDate(entry.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyBlock
                      title="Sem eventos administrativos"
                      copy="Conforme voce conceder acessos, remover pessoas ou alterar workspaces, os eventos aparecem aqui."
                    />
                  )}
                </SectionShell>
              </section>
            </>
          ) : (
            <SectionShell
              title="Gerenciamento vazio"
              copy="Assim que houver um quadro, voce consegue selecionar um workspace e abrir a camada administrativa dele aqui."
            >
              <EmptyBlock
                title="Sem quadro selecionado"
                copy="Crie ou mantenha ao menos um workspace ativo para usar essa central de gerenciamento."
              />
            </SectionShell>
          )}
        </div>
      </main>
    </ClientLayout>
  );
}
