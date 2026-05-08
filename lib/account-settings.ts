import type { AuthUser } from "@/components/providers/auth-provider";

export const ACCOUNT_SETTINGS_STORAGE_KEY = "painel-haki-account-settings";

export type StoredAccountSettings = {
  displayName: string;
  avatarDataUrl: string;
};

export function initialsFromName(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function cleanProfileName(name: string) {
  return name.replace(/\s*\(voce\)\s*/i, "").trim();
}

export function readStoredAccountSettings(): Partial<StoredAccountSettings> {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(ACCOUNT_SETTINGS_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as Partial<StoredAccountSettings>;
  } catch {
    return {};
  }
}

export function resolveUserProfileIdentity(user: AuthUser) {
  const stored = readStoredAccountSettings();

  return {
    name: stored.displayName?.trim() || cleanProfileName(user.name),
    avatarUrl: stored.avatarDataUrl || user.avatarUrl || "",
    initials: initialsFromName(stored.displayName?.trim() || cleanProfileName(user.name) || "Painel Haki"),
  };
}
