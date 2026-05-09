export const ACCOUNT_SETTINGS_STORAGE_KEY = "painel-haki-account-settings";

export type StoredAccountSettings = {
  displayName: string;
  avatarDataUrl: string;
};

type AccountIdentityUser = {
  name: string;
  email: string;
  avatarUrl?: string;
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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function accountSettingsStorageKey(email: string) {
  return `${ACCOUNT_SETTINGS_STORAGE_KEY}:${normalizeEmail(email)}`;
}

export function readStoredAccountSettings(email?: string): Partial<StoredAccountSettings> {
  if (typeof window === "undefined") {
    return {};
  }

  if (!email) {
    return {};
  }

  const raw = window.localStorage.getItem(accountSettingsStorageKey(email));
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as Partial<StoredAccountSettings>;
  } catch {
    return {};
  }
}

export function writeStoredAccountSettings(
  email: string,
  settings: Partial<StoredAccountSettings>,
) {
  if (typeof window === "undefined" || !email) {
    return;
  }

  window.localStorage.setItem(accountSettingsStorageKey(email), JSON.stringify(settings));
}

export function resolveUserProfileIdentity(user: AccountIdentityUser) {
  const stored = readStoredAccountSettings(user.email);
  const fallbackName = cleanProfileName(user.name) || "Painel Haki";
  const nextName = stored.displayName?.trim() || fallbackName;

  return {
    name: nextName,
    avatarUrl: stored.avatarDataUrl || user.avatarUrl || "",
    initials: initialsFromName(nextName),
  };
}
