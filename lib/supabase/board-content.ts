"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { initialsFromName } from "@/lib/flowboard-helpers";
import type { BoardRecord } from "@/lib/flowboard-types";
import { upsertSupabaseWorkspaceFromBoardEntity } from "@/lib/supabase/workspaces";
import {
  fetchSupabaseWorkspaces,
  upsertSupabaseWorkspaceFromBoardRecord,
} from "@/lib/supabase/workspaces";
import type {
  Attachment,
  BoardStoreSnapshot,
  Card,
  Comment,
  DeliveredFolder,
  Label,
  List,
} from "@/types/board";
import { DEFAULT_FILTERS } from "@/store/board-store";

type LocalRemoteRow = {
  id: string;
  local_id: string | null;
};

type CardUpsertPayload = {
  local_id: string;
  workspace_id: string;
  list_id: string;
  delivered_folder_id: string | null;
  title: string;
  description: string;
  cover: NonNullable<Card["cover"]> | null;
  project_summary: NonNullable<Card["projectSummary"]> | null;
  custom_fields: Card["customFields"];
  dates: ReturnType<typeof makeDatesPayload>;
  completed: boolean;
  archived: boolean;
  position: number;
  updated_at: string;
};

type AttachmentWithCardId = Attachment & {
  cardId: string;
};

type SupabaseCommentRelationRow = {
  local_id: string | null;
  content: string;
  created_at: string;
  cards: { local_id: string | null } | Array<{ local_id: string | null }> | null;
};

type SupabaseAttachmentRelationRow = {
  local_id: string | null;
  name: string;
  url: string;
  kind: Attachment["kind"];
  created_at: string;
  cards: { local_id: string | null } | Array<{ local_id: string | null }> | null;
};

type SupabaseCardLabelRelationRow = {
  cards: { local_id: string | null } | Array<{ local_id: string | null }> | null;
  labels: { local_id: string | null } | Array<{ local_id: string | null }> | null;
};

type SupabaseListRow = {
  id: string;
  local_id: string | null;
  workspace_id: string;
  title: string;
  position: number;
  color: List["color"];
  archived: boolean;
  created_at: string;
  updated_at: string;
};

type SupabaseDeliveredFolderRow = {
  id: string;
  local_id: string | null;
  workspace_id: string;
  name: string;
  color: DeliveredFolder["color"];
  created_at: string;
  updated_at: string;
};

type SupabaseLabelRow = {
  id: string;
  local_id: string | null;
  workspace_id: string;
  title: string;
  color: Label["color"];
  created_at: string;
  updated_at: string;
};

type SupabaseCardRow = {
  id: string;
  local_id: string | null;
  workspace_id: string;
  list_id: string;
  delivered_folder_id: string | null;
  title: string;
  description: string | null;
  cover: Card["cover"] | null;
  project_summary: Card["projectSummary"] | null;
  custom_fields: Card["customFields"] | null;
  dates: Partial<{
    startDate: string | null;
    dueDate: string | null;
    recurring: string | null;
    reminder: string | null;
  }> | null;
  completed: boolean;
  archived: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

type SupabaseCommentRow = {
  local_id: string | null;
  workspace_id: string;
  card_id: string;
  content: string;
  created_at: string;
};

type SupabaseAttachmentRow = {
  local_id: string | null;
  workspace_id: string;
  card_id: string;
  name: string;
  url: string;
  kind: Attachment["kind"];
};

type SupabaseCardLabelRow = {
  card_id: string;
  label_id: string;
};

type SupabaseWorkspaceAccessRelationRow = {
  id: string;
  profile_id: string;
  board_role: "Membro" | "Observador" | "Administrador";
  panel: "admin" | "cliente" | "colaborador";
  created_at: string;
  updated_at: string;
  workspaces: { local_id: string | null } | Array<{ local_id: string | null }> | null;
};

type SupabaseVisibleProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  kind: "admin" | "cliente" | "colaborador";
  status: "ativo" | "pendente" | "desativado";
  company: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
};

function getClient() {
  if (!hasSupabaseEnv()) {
    return null;
  }

  return getSupabaseBrowserClient();
}

function byOrder<T extends { order: number }>(items: T[]) {
  return [...items].sort((a, b) => a.order - b.order);
}

function getBoardLists(snapshot: BoardStoreSnapshot, boardId: string) {
  return byOrder(Object.values(snapshot.lists).filter((list) => list.boardId === boardId));
}

function getBoardCards(snapshot: BoardStoreSnapshot, boardId: string) {
  return byOrder(Object.values(snapshot.cards).filter((card) => card.boardId === boardId));
}

function getBoardFolders(snapshot: BoardStoreSnapshot, boardId: string) {
  return snapshot.boards[boardId]?.deliveredFolders ?? [];
}

