"use client";

import type { RefObject } from "react";
import { Bell, ChatCircleDots, Check, Circle, MagnifyingGlass, Trash } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FloatingPanel } from "@/components/floating-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cleanProfileName } from "@/lib/account-settings";
import { relativeTimestamp } from "@/lib/flowboard-helpers";
import { getNotificationActionLabel } from "@/lib/notifications";
import type { NotificationRecord } from "@/lib/flowboard-types";
import { cn } from "@/lib/utils";

type NotificationTab = "all" | "unread" | "mentions";

export function NotificationsPopover({
  anchorRef,
  open,
  notifications,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  notifications: NotificationRecord[];
  onClose: () => void;
  onMarkRead: (notificationId: string) => void;
  onMarkAllRead: (notificationIds: string[]) => void;
  onClearAll: (notificationIds: string[]) => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<NotificationTab>("unread");
  const [query, setQuery] = useState("");

  const filteredNotifications = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return notifications.filter((notification) => {
      if (tab === "unread" && notification.read) {
        return false;
      }

      if (tab === "mentions" && notification.kind !== "mention") {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        notification.cardTitle,
        notification.boardName,
        cleanProfileName(notification.actor.name),
        notification.excerpt,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [notifications, query, tab]);

  const unreadIds = notifications.filter((notification) => !notification.read).map((notification) => notification.id);

  return (
    <FloatingPanel
      anchorRef={anchorRef}
      open={open}
      align="end"
      placement="auto"
      offset={10}
      estimatedWidth={340}
      estimatedHeight={480}
      className="max-h-[calc(100vh-20px)] w-[min(21rem,calc(100vw-20px))]"
    >
      <div
        data-notifications-popover="true"
        className="flex max-h-[calc(100vh-20px)] min-h-0 flex-col overflow-hidden rounded-[1.2rem] border border-white/10 bg-[#0e0e0e]/98 text-white shadow-[0_20px_70px_-34px_rgba(0,0,0,0.96)]"
      >
        <div className="border-b border-white/8 px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.24em] text-[#727b8f] uppercase">
                Alertas
              </p>
              <h3 className="mt-1 text-[0.98rem] font-semibold tracking-[-0.03em] text-white">
                Sua caixa rápida
              </h3>
              <p className="mt-1 max-w-[28ch] text-[12px] leading-5 text-[#8f98ab]">
                Menções e marcações recentes do seu quadro.
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {notifications.length > 0 ? (
                <button
                  type="button"
                  onClick={() => onClearAll(notifications.map((notification) => notification.id))}
                  className="inline-flex size-8 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] text-[#8f98ab] transition hover:border-white/12 hover:bg-white/[0.08] hover:text-white"
                  aria-label="Limpar notificações"
                  title="Limpar notificações"
                >
                  <Trash size={13} />
                </button>
              ) : null}

              {unreadIds.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onMarkAllRead(unreadIds)}
                  className="h-8 rounded-full border-white/10 bg-white/[0.03] px-3 text-[11px] text-white hover:bg-white/[0.08]"
                >
                  <Check size={14} />
                  Ler
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            {[
              ["unread", "Não lidas"],
              ["all", "Tudo"],
              ["mentions", "Menções"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value as NotificationTab)}
                className={cn(
                  "inline-flex h-8 items-center rounded-full border px-3 text-[12px] transition",
                  tab === value
                    ? "border-white/14 bg-white/[0.08] text-white"
                    : "border-white/0 bg-transparent text-[#9ca5b8] hover:bg-white/[0.05] hover:text-white",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative mt-3">
            <MagnifyingGlass size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7f889c]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por card, pessoa ou conteúdo..."
              className="h-10 rounded-[0.95rem] border-white/10 bg-[#141414] pl-9 text-[13px] text-white placeholder:text-[#737b8e] focus-visible:border-[#dc3933]/45 focus-visible:ring-[#dc3933]/10"
            />
          </div>
        </div>

        <div className="flowboard-scrollbar min-h-0 flex-1 overflow-y-auto px-2.5 py-2.5">
          {filteredNotifications.length === 0 ? (
            <div className="flex min-h-[14rem] flex-col items-center justify-center rounded-[1rem] border border-dashed border-white/10 bg-white/[0.02] px-5 text-center">
              <span className="grid size-12 place-items-center rounded-full border border-white/8 bg-white/[0.04] text-[#8f98ab]">
                <Bell size={22} />
              </span>
              <p className="mt-3 text-[15px] font-medium text-white">Nada por aqui</p>
              <p className="mt-1 max-w-[24ch] text-[12px] leading-5 text-[#8f98ab]">
                Quando alguém marcar você ou mencionar algo importante, o alerta aparece aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredNotifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => {
                    onMarkRead(notification.id);
                    onClose();
                    router.push(`/boards/${notification.boardId}`);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-[1rem] border px-3 py-2.5 text-left transition",
                    notification.read
                      ? "border-white/8 bg-white/[0.025] hover:bg-white/[0.05]"
                      : "border-[#dc3933]/22 bg-[#dc3933]/[0.08] hover:bg-[#dc3933]/[0.12]",
                  )}
                >
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-[#171717] text-[13px] text-[#f2f5fb]">
                    {notification.actor.initials}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[13px] font-semibold text-white">
                        {cleanProfileName(notification.actor.name)}
                      </span>
                      {!notification.read ? (
                        <Circle size={7} weight="fill" className="shrink-0 text-[#ff695f]" />
                      ) : null}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[13px] leading-5 text-[#d2d8e8]">
                      {getNotificationActionLabel(notification)}{" "}
                      <span className="font-medium text-white">{notification.cardTitle}</span>
                    </span>
                    <span className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#7f889c]">
                      <ChatCircleDots size={12} />
                      {notification.boardName}
                      <span className="text-[#5f6677]">•</span>
                      {relativeTimestamp(notification.createdAt)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-white/8 px-3.5 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onClose();
              router.push("/notificacoes");
            }}
            className="h-9 w-full rounded-[0.95rem] border-white/10 bg-white/[0.03] text-[12px] text-white hover:bg-white/[0.08]"
          >
            Abrir central completa
          </Button>
        </div>
      </div>
    </FloatingPanel>
  );
}
