"use client";

import { useMemo, useState } from "react";
import { Bell, BellSimpleRinging, CheckCircle, MagnifyingGlass } from "@phosphor-icons/react";
import { ClientLayout } from "@/components/client-layout";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFlowBoardStore } from "@/components/providers/flowboard-provider";
import { cleanProfileName } from "@/lib/account-settings";
import { relativeTimestamp } from "@/lib/flowboard-helpers";
import { filterNotificationsForViewer, getNotificationActionLabel } from "@/lib/notifications";
import { cn } from "@/lib/utils";

type NotificationFilter = "all" | "unread" | "mentions";

export function NotificationsPage() {
  const { user } = useAuth();
  const { boards, notifications, workspaceAccess, markNotificationRead, markNotificationsRead } =
    useFlowBoardStore();
  const [filter, setFilter] = useState<NotificationFilter>("unread");
  const [query, setQuery] = useState("");

  const projectName = useMemo(() => {
    if (user.panel === "admin") {
      return boards[0]?.name ?? "Painel Haki";
    }

    const allowedBoardIds = new Set(
      workspaceAccess
        .filter((access) => access.userId === user.id)
        .map((access) => access.boardId),
    );

    return boards.find((board) => allowedBoardIds.has(board.id))?.name ?? "Painel Haki";
  }, [boards, user.id, user.panel, workspaceAccess]);

  const viewerNotifications = useMemo(
    () => filterNotificationsForViewer(notifications, { name: user.name, email: user.email }),
    [notifications, user.email, user.name],
  );

  const filteredNotifications = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return viewerNotifications.filter((notification) => {
      if (filter === "unread" && notification.read) {
        return false;
      }

      if (filter === "mentions" && notification.kind !== "mention") {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        notification.cardTitle,
        notification.boardName,
        cleanProfileName(notification.actor.name),
        notification.excerpt,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [filter, query, viewerNotifications]);

  const unreadIds = viewerNotifications
    .filter((notification) => !notification.read)
    .map((notification) => notification.id);

  return (
    <ClientLayout projectName={projectName}>
      <main className="flowboard-scrollbar min-h-0 flex-1 overflow-y-auto bg-[#0b0b0b] text-white">
        <div className="mx-auto flex w-full max-w-[1540px] flex-col gap-8 px-5 py-8 sm:px-7 lg:px-9">
          <header className="rounded-[1.9rem] border border-white/8 bg-[linear-gradient(180deg,#111111_0%,#0d0d0d_100%)] px-6 py-6 shadow-[0_28px_90px_-58px_rgba(0,0,0,0.96)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.24em] text-[#8f98ab] uppercase">
                  Central pessoal
                </p>
                <h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-white">
                  Notificacoes
                </h1>
                <p className="mt-3 max-w-[70ch] text-sm leading-7 text-[#96a0b4]">
                  Acompanhe mencoes, marcacoes em cards e toques importantes sem perder o ritmo do quadro.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {unreadIds.length > 0 ? (
                  <Button
                    type="button"
                    onClick={() => markNotificationsRead(unreadIds)}
                    className="h-10 rounded-[0.95rem] bg-[#dc3933] px-4 text-white hover:bg-[#ef5148]"
                  >
                    <CheckCircle size={16} />
                    Marcar tudo como lido
                  </Button>
                ) : null}
              </div>
            </div>
          </header>

          <section className="rounded-[1.8rem] border border-white/8 bg-[#101010] p-4 shadow-[0_28px_90px_-58px_rgba(0,0,0,0.96)] sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  ["unread", "Nao lidas"],
                  ["all", "Tudo"],
                  ["mentions", "Mencoes"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value as NotificationFilter)}
                    className={cn(
                      "inline-flex h-10 items-center rounded-full border px-4 text-sm transition",
                      filter === value
                        ? "border-white/14 bg-white/[0.08] text-white"
                        : "border-white/8 bg-white/[0.03] text-[#9ca5b8] hover:bg-white/[0.06] hover:text-white",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="relative w-full max-w-md">
                <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7f889c]" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por card, pessoa ou conteudo..."
                  className="h-11 rounded-[1rem] border-white/10 bg-[#141414] pl-10 text-white placeholder:text-[#737b8e] focus-visible:border-[#dc3933]/45 focus-visible:ring-[#dc3933]/10"
                />
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="space-y-3">
                {filteredNotifications.length === 0 ? (
                  <div className="grid min-h-[24rem] place-items-center rounded-[1.45rem] border border-dashed border-white/10 bg-[#0d0d0d] p-8 text-center">
                    <div>
                      <span className="mx-auto grid size-16 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-[#8f98ab]">
                        <Bell size={28} />
                      </span>
                      <p className="mt-5 text-lg font-medium text-white">Nenhum alerta no momento</p>
                      <p className="mt-2 max-w-[28ch] text-sm leading-7 text-[#8f98ab]">
                        Assim que alguem marcar voce ou usar uma mencao, a conversa aparece aqui.
                      </p>
                    </div>
                  </div>
                ) : (
                  filteredNotifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => markNotificationRead(notification.id)}
                      className={cn(
                        "flex w-full items-start gap-4 rounded-[1.3rem] border px-4 py-4 text-left transition",
                        notification.read
                          ? "border-white/8 bg-white/[0.025] hover:bg-white/[0.05]"
                          : "border-[#dc3933]/25 bg-[#dc3933]/[0.08] hover:bg-[#dc3933]/[0.12]",
                      )}
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-full border border-white/10 bg-[#171717] text-sm font-semibold text-white">
                        {notification.actor.initials}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-white">
                            {cleanProfileName(notification.actor.name)}
                          </span>
                          {!notification.read ? (
                            <BellSimpleRinging size={14} className="shrink-0 text-[#ff6b57]" />
                          ) : null}
                        </span>
                        <span className="mt-1 block text-sm leading-6 text-[#d2d8e8]">
                          {getNotificationActionLabel(notification)}{" "}
                          <span className="font-medium text-white">{notification.cardTitle}</span>
                        </span>
                        <span className="mt-2 block text-sm leading-6 text-[#8f98ab]">{notification.excerpt}</span>
                        <span className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#7f889c]">
                          <span>{notification.boardName}</span>
                          <span className="text-[#5f6677]">•</span>
                          <span>{relativeTimestamp(notification.createdAt)}</span>
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>

              <aside className="rounded-[1.45rem] border border-white/8 bg-[#0d0d0d] p-5">
                <p className="text-[11px] font-semibold tracking-[0.24em] text-[#8f98ab] uppercase">
                  Leitura rapida
                </p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-[1rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                    <p className="text-sm text-[#96a0b4]">Nao lidas</p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                      {unreadIds.length}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                    <p className="text-sm text-[#96a0b4]">Alertas totais</p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                      {viewerNotifications.length}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                    <p className="text-sm text-[#96a0b4]">Quadros ativos</p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                      {new Set(viewerNotifications.map((notification) => notification.boardId)).size}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-[1.1rem] border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm leading-7 text-[#8f98ab]">
                  Use <span className="font-medium text-white">@nome</span> nos comentarios dos cards para avisar a pessoa certa, ou marque a pessoa no card para puxar esse alerta para a central.
                </div>
              </aside>
            </div>
          </section>
        </div>
      </main>
    </ClientLayout>
  );
}
