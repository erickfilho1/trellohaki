"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createId } from "@/lib/flowboard-helpers";

export const FLOWBOARD_ASSETS_BUCKET = "flowboard-assets";

export type UploadedAsset = {
  path: string;
  publicUrl: string;
  name: string;
  size: number;
  type: string;
};

function getClient() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  return getSupabaseBrowserClient();
}

function extensionFromFile(file: File) {
  const extension = file.name.split(".").pop()?.trim().toLowerCase();
  return extension ? `.${extension.replace(/[^a-z0-9]/g, "")}` : "";
}

function normalizeFolder(folder: string) {
  return folder
    .split("/")
    .map((segment) => segment.trim().replace(/[^a-zA-Z0-9._-]/g, "-"))
    .filter(Boolean)
    .join("/");
}

export async function uploadFlowBoardAsset({
  file,
  folder,
}: {
  file: File;
  folder: string;
}): Promise<UploadedAsset> {
  const client = getClient();
  if (!client) {
    throw new Error("Supabase Storage nao esta configurado.");
  }

  const safeFolder = normalizeFolder(folder);
  const path = `${safeFolder}/${createId("asset")}${extensionFromFile(file)}`;

  const { error } = await client.storage.from(FLOWBOARD_ASSETS_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });

  if (error) {
    throw error;
  }

  const { data } = client.storage.from(FLOWBOARD_ASSETS_BUCKET).getPublicUrl(path);

  return {
    path,
    publicUrl: data.publicUrl,
    name: file.name,
    size: file.size,
    type: file.type,
  };
}

export async function uploadCardCoverAsset({
  boardId,
  cardId,
  file,
}: {
  boardId: string;
  cardId: string;
  file: File;
}) {
  return uploadFlowBoardAsset({
    file,
    folder: `boards/${boardId}/cards/${cardId}/cover`,
  });
}

export async function uploadCardAttachmentAsset({
  boardId,
  cardId,
  file,
}: {
  boardId: string;
  cardId: string;
  file: File;
}) {
  return uploadFlowBoardAsset({
    file,
    folder: `boards/${boardId}/cards/${cardId}/attachments`,
  });
}

export async function uploadProjectSummaryImageAsset({
  cardId,
  fieldId,
  file,
}: {
  cardId: string;
  fieldId: string;
  file: File;
}) {
  return uploadFlowBoardAsset({
    file,
    folder: `project-summaries/${cardId}/${fieldId}`,
  });
}
