"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowSquareOut,
  CaretDown,
  CaretRight,
  FadersHorizontal,
  Kanban,
  Lightning,
  Package,
  ShieldCheck,
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
  const canUseAdminArea = hasPermission(user.panel, "manage-admin-area");
  const showAdminChildren = !collapsed && (adminOpen || pathname.startsWith("/admin"));

  return (
    <aside
      data-testid="client-sidebar"
      className={cn(
        "relative flex h-full min-h-0 flex-col border-r border-white/8 bg-[linear-gradient(180deg,#0f1521_0%,#0b1018_100%)] px-3 py-4 transition-[width] duration-300",
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
              ? "size-10 rounded-full border border-white/10 bg-[#171d29]"
              : "size-10 rounded-[0.95rem] border border-white/10 bg-[#171d29]",
          )}
        >
          <Lightning size={18} weight="fill" />
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold tracking-[-0.03em] text-white">
              ClientBoard
            </p>
            <p className="truncate text-xs text-[#8e97ac]">{projectName}</p>
          </div>
        ) : null}
      </div>

      <nav className="mt-6 flex flex-col gap-1.5">
        {canUseAdminArea ? (
          <div className="space-y-1.5">
            <div
              className={cn(
                "rounded-[1rem] border transition-all duration-300",
                collapsed
                  ? "border-white/0 bg-transparent"
                  : pathname.startsWith("/admin")
                    ? "border-[#4566c8]/38 bg-[#131c2b]"
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
                  title={collapsed ? "Area admin" : undefined}
                  className={cn(
                    "group flex min-w-0 flex-1 items-center rounded-[0.95rem] border text-sm transition-all duration-300",
                    collapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-3",
                    pathname === "/admin"
                      ? "border-[#4566c8]/40 bg-[#182131] text-white"
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
                    className={cn(
                      "ml-3 flex items-center gap-3 rounded-[0.95rem] border px-3 py-2.5 text-[13px] transition-all duration-300",
                      pathname === "/admin/gerenciamento"
                        ? "border-[#4566c8]/38 bg-[#1a2336] text-white"
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
              title={collapsed ? item.label : undefined}
              className={cn(
                "group flex items-center rounded-[1rem] border text-sm transition-all duration-300",
                collapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-3",
                active
                  ? "border-[#4566c8]/40 bg-[#182131] text-white"
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
        {!collapsed ? (
          <div className="rounded-[1.25rem] border border-white/7 bg-white/3 p-3">
            <p className="text-[11px] font-semibold tracking-[0.24em] text-[#74809a] uppercase">
              Modo foco
            </p>
            <p className="mt-2 text-sm leading-6 text-[#cfd6e6]">
              Recolha a barra lateral para deixar o quadro ocupar quase toda a tela.
            </p>
          </div>
        ) : null}

        <button
          type="button"
          data-testid="sidebar-logout"
          title={collapsed ? "Desconectar" : undefined}
          onClick={() => {
            logout();
            router.replace("/login");
          }}
          className={cn(
            "flex w-full items-center rounded-[1rem] border border-white/8 bg-white/3 text-[#d6ddef] transition-colors hover:bg-white/8",
            collapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-3",
          )}
        >
          <ArrowSquareOut size={18} />
          {!collapsed ? <span>Desconectar</span> : null}
        </button>
      </div>
    </aside>
  );
}

function BadgeDot() {
  return <span className="ml-auto size-2 rounded-full bg-[#6e8dff]/80" />;
}
