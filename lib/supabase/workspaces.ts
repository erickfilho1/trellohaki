"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import type { BoardRecord } from "@/lib/flowboard-types";
import type { Board } from "@/types/board";

export type SupabaseWorkspace = {
  id: string;
  local_id: string | null;
  title: string;
  client_name: string;
  description: string | null;
  accent: string | null;
  share_link: string | null;
  created_at: string;
  updated_at: string;
};

type WorkspacePayload = {
  local_id: string;
  title: string;
  client_name: string;
  description: string;
  accent: string;
  share_link: string;
  updated_at: string;
};

function getClient() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  return getSupabaseBrowserClient();
}

function compactText(value?: string | null) {
  return value?.trim() ?? "";
}

function boardRecordToPayload(board: BoardRecord): WorkspacePayload {
  return {
    local_id: board.id,
    title: compactText(board.name) || "Quadro sem nome",
    client_name: compactText(board.name) || "Cliente",
    description: compactText(board.description),
    accent: compactText(board.accent),
    share_link: compactText(board.shareLink),
    updated_at: new Date().toISOString(),
  };
}

function boardEntityToPayload(board: Board): WorkspacePayload {
  return {
    local_id: board.id,
    title: compactText(board.title) || "Quadro sem nome",
    client_name: compactText(board.clientName) || compactText(board.title) || "Cliente",
    description: compactText(board.description),
    accent: compactText(board.accent),
    share_link: compactText(board.shareLink),
    updated_at: new Date().toISOString(),
  };
}

async function upsertSupabaseWorkspace(payload: WorkspacePayload) {
  const client = getClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from("workspaces")
    .upsert(payload, { onConflict: "local_id" })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    throw error;
  }

  return data.id;
}

export async function fetchSupabaseWorkspaces() {
  const client = getClient();
  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from("workspaces")
    .select("id, local_id, title, client_name, description, accent, share_link, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as SupabaseWorkspace[];
}

export async function upsertSupabaseWorkspaceFromBoardRecord(board: BoardRecord) {
  return upsertSupabaseWorkspace(boardRecordToPayload(board));
}

export async function upsertSupabaseWorkspaceFromBoardEntity(board: Board) {
  return upsertSupabaseWorkspace(boardEntityToPayload(board));
}

export async function syncSupabaseWorkspacesFromBoards(boards: BoardRecord[]) {
  const client = getClient();
  if (!client || boards.length === 0) {
    return [];
  }

  const payload = boards.map(boardRecordToPayload);
  const { data, error } = await client
    .from("workspaces")
    .upsert(payload, { onConflict: "local_id" })
    .select("id, local_id");

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function deleteSupabaseWorkspaceByLocalId(localId: string) {
  const client = getClient();
  if (!client) {
    return;
  }

  const { error } = await client.from("workspaces").delete().eq("local_id", localId);

  if (error) {
    throw error;
  }
}
