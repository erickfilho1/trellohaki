"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CaretDown,
  CaretRight,
  FadersHorizontal,
  GearSix,
  Kanban,
  Lightning,
  Moon,
  Package,
  ShieldCheck,
  SignOut,
  Sun,
} from "@phosphor-icons/react";
import { NotificationsPopover } from "@/components/notifications-popover";
import { useAuth } from "@/components/providers/auth-provider";
import { useFlowBoardStore } from "@/components/providers/flowboard-provider";
import { SidebarToggleButton } from "@/components/sidebar-toggle-button";
import { filterNotificationsForViewer } from "@/lib/notifications";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const menuItems = [
  { href: "/", label: "Quadro", icon: Kanban },
  { href: "/notificacoes", label: "Notificacoes", icon: Bell },
  { href: "/projetos-entregues", label: "Projetos entregues", icon: Package },
  { href: "/configuracoes", label: "Configuracoes", icon: FadersHorizontal },
];

const THEME_STORAGE_KEY = "painel-haki-theme";

type HakiTheme = "dark" | "light";

function readStoredTheme(): HakiTheme {
  if (typeof window === "undefined") {
    return "dark";
  }

  return window.localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
}

function applyTheme(theme: HakiTheme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.hakiTheme = theme;
  document.documentElement.style.colorScheme = theme === "light" ? "light" : "dark";
}

