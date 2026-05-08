"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
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
import { useAuth } from "@/components/providers/auth-provider";
import { SidebarToggleButton } from "@/components/sidebar-toggle-button";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const menuItems = [
  { href: "/", label: "Quadro", icon: Kanban },
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
  const [adminOpen, setAdminOpen] = useState(pathname.startsWith("/admin"));
  const [accountOpen, setAccountOpen] = useState(false);
  const [theme, setTheme] = useState<HakiTheme>(readStoredTheme);
  const canUseAdminArea = hasPermission(user.panel, "manage-admin-area");
  const showAdminChildren = !collapsed && (adminOpen || pathname.startsWith("/admin"));

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
          user={user}
          onOpenChange={setAccountOpen}
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
  user,
  onOpenChange,
  onBoard,
  onLogout,
  theme,
  onThemeChange,
}: {
  collapsed: boolean;
  open: boolean;
  user: ReturnType<typeof useAuth>["user"];
  onOpenChange: (open: boolean) => void;
  onBoard: () => void;
  onLogout: () => void;
  theme: HakiTheme;
  onThemeChange: (theme: HakiTheme) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) {
        return;
      }

      onOpenChange(false);
    }

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [onOpenChange, open]);

  return (
    <div ref={rootRef} className={cn("relative", collapsed ? "flex justify-center" : "")}>
      <button
        type="button"
        data-testid="sidebar-account-trigger"
        title={collapsed ? user.name : undefined}
        onClick={() => onOpenChange(!open)}
        className={cn(
          "group flex items-center border border-white/8 bg-white/[0.035] text-left text-[#d6ddef] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:border-white/14 hover:bg-white/[0.065] active:scale-[0.985]",
          collapsed ? "size-11 justify-center rounded-[1rem] p-0" : "w-full gap-3 rounded-[1.15rem] px-3 py-2.5",
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#181818] text-xs font-semibold text-white ring-1 ring-white/10 transition-transform duration-200 group-hover:scale-[1.04]">
          {userInitials(user.name)}
        </span>
        {!collapsed ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-white">{user.name}</span>
            <span className="block truncate text-xs text-[#8996ad]">{user.email}</span>
          </span>
        ) : null}
        {!collapsed ? (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/4 text-[#aab6cc] transition-colors group-hover:text-white">
            <GearSix size={15} />
          </span>
        ) : null}
      </button>

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
                <p className="mt-0.5 truncate text-xs text-[#8e9ab2]">{user.email}</p>
              </div>
              <GearSix size={18} className="shrink-0 text-[#8e9ab2]" />
            </div>
          </div>

          <div className="space-y-1 p-2">
            <div
              className="flex h-14 w-full items-center justify-between rounded-[1rem] border border-white/10 px-3 text-sm text-[#e9eefb] transition-colors hover:bg-white/6"
            >
              <span>Tema</span>
              <span className="flex items-center gap-1 rounded-full border border-white/8 bg-white/5 p-1 text-[#9ba8bd]">
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
                      ? "bg-[#f7f7f7] text-[#111] shadow-[0_8px_20px_-12px_rgba(255,255,255,0.8)]"
                      : "text-[#9ba8bd] hover:bg-white/6 hover:text-white",
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
                      ? "bg-[#222] text-white shadow-[0_8px_20px_-12px_rgba(0,0,0,0.95)]"
                      : "text-[#6e7686] hover:bg-black/5 hover:text-[#111]",
                  )}
                >
                  <Moon size={14} />
                </span>
              </span>
            </div>

            <button
              type="button"
              onClick={onBoard}
              className="flex h-12 w-full items-center justify-between rounded-[0.95rem] px-3 text-sm text-[#e9eefb] transition-colors hover:bg-white/6 active:scale-[0.99]"
            >
              <span>Quadro</span>
              <Kanban size={17} className="text-[#95a2ba]" />
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="flex h-12 w-full items-center justify-between rounded-[0.95rem] px-3 text-sm text-[#e9eefb] transition-colors hover:bg-white/6 active:scale-[0.99]"
            >
              <span>Logout</span>
              <SignOut size={17} className="text-[#95a2ba]" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
