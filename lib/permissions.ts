import type { AuthUser } from "@/components/providers/auth-provider";

export type AppPermission =
  | "view-board"
  | "view-delivered-projects"
  | "view-settings"
  | "manage-admin-area";

const ROLE_PERMISSIONS: Record<AuthUser["panel"], Set<AppPermission>> = {
  admin: new Set([
    "view-board",
    "view-delivered-projects",
    "view-settings",
    "manage-admin-area",
  ]),
  cliente: new Set(["view-board", "view-delivered-projects", "view-settings"]),
  colaborador: new Set(["view-board", "view-delivered-projects", "view-settings"]),
};

export function hasPermission(panel: AuthUser["panel"], permission: AppPermission) {
  return ROLE_PERMISSIONS[panel]?.has(permission) ?? false;
}

export function canAccessPath(panel: AuthUser["panel"], pathname: string) {
  if (pathname.startsWith("/admin")) {
    return hasPermission(panel, "manage-admin-area");
  }

  if (pathname.startsWith("/projetos-entregues")) {
    return hasPermission(panel, "view-delivered-projects");
  }

  if (pathname.startsWith("/configuracoes")) {
    return hasPermission(panel, "view-settings");
  }

  return hasPermission(panel, "view-board");
}