function getBoardLabels(snapshot: BoardStoreSnapshot, boardId: string) {
  return Object.values(snapshot.labels)
    .filter((label) => label.boardId === boardId)
    .sort((a, b) => a.title.localeCompare(b.title));
}

function getBoardComments(snapshot: BoardStoreSnapshot, boardId: string) {
  return Object.values(snapshot.comments)
    .filter((comment) => comment.boardId === boardId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function getCardAttachments(cards: Card[]) {
  return cards.flatMap((card) =>
    card.attachments.map((attachment) => ({
      ...attachment,
      cardId: card.id,
    })),
  );
}

function firstRelation<T>(relation: T | T[] | null) {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function makeDatesPayload(card: Card) {
  return {
    startDate: card.startDate ?? null,
    dueDate: card.dueDate ?? null,
    recurring: card.recurring,
    reminder: card.reminder,
  };
}

async function deleteRemoteRowsNotInLocalSet({
  table,
  workspaceId,
  localIds,
}: {
  table: "lists" | "cards" | "delivered_folders" | "labels" | "comments" | "attachments";
  workspaceId: string;
  localIds: Set<string>;
}) {
  const client = getClient();
  if (!client) {
    return;
  }

  const { data, error } = await client
    .from(table)
    .select("id, local_id")
    .eq("workspace_id", workspaceId);

  if (error) {
    throw error;
  }

  const staleIds = ((data ?? []) as LocalRemoteRow[])
    .filter((row) => row.local_id && !localIds.has(row.local_id))
    .map((row) => row.id);

  if (staleIds.length === 0) {
    return;
  }

  const { error: deleteError } = await client.from(table).delete().in("id", staleIds);
  if (deleteError) {
    throw deleteError;
  }
}

async function upsertFolders(workspaceId: string, folders: DeliveredFolder[]) {
  const client = getClient();
  if (!client) {
    return new Map<string, string>();
  }

  const localIds = new Set(folders.map((folder) => folder.id));
  await deleteRemoteRowsNotInLocalSet({
    table: "delivered_folders",
    workspaceId,
    localIds,
  });

  if (folders.length === 0) {
    return new Map<string, string>();
  }

  const payload = folders.map((folder) => ({
    local_id: folder.id,
    workspace_id: workspaceId,
    name: folder.name,
    color: folder.color,
    updated_at: folder.updatedAt,
  }));

  const { data, error } = await client
    .from("delivered_folders")
    .upsert(payload, { onConflict: "local_id" })
    .select("id, local_id");

  if (error) {
    throw error;
  }

  return new Map(
    ((data ?? []) as LocalRemoteRow[])
      .filter((row): row is { id: string; local_id: string } => Boolean(row.local_id))
      .map((row) => [row.local_id, row.id]),
  );
}

async function upsertLists(workspaceId: string, lists: List[]) {
  const client = getClient();
  if (!client) {
    return new Map<string, string>();
  }

  const localIds = new Set(lists.map((list) => list.id));
  await deleteRemoteRowsNotInLocalSet({
    table: "lists",
    workspaceId,
    localIds,
  });

  if (lists.length === 0) {
    return new Map<string, string>();
  }

  const payload = lists.map((list) => ({
    local_id: list.id,
    workspace_id: workspaceId,
    title: list.title,
    position: list.order,
    color: list.color ?? null,
    archived: list.archived,
    updated_at: list.updatedAt,
  }));

  const { data, error } = await client
    .from("lists")
    .upsert(payload, { onConflict: "local_id" })
    .select("id, local_id");

  if (error) {
    throw error;
  }

  return new Map(
    ((data ?? []) as LocalRemoteRow[])
      .filter((row): row is { id: string; local_id: string } => Boolean(row.local_id))
      .map((row) => [row.local_id, row.id]),
  );
}

async function upsertLabels(workspaceId: string, labels: Label[]) {
  const client = getClient();
  if (!client) {
    return new Map<string, string>();
  }

  const localIds = new Set(labels.map((label) => label.id));
  await deleteRemoteRowsNotInLocalSet({
    table: "labels",
    workspaceId,
    localIds,
  });

  if (labels.length === 0) {
    return new Map<string, string>();
  }

  const payload = labels.map((label) => ({
    local_id: label.id,
    workspace_id: workspaceId,
    title: label.title,
    color: label.color,
    updated_at: label.updatedAt,
  }));

  const { data, error } = await client
    .from("labels")
    .upsert(payload, { onConflict: "local_id" })
    .select("id, local_id");

  if (error) {
    throw error;
  }

  return new Map(
    ((data ?? []) as LocalRemoteRow[])
      .filter((row): row is { id: string; local_id: string } => Boolean(row.local_id))
      .map((row) => [row.local_id, row.id]),
  );
}

async function upsertCards({
  workspaceId,
  cards,
  listIdMap,
  folderIdMap,
}: {
  workspaceId: string;
  cards: Card[];
  listIdMap: Map<string, string>;
  folderIdMap: Map<string, string>;
}) {
  const client = getClient();
  if (!client) {
    return new Map<string, string>();
  }

  const localIds = new Set(cards.map((card) => card.id));
  await deleteRemoteRowsNotInLocalSet({
    table: "cards",
    workspaceId,
    localIds,
  });

  const payload = cards
    .map((card) => {
      const remoteListId = listIdMap.get(card.listId);
      if (!remoteListId) {
        return null;
      }

      return {
        local_id: card.id,
        workspace_id: workspaceId,
        list_id: remoteListId,
        delivered_folder_id: card.deliveredFolderId
          ? folderIdMap.get(card.deliveredFolderId) ?? null
          : null,
        title: card.title,
        description: card.description,
        cover: card.cover ?? null,
        project_summary: card.projectSummary ?? null,
        custom_fields: card.customFields,
        dates: makeDatesPayload(card),
        completed: card.completed,
        archived: card.archived,
        position: card.order,
        updated_at: card.updatedAt,
      };
    })
    .filter((card): card is CardUpsertPayload => Boolean(card));

  if (payload.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await client
    .from("cards")
    .upsert(payload, { onConflict: "local_id" })
    .select("id, local_id");

  if (error) {
    throw error;
  }

  return new Map(
    ((data ?? []) as LocalRemoteRow[])
      .filter((row): row is { id: string; local_id: string } => Boolean(row.local_id))
      .map((row) => [row.local_id, row.id]),
  );
}

async function syncCardLabels({
  cards,
  cardIdMap,
  labelIdMap,
}: {
  cards: Card[];
  cardIdMap: Map<string, string>;
  labelIdMap: Map<string, string>;
}) {
  const client = getClient();
  if (!client) {
    return;
  }

  const remoteCardIds = cards
    .map((card) => cardIdMap.get(card.id))
    .filter((id): id is string => Boolean(id));

  if (remoteCardIds.length === 0) {
    return;
  }

  const { error: deleteError } = await client
    .from("card_labels")
    .delete()
    .in("card_id", remoteCardIds);

  if (deleteError) {
    throw deleteError;
  }

  const payload = cards.flatMap((card) => {
    const remoteCardId = cardIdMap.get(card.id);
    if (!remoteCardId) {
      return [];
    }

    return card.labelIds
      .map((labelId) => {
        const remoteLabelId = labelIdMap.get(labelId);
        if (!remoteLabelId) {
          return null;
        }

        return {
          card_id: remoteCardId,
          label_id: remoteLabelId,
        };
      })
      .filter((row): row is { card_id: string; label_id: string } => Boolean(row));
  });

  if (payload.length === 0) {
    return;
  }

  const { error } = await client.from("card_labels").insert(payload);
  if (error) {
    throw error;
  }
}

async function upsertComments({
  workspaceId,
  comments,
  cardIdMap,
}: {
  workspaceId: string;
  comments: Comment[];
  cardIdMap: Map<string, string>;
}) {
  const client = getClient();
  if (!client) {
    return;
  }

  const localIds = new Set(comments.map((comment) => comment.id));
  await deleteRemoteRowsNotInLocalSet({
    table: "comments",
    workspaceId,
    localIds,
  });

  const payload = comments
    .map((comment) => {
      const remoteCardId = cardIdMap.get(comment.cardId);
      if (!remoteCardId) {
        return null;
      }

      return {
        local_id: comment.id,
        workspace_id: workspaceId,
        card_id: remoteCardId,
        // Local member IDs are mapped to profile UUIDs when member persistence is enabled.
        author_id: null,
        content: comment.content,
        created_at: comment.createdAt,
      };
    })
    .filter(
      (comment): comment is {
        local_id: string;
        workspace_id: string;
        card_id: string;
        author_id: null;
        content: string;
        created_at: string;
      } => Boolean(comment),
    );

  if (payload.length === 0) {
    return;
  }

  const { error } = await client.from("comments").upsert(payload, { onConflict: "local_id" });
  if (error) {
    throw error;
  }
}

async function upsertAttachments({
  workspaceId,
  attachments,
  cardIdMap,
}: {
  workspaceId: string;
  attachments: AttachmentWithCardId[];
  cardIdMap: Map<string, string>;
}) {
  const client = getClient();
  if (!client) {
    return;
  }

  const localIds = new Set(attachments.map((attachment) => attachment.id));
  await deleteRemoteRowsNotInLocalSet({
    table: "attachments",
    workspaceId,
    localIds,
  });

  const payload = attachments
    .map((attachment) => {
      const remoteCardId = cardIdMap.get(attachment.cardId);
      if (!remoteCardId) {
        return null;
      }

      return {
        local_id: attachment.id,
        workspace_id: workspaceId,
        card_id: remoteCardId,
        name: attachment.name,
        url: attachment.url,
        kind: attachment.kind,
      };
    })
    .filter(
      (attachment): attachment is {
        local_id: string;
        workspace_id: string;
        card_id: string;
        name: string;
        url: string;
        kind: Attachment["kind"];
      } => Boolean(attachment),
    );

  if (payload.length === 0) {
    return;
  }

  const { error } = await client.from("attachments").upsert(payload, {
    onConflict: "local_id",
  });

  if (error) {
    throw error;
  }
}

export async function syncSupabaseBoardContent(snapshot: BoardStoreSnapshot, boardId: string) {
  const client = getClient();
  const board = snapshot.boards[boardId];

  if (!client || !board) {
    return null;
  }

  const workspaceId = await upsertSupabaseWorkspaceFromBoardEntity(board);
  if (!workspaceId) {
    return null;
  }

  const folders = getBoardFolders(snapshot, boardId);
  const lists = getBoardLists(snapshot, boardId);
  const cards = getBoardCards(snapshot, boardId);
  const labels = getBoardLabels(snapshot, boardId);
  const comments = getBoardComments(snapshot, boardId);
  const attachments = getCardAttachments(cards);

  const folderIdMap = await upsertFolders(workspaceId, folders);
  const listIdMap = await upsertLists(workspaceId, lists);
  const labelIdMap = await upsertLabels(workspaceId, labels);
  const cardIdMap = await upsertCards({
    workspaceId,
    cards,
    listIdMap,
    folderIdMap,
  });
  await syncCardLabels({ cards, cardIdMap, labelIdMap });
  await upsertComments({ workspaceId, comments, cardIdMap });
  await upsertAttachments({ workspaceId, attachments, cardIdMap });

  return {
    workspaceId,
    lists: lists.length,
    cards: cards.length,
    deliveredFolders: folders.length,
    labels: labels.length,
    comments: comments.length,
    attachments: attachments.length,
  };
}

export async function syncSupabaseBoardRecordContent(board: BoardRecord) {
  const client = getClient();
  if (!client) {
    return null;
  }

  const workspaceId = await upsertSupabaseWorkspaceFromBoardRecord(board);
  if (!workspaceId) {
    return null;
  }

  const now = new Date().toISOString();
  const folders: DeliveredFolder[] = board.deliveredFolders.map((folder) => ({
    id: folder.id,
    boardId: board.id,
    name: folder.name,
    color: folder.color,
    createdAt: folder.createdAt,
    updatedAt: now,
  }));

  const lists: List[] = board.lists.map((list, index) => ({
    id: list.id,
    boardId: board.id,
    title: list.title,
    order: index,
    color: list.color,
    archived: false,
    following: list.following,
    createdAt: board.updatedAt,
    updatedAt: board.updatedAt,
  }));

  const cards: Card[] = board.lists.flatMap((list) =>
    list.cards.map((card, index) => ({
      id: card.id,
      boardId: board.id,
      listId: list.id,
      title: card.title,
      description: card.description,
      labelIds: card.labels.map((label) => label.id),
      memberIds: card.members.map((member) => member.id),
      checklistIds: card.checklists.map((checklist) => checklist.id),
      checklists: card.checklists,
      attachments: card.attachments,
      customFields: card.customFields,
      cover: card.cover,
      projectSummary: card.projectSummary,
      deliveredFolderId: card.deliveredFolderId,
      location: card.location,
      dueDate: card.dates.dueDate,
      startDate: card.dates.startDate,
      recurring: card.dates.recurring,
      reminder: card.dates.reminder,
      completed: Boolean(card.completed),
      archived: false,
      order: index,
      createdAt: board.updatedAt,
      updatedAt: board.updatedAt,
    })),
  );

  const labels: Label[] = board.labelCatalog.map((label) => ({
    id: label.id,
    boardId: board.id,
    title: label.name,
    color: label.tone,
    createdAt: board.updatedAt,
    updatedAt: board.updatedAt,
  }));

  const comments: Comment[] = board.lists.flatMap((list) =>
    list.cards.flatMap((card) =>
      card.comments.map((comment) => ({
        id: comment.id,
        boardId: board.id,
        cardId: card.id,
        authorId: comment.author.id,
        content: comment.text,
        createdAt: comment.createdAt,
      })),
    ),
  );

  const attachments = getCardAttachments(cards);

  const folderIdMap = await upsertFolders(workspaceId, folders);
  const listIdMap = await upsertLists(workspaceId, lists);
  const labelIdMap = await upsertLabels(workspaceId, labels);
  const cardIdMap = await upsertCards({
    workspaceId,
    cards,
    listIdMap,
    folderIdMap,
  });
  await syncCardLabels({ cards, cardIdMap, labelIdMap });
  await upsertComments({ workspaceId, comments, cardIdMap });
  await upsertAttachments({ workspaceId, attachments, cardIdMap });

  return {
    workspaceId,
    lists: lists.length,
    cards: cards.length,
    deliveredFolders: folders.length,
    labels: labels.length,
    comments: comments.length,
    attachments: attachments.length,
  };
}

export async function fetchSupabaseBoardRelations(boardId: string) {
  const client = getClient();
  if (!client) {
    return null;
  }

  const { data: workspace, error: workspaceError } = await client
    .from("workspaces")
    .select("id")
    .eq("local_id", boardId)
    .maybeSingle();

  if (workspaceError) {
    throw workspaceError;
  }

  if (!workspace?.id) {
    return null;
  }

  const [labelsResult, cardLabelsResult, commentsResult, attachmentsResult] = await Promise.all([
    client
      .from("labels")
      .select("local_id, title, color, created_at, updated_at")
      .eq("workspace_id", workspace.id),
    client
      .from("card_labels")
      .select("cards!inner(local_id, workspace_id), labels!inner(local_id)")
      .eq("cards.workspace_id", workspace.id),
    client
      .from("comments")
      .select("local_id, content, created_at, cards!inner(local_id)")
      .eq("workspace_id", workspace.id),
    client
      .from("attachments")
      .select("local_id, name, url, kind, created_at, cards!inner(local_id)")
      .eq("workspace_id", workspace.id),
  ]);

  if (labelsResult.error) {
    throw labelsResult.error;
  }

  if (cardLabelsResult.error) {
    throw cardLabelsResult.error;
  }

  if (commentsResult.error) {
    throw commentsResult.error;
  }

  if (attachmentsResult.error) {
    throw attachmentsResult.error;
  }

  const labels = (labelsResult.data ?? [])
    .filter((label) => label.local_id)
    .map((label) => ({
      id: label.local_id as string,
      boardId,
      title: label.title,
      color: label.color as Label["color"],
      createdAt: label.created_at,
      updatedAt: label.updated_at,
    }));

  const cardLabels = ((cardLabelsResult.data ?? []) as unknown as SupabaseCardLabelRelationRow[])
    .map((row) => {
      const card = firstRelation(row.cards);
      const label = firstRelation(row.labels);
      return {
        cardId: card?.local_id ?? null,
        labelId: label?.local_id ?? null,
      };
    })
    .filter(
      (row): row is { cardId: string; labelId: string } =>
        Boolean(row.cardId) && Boolean(row.labelId),
    );

  const comments = ((commentsResult.data ?? []) as unknown as SupabaseCommentRelationRow[])
    .map((comment) => {
      const card = firstRelation(comment.cards);
      if (!comment.local_id || !card?.local_id) {
        return null;
      }

      return {
        id: comment.local_id,
        boardId,
        cardId: card.local_id,
        authorId: "",
        content: comment.content,
        createdAt: comment.created_at,
      };
    })
    .filter((comment): comment is Comment => Boolean(comment));

  const attachments = ((attachmentsResult.data ?? []) as unknown as SupabaseAttachmentRelationRow[])
    .map((attachment) => {
      const card = firstRelation(attachment.cards);
      if (!attachment.local_id || !card?.local_id) {
        return null;
      }

      return {
        cardId: card.local_id,
        attachment: {
          id: attachment.local_id,
          name: attachment.name,
          url: attachment.url,
          kind: attachment.kind,
        },
      };
    })
    .filter(
      (attachment): attachment is { cardId: string; attachment: Attachment } =>
        Boolean(attachment),
    );

  return {
    labels,
    cardLabels,
    comments,
    attachments,
  };
}

export async function fetchSupabaseBoardSnapshot(baseSnapshot: BoardStoreSnapshot) {
  const client = getClient();
  if (!client) {
    return null;
  }

  const workspaces = await fetchSupabaseWorkspaces();
  if (workspaces.length === 0) {
    return null;
  }

  const workspaceIds = workspaces.map((workspace) => workspace.id);
  const [listsResult, foldersResult, labelsResult, cardsResult] = await Promise.all([
    client
      .from("lists")
      .select("id, local_id, workspace_id, title, position, color, archived, created_at, updated_at")
      .in("workspace_id", workspaceIds)
      .order("position", { ascending: true }),
    client
      .from("delivered_folders")
      .select("id, local_id, workspace_id, name, color, created_at, updated_at")
      .in("workspace_id", workspaceIds)
      .order("created_at", { ascending: true }),
    client
      .from("labels")
      .select("id, local_id, workspace_id, title, color, created_at, updated_at")
      .in("workspace_id", workspaceIds)
      .order("title", { ascending: true }),
    client
      .from("cards")
      .select("id, local_id, workspace_id, list_id, delivered_folder_id, title, description, cover, project_summary, custom_fields, dates, completed, archived, position, created_at, updated_at")
      .in("workspace_id", workspaceIds)
      .order("position", { ascending: true }),
  ]);

  if (listsResult.error) {
    throw listsResult.error;
  }
  if (foldersResult.error) {
    throw foldersResult.error;
  }
  if (labelsResult.error) {
    throw labelsResult.error;
  }
  if (cardsResult.error) {
    throw cardsResult.error;
  }

  const remoteLists = (listsResult.data ?? []) as unknown as SupabaseListRow[];
  const remoteFolders = (foldersResult.data ?? []) as unknown as SupabaseDeliveredFolderRow[];
  const remoteLabels = (labelsResult.data ?? []) as unknown as SupabaseLabelRow[];
  const remoteCards = (cardsResult.data ?? []) as unknown as SupabaseCardRow[];
  const remoteCardIds = remoteCards.map((card) => card.id);

  const [commentsResult, attachmentsResult, cardLabelsResult] =
    remoteCardIds.length > 0
      ? await Promise.all([
          client
            .from("comments")
            .select("local_id, workspace_id, card_id, content, created_at")
            .in("card_id", remoteCardIds)
            .order("created_at", { ascending: true }),
          client
            .from("attachments")
            .select("local_id, workspace_id, card_id, name, url, kind")
            .in("card_id", remoteCardIds)
            .order("created_at", { ascending: true }),
          client.from("card_labels").select("card_id, label_id").in("card_id", remoteCardIds),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
        ];

  if (commentsResult.error) {
    throw commentsResult.error;
  }
  if (attachmentsResult.error) {
    throw attachmentsResult.error;
  }
  if (cardLabelsResult.error) {
    throw cardLabelsResult.error;
  }

  const remoteComments = (commentsResult.data ?? []) as unknown as SupabaseCommentRow[];
  const remoteAttachments = (attachmentsResult.data ?? []) as unknown as SupabaseAttachmentRow[];
  const remoteCardLabels = (cardLabelsResult.data ?? []) as unknown as SupabaseCardLabelRow[];
  const { data: workspaceAccessData, error: workspaceAccessError } = await client
    .from("workspace_access")
    .select("id, profile_id, board_role, panel, created_at, updated_at, workspaces!inner(local_id)")
    .in("workspace_id", workspaceIds);

  if (workspaceAccessError) {
    throw workspaceAccessError;
  }

  const visibleWorkspaceAccess =
    (workspaceAccessData ?? []) as unknown as SupabaseWorkspaceAccessRelationRow[];
  const visibleProfileIds = Array.from(
    new Set(visibleWorkspaceAccess.map((access) => access.profile_id).filter(Boolean)),
  );
  const { data: visibleProfilesData, error: visibleProfilesError } =
    visibleProfileIds.length > 0
      ? await client
          .from("profiles")
          .select("id, email, full_name, avatar_url, kind, status, company, title, created_at, updated_at")
          .in("id", visibleProfileIds)
      : { data: [], error: null };

  if (visibleProfilesError) {
    throw visibleProfilesError;
  }

  const visibleProfiles = (visibleProfilesData ?? []) as SupabaseVisibleProfileRow[];

  const workspaceLocalIdByRemoteId = new Map(
    workspaces.map((workspace) => [workspace.id, workspace.local_id ?? workspace.id]),
  );
  const listLocalIdByRemoteId = new Map(
    remoteLists.map((list) => [list.id, list.local_id ?? list.id]),
  );
  const folderLocalIdByRemoteId = new Map(
    remoteFolders.map((folder) => [folder.id, folder.local_id ?? folder.id]),
  );
  const cardLocalIdByRemoteId = new Map(
    remoteCards.map((card) => [card.id, card.local_id ?? card.id]),
  );
  const labelLocalIdByRemoteId = new Map(
    remoteLabels.map((label) => [label.id, label.local_id ?? label.id]),
  );
  const labelsByRemoteCardId = remoteCardLabels.reduce<Record<string, string[]>>((acc, row) => {
    const labelId = labelLocalIdByRemoteId.get(row.label_id);
    if (!labelId) {
      return acc;
    }

    acc[row.card_id] = [...(acc[row.card_id] ?? []), labelId];
    return acc;
  }, {});
  const attachmentsByRemoteCardId = remoteAttachments.reduce<Record<string, Attachment[]>>(
    (acc, attachment) => {
      const attachmentId = attachment.local_id ?? `attachment-${attachment.card_id}-${attachment.name}`;
      acc[attachment.card_id] = [
        ...(acc[attachment.card_id] ?? []),
        {
          id: attachmentId,
          name: attachment.name,
          url: attachment.url,
          kind: attachment.kind,
        },
      ];
      return acc;
    },
    {},
  );

  const next: BoardStoreSnapshot = {
    version: 3,
    boards: {},
    lists: {},
    cards: {},
    labels: {},
    comments: {},
    members: { ...baseSnapshot.members },
    activity: {},
    filters: {},
    adminUsers: { ...baseSnapshot.adminUsers },
    workspaceAccess: { ...baseSnapshot.workspaceAccess },
    adminActivity: { ...baseSnapshot.adminActivity },
  };

  const visibleProfileById = new Map(visibleProfiles.map((profile) => [profile.id, profile]));
  const localAdminIdByEmail = new Map(
    Object.values(baseSnapshot.adminUsers).map((user) => [normalizeEmail(user.email), user.id]),
  );

  visibleProfiles.forEach((profile) => {
    const normalizedEmail = normalizeEmail(profile.email);
    const localUserId = localAdminIdByEmail.get(normalizedEmail);
    const shouldReplaceLocalPlaceholder =
      Boolean(localUserId) &&
      localUserId !== profile.id &&
      normalizedEmail !== "erickfilho281@gmail.com" &&
      profile.kind !== "admin";

    if (shouldReplaceLocalPlaceholder && localUserId) {
      delete next.adminUsers[localUserId];
    }

    next.adminUsers[profile.id] = {
      id: profile.id,
      name: profile.full_name?.trim() || profile.email.split("@")[0] || "Painel Haki",
      email: normalizedEmail,
      avatarUrl: profile.avatar_url ?? undefined,
      kind: profile.kind,
      status: profile.status,
      company: profile.company ?? undefined,
      title: profile.title ?? undefined,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };
  });

  visibleWorkspaceAccess.forEach((access) => {
    const workspace = firstRelation(access.workspaces);
    const boardId = workspace?.local_id;
    const profile = visibleProfileById.get(access.profile_id);

    if (!boardId) {
      return;
    }

    if (profile) {
      const localUserId = localAdminIdByEmail.get(normalizeEmail(profile.email));
      const shouldReplaceLocalPlaceholder =
        Boolean(localUserId) &&
        localUserId !== profile.id &&
        normalizeEmail(profile.email) !== "erickfilho281@gmail.com" &&
        profile.kind !== "admin";

      if (shouldReplaceLocalPlaceholder && localUserId) {
        Object.keys(next.workspaceAccess).forEach((accessId) => {
          const localAccess = next.workspaceAccess[accessId];
          if (localAccess?.userId === localUserId && localAccess.boardId === boardId) {
            delete next.workspaceAccess[accessId];
          }
        });
      }
    }

    next.workspaceAccess[access.id] = {
      id: access.id,
      userId: access.profile_id,
      boardId,
      boardRole: access.board_role,
      panel: access.panel,
      createdAt: access.created_at,
      updatedAt: access.updated_at,
    };
  });

  workspaces.forEach((workspace) => {
    const boardId = workspace.local_id ?? workspace.id;
    const currentBoard = baseSnapshot.boards[boardId];
    const boardAccess = Object.values(next.workspaceAccess).filter((access) => access.boardId === boardId);
    const boardMemberIds =
      boardAccess.length > 0
        ? boardAccess.map((access) => `member-${access.userId}`)
        : (currentBoard?.members ?? Object.keys(next.members).slice(0, 2));
    next.boards[boardId] = {
      id: boardId,
      title: workspace.title,
      clientName: workspace.client_name,
      description: workspace.description ?? "",
      accent: workspace.accent ?? undefined,
      shareLink: workspace.share_link ?? "",
      members: boardMemberIds,
      joinRequestIds: currentBoard?.joinRequestIds ?? [],
      templates: currentBoard?.templates ?? [],
      deliveredFolders: remoteFolders
        .filter((folder) => folder.workspace_id === workspace.id)
        .map((folder) => ({
          id: folder.local_id ?? folder.id,
          boardId,
          name: folder.name,
          color: folder.color,
          createdAt: folder.created_at,
          updatedAt: folder.updated_at,
        })),
      createdAt: workspace.created_at,
      updatedAt: workspace.updated_at,
    };
    next.filters[boardId] = {
      ...DEFAULT_FILTERS,
      ...(baseSnapshot.filters[boardId] ?? {}),
    };
  });

  visibleWorkspaceAccess.forEach((access) => {
    const workspace = firstRelation(access.workspaces);
    const boardId = workspace?.local_id;
    const profile = visibleProfileById.get(access.profile_id);
    if (!boardId || !profile) {
      return;
    }

    const memberId = `member-${profile.id}`;
    next.members[memberId] = {
      id: memberId,
      name: profile.full_name?.trim() || profile.email.split("@")[0] || "Painel Haki",
      email: normalizeEmail(profile.email),
      avatarUrl: profile.avatar_url ?? undefined,
      role: access.board_role,
      handle: `@${normalizeEmail(profile.email).split("@")[0].replace(/[^a-z0-9._-]/gi, "")}`,
      initials: initialsFromName(profile.full_name?.trim() || profile.email.split("@")[0] || "PH"),
    };

    const board = next.boards[boardId];
    if (board && !board.members.includes(memberId)) {
      board.members = [...board.members, memberId];
    }
  });

  remoteFolders.forEach((folder) => {
    const boardId = workspaceLocalIdByRemoteId.get(folder.workspace_id);
    if (!boardId) {
      return;
    }

    const board = next.boards[boardId];
    if (!board.deliveredFolders?.some((item) => item.id === (folder.local_id ?? folder.id))) {
      board.deliveredFolders = [
        ...(board.deliveredFolders ?? []),
        {
          id: folder.local_id ?? folder.id,
          boardId,
          name: folder.name,
          color: folder.color,
          createdAt: folder.created_at,
          updatedAt: folder.updated_at,
        },
      ];
    }
  });

  remoteLists.forEach((list) => {
    const boardId = workspaceLocalIdByRemoteId.get(list.workspace_id);
    if (!boardId) {
      return;
    }

    const listId = list.local_id ?? list.id;
    next.lists[listId] = {
      id: listId,
      boardId,
      title: list.title,
      order: list.position,
      color: list.color ?? null,
      archived: list.archived,
      following: baseSnapshot.lists[listId]?.following ?? false,
      createdAt: list.created_at,
      updatedAt: list.updated_at,
    };
  });

  remoteLabels.forEach((label) => {
    const boardId = workspaceLocalIdByRemoteId.get(label.workspace_id);
    if (!boardId) {
      return;
    }

    const labelId = label.local_id ?? label.id;
    next.labels[labelId] = {
      id: labelId,
      boardId,
      title: label.title,
      color: label.color,
      createdAt: label.created_at,
      updatedAt: label.updated_at,
    };
  });

  remoteCards.forEach((card) => {
    const boardId = workspaceLocalIdByRemoteId.get(card.workspace_id);
    const listId = listLocalIdByRemoteId.get(card.list_id);
    if (!boardId || !listId) {
      return;
    }

    const cardId = card.local_id ?? card.id;
    const dates = card.dates ?? {};
    next.cards[cardId] = {
      id: cardId,
      boardId,
      listId,
      title: card.title,
      description: card.description ?? "",
      labelIds: labelsByRemoteCardId[card.id] ?? [],
      memberIds: baseSnapshot.cards[cardId]?.memberIds ?? ["member-erick"],
      checklistIds: baseSnapshot.cards[cardId]?.checklistIds ?? [],
      checklists: baseSnapshot.cards[cardId]?.checklists ?? [],
      attachments: attachmentsByRemoteCardId[card.id] ?? [],
      customFields: card.custom_fields ?? [],
      cover: card.cover ?? undefined,
      projectSummary: card.project_summary ?? undefined,
      deliveredFolderId: card.delivered_folder_id
        ? folderLocalIdByRemoteId.get(card.delivered_folder_id)
        : undefined,
      location: baseSnapshot.cards[cardId]?.location ?? "",
      dueDate: dates.dueDate ?? undefined,
      startDate: dates.startDate ?? undefined,
      recurring: dates.recurring ?? "Nunca",
      reminder: dates.reminder ?? "1 dia antes",
      completed: card.completed,
      archived: card.archived,
      order: card.position,
      createdAt: card.created_at,
      updatedAt: card.updated_at,
    };
  });

  remoteComments.forEach((comment) => {
    const boardId = workspaceLocalIdByRemoteId.get(comment.workspace_id);
    const cardId = cardLocalIdByRemoteId.get(comment.card_id);
    if (!boardId || !cardId) {
      return;
    }

    const commentId = comment.local_id ?? `comment-${comment.card_id}-${comment.created_at}`;
    next.comments[commentId] = {
      id: commentId,
      boardId,
      cardId,
      authorId: baseSnapshot.comments[commentId]?.authorId ?? "member-erick",
      content: comment.content,
      createdAt: comment.created_at,
    };
  });

  return next;
}
