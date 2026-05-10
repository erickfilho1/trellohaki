"use client";

import type { RefObject } from "react";
import { Bell, ChatCircleDots, Check, Circle, MagnifyingGlass } from "@phosphor-icons/react";
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
}: {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  notifications: NotificationRecord[];
  onClose: () => void;
  onMarkRead: (notificationId: string) => void;
  onMarkAllRead: (notificationIds: string[]) => void;
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
      offset={12}
      estimatedWidth={430}
      estimatedHeight={560}
      className="max-h-[calc(100vh-24px)] w-[min(27rem,calc(100vw-24px))]"
    >
      <div
        data-notifications-popover="true"
        className="flex max-h-[calc(100vh-24px)] min-h-0 flex-col overflow-hidden rounded-[1.45rem] border border-white/10 bg-[#0d0d0d] text-white shadow-[0_28px_90px_-34px_rgba(0,0,0,0.98)]"
      >
        <div className="border-b border-white/8 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.22em] text-[#8f98ab] uppercase">
                Central de alertas
              </p>
              <h3 className="mt-1 text-[1.05rem] font-semibold tracking-[-0.03em] text-white">
                Notificacoes do quadro
              </h3>
              <p className="mt-1 text-sm leading-6 text-[#8f98ab]">
                Mencoes, marcacoes em cards e movimentacoes que merecem sua atencao.
              </p>
            </div>

            {unreadIds.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => onMarkAllRead(unreadIds)}
                className="h-9 rounded-[0.9rem] border-white/10 bg-white/[0.03] px-3 text-xs text-white hover:bg-white/[0.08]"
              >
                <Check size={14} />
                Ler tudo
              </Button>
            ) : null}
          </div>

          <div className="mt-4 flex items-center gap-2">
            {[
              ["unread", "Nao lidas"],
              ["all", "Tudo"],
              ["mentions", "Mencoes"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value as NotificationTab)}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-3 text-sm transition",
                  tab === value
                    ? "border-white/14 bg-white/[0.08] text-white"
                    : "border-white/0 bg-transparent text-[#9ca5b8] hover:bg-white/[0.05] hover:text-white",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative mt-4">
            <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7f889c]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por card, pessoa ou conteudo..."
              className="h-11 rounded-[1rem] border-white/10 bg-[#141414] pl-10 text-white placeholder:text-[#737b8e] focus-visible:border-[#dc3933]/45 focus-visible:ring-[#dc3933]/10"
            />
          </div>
        </div>

        <div className="flowboard-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {filteredNotifications.length === 0 ? (
            <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-white/10 bg-white/[0.02] px-6 text-center">
              <span className="grid size-14 place-items-center rounded-full border border-white/8 bg-white/[0.04] text-[#8f98ab]">
                <Bell size={24} />
              </span>
              <p className="mt-4 text-base font-medium text-white">Tudo em ordem por aqui</p>
              <p className="mt-2 max-w-[26ch] text-sm leading-6 text-[#8f98ab]">
                Quando alguem marcar voce ou mencionar algo importante, o alerta aparece aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
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
                    "flex w-full items-start gap-3 rounded-[1.15rem] border px-3.5 py-3 text-left transition",
                    notification.read
                      ? "border-white/8 bg-white/[0.025] hover:bg-white/[0.05]"
                      : "border-[#dc3933]/22 bg-[#dc3933]/[0.08] hover:bg-[#dc3933]/[0.12]",
                  )}
                >
                  <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full border border-white/10 bg-[#171717] text-[#f2f5fb]">
                    {notification.actor.initials}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-white">
                        {cleanProfileName(notification.actor.name)}
                      </span>
                      {!notification.read ? (
                        <Circle size={8} weight="fill" className="shrink-0 text-[#ff695f]" />
                      ) : null}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-[#d2d8e8]">
                      {getNotificationActionLabel(notification)}{" "}
                      <span className="font-medium text-white">{notification.cardTitle}</span>
                    </span>
                    <span className="mt-2 line-clamp-2 block text-sm leading-6 text-[#8f98ab]">
                      {notification.excerpt}
                    </span>
                    <span className="mt-2 flex items-center gap-2 text-xs text-[#7f889c]">
                      <ChatCircleDots size={14} />
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

        <div className="border-t border-white/8 px-4 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onClose();
              router.push("/notificacoes");
            }}
            className="h-10 w-full rounded-[0.95rem] border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08]"
          >
            Abrir central completa
          </Button>
        </div>
      </div>
    </FloatingPanel>
  );
}
