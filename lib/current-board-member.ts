import { cleanProfileName } from "@/lib/account-settings";
import { initialsFromName } from "@/lib/flowboard-helpers";
import type { MemberRecord } from "@/lib/flowboard-types";

type SessionUserIdentity = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  panel: "admin" | "cliente" | "colaborador";
};

function normalizeValue(value: string) {
  return value.trim().toLowerCase();
}

function normalizeHandleFromEmail(email: string) {
  const localPart = normalizeValue(email).split("@")[0] ?? "";
  return `@${localPart.replace(/[^a-z0-9._-]/gi, "")}`;
}

function boardRoleFromPanel(panel: SessionUserIdentity["panel"]): MemberRecord["role"] {
  if (panel === "admin") {
    return "Administrador";
  }

  return panel === "colaborador" ? "Membro" : "Observador";
}

function fallbackMemberId(userId: string) {
  if (userId === "admin-erick") {
    return "member-erick";
  }

  if (userId.startsWith("admin-")) {
    return `member-${userId.replace(/^admin-/, "")}`;
  }

  return userId.startsWith("member-") ? userId : `member-${userId}`;
}

export function resolveCurrentBoardMember(
  members: MemberRecord[],
  user: SessionUserIdentity,
): MemberRecord {
  const cleanedUserName = cleanProfileName(user.name);
  const normalizedUserName = normalizeValue(cleanedUserName);
  const normalizedUserHandle = normalizeHandleFromEmail(user.email);
  const preferredIds = new Set([
    fallbackMemberId(user.id),
    user.id,
  ]);

  const exactIdMatch = members.find((member) => preferredIds.has(member.id));
  if (exactIdMatch) {
    return exactIdMatch;
  }

  const handleMatch = members.find(
    (member) => normalizeValue(member.handle) === normalizedUserHandle,
  );
  if (handleMatch) {
    return handleMatch;
  }

  const nameMatch = members.find(
    (member) => normalizeValue(cleanProfileName(member.name)) === normalizedUserName,
  );
  if (nameMatch) {
    return nameMatch;
  }

  return {
    id: fallbackMemberId(user.id),
    name: cleanedUserName || "Painel Haki",
    handle: normalizedUserHandle,
    role: boardRoleFromPanel(user.panel),
    avatar: user.avatarUrl,
    initials: initialsFromName(cleanedUserName || "Painel Haki"),
  };
}