export function Sidebar({
  collapsed,
  onToggle,
  projectName,
}: {
  collapsed: boolean;
  onToggle: () => void;
  projectName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const { notifications, markNotificationRead, markNotificationsRead } = useFlowBoardStore();
  const [adminOpen, setAdminOpen] = useState(pathname.startsWith("/admin"));
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [theme, setTheme] = useState<HakiTheme>(readStoredTheme);
  const canUseAdminArea = hasPermission(user.panel, "manage-admin-area");
  const showAdminChildren = !collapsed && (adminOpen || pathname.startsWith("/admin"));
  const userNotifications = useMemo(
    () => filterNotificationsForViewer(notifications, { name: user.name, email: user.email }),
    [notifications, user.email, user.name],
  );

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return (
    <aside
      data-testid="client-sidebar"
      className={cn(
        "relative flex h-full min-h-0 flex-col border-r border-white/8 bg-[linear-gradient(180deg,#0d0d0d_0%,#080808_100%)] px-3 py-4 transition-[width] duration-300",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <SidebarToggleButton collapsed={collapsed} onToggle={onToggle} />

      <div
        className={cn(
          "flex items-center rounded-[1.25rem] border border-white/8 bg-white/4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300",
          collapsed ? "justify-center border-transparent bg-transparent px-0 py-2 shadow-none" : "gap-3 px-3 py-3",
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center justify-center text-[#ff6b57] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
            collapsed
              ? "size-10 rounded-full border border-white/10 bg-[#151515]"
              : "size-10 rounded-[0.95rem] border border-white/10 bg-[#151515]",
          )}
        >
          <Lightning size={18} weight="fill" />
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold tracking-[-0.03em] text-white">
              Painel Haki
            </p>
            <p className="truncate text-xs text-[#8e97ac]">{projectName}</p>
          </div>
        ) : null}
      </div>

      <nav className="mt-6 flex flex-col gap-1.5">
        {canUseAdminArea ? (
          <div className="space-y-1.5">
            <div
              data-admin-group="true"
              data-active={pathname.startsWith("/admin") ? "true" : undefined}
              className={cn(
                "rounded-[1rem] border transition-all duration-300",
                collapsed
                  ? "border-white/0 bg-transparent"
                  : pathname.startsWith("/admin")
                    ? "border-white/12 bg-[#141414]"
                    : "border-white/0 bg-transparent",
              )}
            >
              <div
                className={cn(
                  "flex items-center",
                  collapsed ? "justify-center px-0 py-1.5" : "gap-2 px-2 py-1.5",
                )}
              >
                <Link
                  href="/admin"
                  data-sidebar-item="true"
                  data-active={pathname === "/admin" ? "true" : undefined}
                  title={collapsed ? "Area admin" : undefined}
                  className={cn(
                    "group flex min-w-0 flex-1 items-center rounded-[0.95rem] border text-sm transition-all duration-300",
                    collapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-3",
                    pathname === "/admin"
                      ? "border-white/14 bg-[#181818] text-white"
                      : "border-white/0 text-[#9ea6bb] hover:border-white/6 hover:bg-white/4 hover:text-white",
                  )}
                >
                  <ShieldCheck size={20} />
                  {!collapsed ? <span className="truncate">Area admin</span> : null}
                </Link>

                {!collapsed ? (
                  <button
                    type="button"
                    aria-label={adminOpen ? "Recolher submenu admin" : "Expandir submenu admin"}
                    onClick={() => setAdminOpen((current) => !current)}
                    className="flex size-10 shrink-0 items-center justify-center rounded-[0.95rem] border border-white/8 bg-white/4 text-[#b8c4d9] transition-colors hover:bg-white/8 hover:text-white"
                  >
                    {adminOpen ? <CaretDown size={16} /> : <CaretRight size={16} />}
                  </button>
                ) : null}
              </div>

              {showAdminChildren ? (
                <div className="px-2 pb-2">
                  <Link
                    href="/admin/gerenciamento"
                    data-testid="sidebar-link-gerenciamento"
                    data-sidebar-item="true"
                    data-active={pathname === "/admin/gerenciamento" ? "true" : undefined}
                    className={cn(
                      "ml-3 flex items-center gap-3 rounded-[0.95rem] border px-3 py-2.5 text-[13px] transition-all duration-300",
                      pathname === "/admin/gerenciamento"
                        ? "border-white/14 bg-[#181818] text-white"
                        : "border-white/0 text-[#9ea6bb] hover:border-white/6 hover:bg-white/4 hover:text-white",
                    )}
                  >
                    <FadersHorizontal size={17} />
                    <span className="truncate">Gerenciamento</span>
                    <BadgeDot />
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {menuItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href === "/" && pathname.startsWith("/boards/"));

          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`sidebar-link-${item.label.toLowerCase().replaceAll(" ", "-")}`}
              data-sidebar-item="true"
              data-active={active ? "true" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group flex items-center rounded-[1rem] border text-sm transition-all duration-300",
                collapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-3",
                active
                  ? "border-white/14 bg-[#181818] text-white"
                  : "border-white/0 text-[#9ea6bb] hover:border-white/6 hover:bg-white/4 hover:text-white",
              )}
            >
              <Icon size={20} />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <SidebarAccountMenu
          collapsed={collapsed}
          open={accountOpen}
          notificationsOpen={notificationsOpen}
          user={user}
          notifications={userNotifications}
          onOpenChange={setAccountOpen}
          onNotificationsOpenChange={setNotificationsOpen}
          onMarkNotificationRead={markNotificationRead}
          onMarkNotificationsRead={markNotificationsRead}
          onSettings={() => {
            setAccountOpen(false);
            router.push("/configuracoes");
          }}
          onBoard={() => {
            setAccountOpen(false);
            router.push("/");
          }}
          onLogout={() => {
            setAccountOpen(false);
            logout();
            router.replace("/login");
          }}
          theme={theme}
          onThemeChange={setTheme}
        />
      </div>
    </aside>
  );
}

function BadgeDot() {
  return <span className="ml-auto size-2 rounded-full bg-[#ff6b57]/80" />;
}

function userInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function SidebarAccountMenu({
  collapsed,
  open,
  notificationsOpen,
  user,
  notifications,
  onOpenChange,
  onNotificationsOpenChange,
  onMarkNotificationRead,
  onMarkNotificationsRead,
  onSettings,
  onBoard,
  onLogout,
  theme,
  onThemeChange,
}: {
  collapsed: boolean;
  open: boolean;
  notificationsOpen: boolean;
  user: ReturnType<typeof useAuth>["user"];
  notifications: ReturnType<typeof useFlowBoardStore>["notifications"];
  onOpenChange: (open: boolean) => void;
  onNotificationsOpenChange: (open: boolean) => void;
  onMarkNotificationRead: (notificationId: string) => void;
  onMarkNotificationsRead: (notificationIds: string[]) => void;
  onSettings: () => void;
  onBoard: () => void;
  onLogout: () => void;
  theme: HakiTheme;
  onThemeChange: (theme: HakiTheme) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const notificationButtonRef = useRef<HTMLButtonElement | null>(null);
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    if (!open && !notificationsOpen) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
        onNotificationsOpenChange(false);
      }
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) {
        return;
      }

      onOpenChange(false);
      onNotificationsOpenChange(false);
    }

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [notificationsOpen, onNotificationsOpenChange, onOpenChange, open]);

  return (
    <div ref={rootRef} className={cn("relative", collapsed ? "flex justify-center" : "")}>
      <div
        className={cn(
          "flex items-center text-left text-[#d6ddef]",
          collapsed
            ? "justify-center"
            : "w-full gap-2 rounded-[1.15rem] border border-white/8 bg-white/[0.035] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        )}
      >
        <button
          type="button"
          data-testid="sidebar-account-trigger"
          title={collapsed ? user.name : undefined}
          onClick={() => onOpenChange(!open)}
          className={cn(
            "group flex min-w-0 items-center text-left transition-all duration-200 active:scale-[0.985]",
            collapsed
              ? "size-11 justify-center rounded-full border border-transparent bg-transparent p-0 shadow-none hover:bg-white/[0.04]"
              : "min-w-0 flex-1 gap-3",
          )}
        >
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full bg-[#181818] text-xs font-semibold text-white transition-transform duration-200 group-hover:scale-[1.04]",
              collapsed
                ? "size-10 border border-white/10 shadow-[0_10px_28px_-22px_rgba(0,0,0,0.95)]"
                : "size-9 ring-1 ring-white/10",
            )}
          >
            {userInitials(user.name)}
          </span>
          {!collapsed ? (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white">{user.name}</span>
            </span>
          ) : null}
        </button>

        {!collapsed ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              ref={notificationButtonRef}
              type="button"
              aria-label="Abrir notificacoes"
              onClick={() => onNotificationsOpenChange(!notificationsOpen)}
            className="relative flex size-8 items-center justify-center rounded-full border border-white/8 bg-white/4 text-[#b8b8bd] transition-colors hover:border-white/14 hover:bg-white/8 hover:text-white"
            >
              <Bell size={15} />
              {unreadCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[1rem] items-center justify-center rounded-full bg-[#dc3933] px-1 text-[10px] font-semibold leading-4 text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              aria-label="Abrir menu da conta"
              onClick={() => onOpenChange(!open)}
              className="flex size-8 items-center justify-center rounded-full border border-white/8 bg-white/4 text-[#b8b8bd] transition-colors hover:border-white/14 hover:bg-white/8 hover:text-white"
            >
              <GearSix size={15} />
            </button>
          </div>
        ) : null}
      </div>

      <NotificationsPopover
        anchorRef={notificationButtonRef}
        open={notificationsOpen}
        notifications={notifications}
        onClose={() => onNotificationsOpenChange(false)}
        onMarkRead={onMarkNotificationRead}
        onMarkAllRead={onMarkNotificationsRead}
      />

      {open ? (
        <div
          data-testid="sidebar-account-popover"
          className={cn(
            "absolute bottom-[calc(100%+0.75rem)] z-[90] w-[284px] overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#090d14]/98 shadow-[0_28px_90px_-34px_rgba(0,0,0,0.98)] backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-150",
            collapsed ? "left-0" : "left-0",
          )}
        >
          <div className="border-b border-white/8 px-4 py-4">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#181818] text-sm font-semibold text-white ring-1 ring-white/10">
                {userInitials(user.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold tracking-[-0.02em] text-white">{user.name}</p>
                <p className="mt-0.5 truncate text-xs text-[#8f8f95]">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={onSettings}
                aria-label="Abrir configurações"
                className="grid size-9 shrink-0 place-items-center rounded-full border border-white/8 bg-white/[0.035] text-[#b2b2b8] transition hover:border-white/16 hover:bg-white/[0.08] hover:text-white"
              >
                <GearSix size={17} />
              </button>
            </div>
          </div>

          <div className="space-y-1 p-2">
            <div
              className="flex h-14 w-full items-center justify-between rounded-[1rem] border border-white/10 px-3 text-sm text-[#f0f0f2] transition-colors hover:bg-white/6"
            >
              <span>Tema</span>
              <span className="flex items-center gap-1 rounded-full border border-white/8 bg-white/5 p-1 text-[#9f9fa6]">
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Usar tema claro"
                  aria-pressed={theme === "light"}
                  onClick={(event) => {
                    event.stopPropagation();
                    onThemeChange("light");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      onThemeChange("light");
                    }
                  }}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full transition-all duration-200",
                    theme === "light"
                      ? "bg-[#f7f7f7] text-[#111] shadow-[0_8px_20px_-12px_rgba(255,255,255,0.7)]"
                      : "text-[#a8a8ae] hover:bg-white/6 hover:text-white",
                  )}
                >
                  <Sun size={14} />
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Usar tema escuro"
                  aria-pressed={theme === "dark"}
                  onClick={(event) => {
                    event.stopPropagation();
                    onThemeChange("dark");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      onThemeChange("dark");
                    }
                  }}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full transition-all duration-200",
                    theme === "dark"
                      ? "bg-[#2b1814] text-[#ff6b57] shadow-[0_10px_22px_-14px_rgba(220,57,51,0.5)]"
                      : "text-[#6f6f76] hover:bg-black/5 hover:text-[#111]",
                  )}
                >
                  <Moon size={14} />
                </span>
              </span>
            </div>

            <button
              type="button"
              onClick={onBoard}
              className="flex h-12 w-full items-center justify-between rounded-[0.95rem] px-3 text-sm text-[#f0f0f2] transition-colors hover:bg-white/6 active:scale-[0.99]"
            >
              <span>Quadro</span>
              <Kanban size={17} className="text-[#ababaf]" />
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="flex h-12 w-full items-center justify-between rounded-[0.95rem] px-3 text-sm text-[#f0f0f2] transition-colors hover:bg-white/6 active:scale-[0.99]"
            >
              <span>Logout</span>
              <SignOut size={17} className="text-[#ababaf]" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
