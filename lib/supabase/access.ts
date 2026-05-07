"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { upsertSupabaseWorkspaceFromBoardRecord } from "@/lib/supabase/workspaces";
import type { BoardRecord } from "@/lib/flowboard-types";
import type { AdminUserKind, BoardRole, WorkspacePanel } from "@/types/board";

export type SupabaseProfile = {
  id: string;
  email: string;
  full_name: string | null;
  kind: AdminUserKind;
  status: "ativo" | "pendente" | "desativado";
  company: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type RegistrationInvite = {
  email: string;
  kind: "cliente" | "colaborador";
  panel: "cliente" | "colaborador";
  boardRole: BoardRole;
  workspaceId: string;
  workspaceLocalId: string | null;
  workspaceTitle: string;
};

type InviteRow = {
  email: string;
  kind: "cliente" | "colaborador";
  panel: "cliente" | "colaborador";
  board_role: BoardRole;
  workspace_id: string;
  workspace_local_id: string | null;
  workspace_title: string;
};

function getClient() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  return getSupabaseBrowserClient();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function requireClient(client: SupabaseClient | null) {
  if (!client) {
    throw new Error("Supabase nao esta configurado.");
  }

  return client;
}

export async function fetchSupabaseProfileByEmail(email: string) {
  const client = getClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("email", normalizeEmail(email))
    .maybeSingle<SupabaseProfile>();

  if (error) {
    return null;
  }

  return data;
}

export async function getRegistrationInvite(email: string): Promise<RegistrationInvite | null> {
  const client = getClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client.rpc("get_registration_invite", {
    p_email: normalizeEmail(email),
  });

  if (error || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  const invite = data[0] as InviteRow;
  return {
    email: invite.email,
    kind: invite.kind,
    panel: invite.panel,
    boardRole: invite.board_role,
    workspaceId: invite.workspace_id,
    workspaceLocalId: invite.workspace_local_id,
    workspaceTitle: invite.workspace_title,
  };
}

export async function ensureSupabaseWorkspace(board: BoardRecord) {
  const workspaceId = await upsertSupabaseWorkspaceFromBoardRecord(board);
  if (!workspaceId) {
    throw new Error("Supabase nao esta configurado.");
  }

  return workspaceId;
}

export async function prepareSupabaseWorkspaceInvite({
  board,
  email,
  kind,
}: {
  board: BoardRecord;
  email: string;
  kind: "cliente" | "colaborador";
}) {
  const client = requireClient(getClient());
  const workspaceId = await ensureSupabaseWorkspace(board);

  const { error } = await client.rpc("prepare_workspace_invite", {
    p_workspace_id: workspaceId,
    p_email: normalizeEmail(email),
    p_kind: kind,
  });

  if (error) {
    throw error;
  }

  return workspaceId;
}

export function panelFromProfile(profile: SupabaseProfile): WorkspacePanel {
  if (profile.kind === "admin") {
    return "admin";
  }

  return profile.kind === "colaborador" ? "colaborador" : "cliente";
}
