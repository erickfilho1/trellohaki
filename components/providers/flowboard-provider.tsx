"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  addBoardToSnapshot,
  addCardToSnapshot,
  addListToSnapshot,
  archiveListInSnapshot,
  clearFiltersInSnapshot,
  countActiveFilters,
  createWorkspaceInSnapshot,
  duplicateWorkspaceInSnapshot,
  deleteWorkspaceInSnapshot,
  deleteAdminUserInSnapshot,
  deleteCardInSnapshot,
  duplicateCardInSnapshot,
  duplicateListInSnapshot,
  getInitialSnapshotFromStorage,
  grantWorkspaceAccessInSnapshot,
  selectAdminActivity,
  selectAdminUsers,
  moveCardInSnapshot,
  moveListInSnapshot,
  removeBoardLabelInSnapshot,
  saveCardTemplateInSnapshot,
  selectBoardStats,
  selectBoardViews,
  selectWorkspaceAccess,
  upsertAdminUserInSnapshot,
  revokeWorkspaceAccessInSnapshot,
  renameDeliveredFolderInSnapshot,
  updateBoardInSnapshot,
  updateCardInSnapshot,
  updateFiltersInSnapshot,
  updateListInSnapshot,
  upsertBoardLabelInSnapshot,
  deleteDeliveredFolderInSnapshot,
} from "@/store/board-store";
import type { BoardStoreSnapshot } from "@/types/board";
import {
  fetchSupabaseBoardSnapshot,
  syncSupabaseBoardContent,
} from "@/lib/supabase/board-content";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  deleteSupabaseWorkspaceByLocalId,
  upsertSupabaseWorkspaceFromBoardEntity,
} from "@/lib/supabase/workspaces";
import { buildNotificationsFromBoards } from "@/lib/notifications";
import type {
  BoardFiltersRecord,
  BoardRecord,
  CardRecord,
  FlowBoardContextValue,
  LabelRecord,
  ListRecord,
  NewCardPayload,
} from "@/lib/flowboard-types";

const STORAGE_KEY = "flowboard-local-state";
const NOTIFICATION_READS_KEY = "flowboard-notification-reads";

const FlowBoardContext = createContext<FlowBoardContextValue | null>(null);

function getInitialSnapshot() {
  if (typeof window === "undefined") {
    return getInitialSnapshotFromStorage(null);
  }

  return getInitialSnapshotFromStorage(window.localStorage.getItem(STORAGE_KEY));
}

function getInitialNotificationReads() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  const raw = window.localStorage.getItem(NOTIFICATION_READS_KEY);
  if (!raw) {
    return [] as string[];
  }

  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function newestBoardId(snapshot: BoardStoreSnapshot) {
  return Object.values(snapshot.boards).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    ?.id;
}

export function FlowBoardProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [snapshot, setSnapshot] = useState<BoardStoreSnapshot>(getInitialSnapshot);
  const [notificationReadIds, setNotificationReadIds] = useState<string[]>(getInitialNotificationReads);
  const [hydrated, setHydrated] = useState(false);
  const [workspaceSyncTick, setWorkspaceSyncTick] = useState(0);
  const [boardContentSyncTick, setBoardContentSyncTick] = useState(0);
  const snapshotRef = useRef(snapshot);
  const pendingWorkspaceSyncIds = useRef<Set<string>>(new Set());
  const pendingWorkspaceDeleteIds = useRef<Set<string>>(new Set());
  const pendingBoardContentSyncIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [hydrated, snapshot]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      NOTIFICATION_READS_KEY,
      JSON.stringify(Array.from(new Set(notificationReadIds))),
    );
  }, [notificationReadIds]);

  const hydrateFromSupabase = useCallback(async () => {
    try {
      const remoteSnapshot = await fetchSupabaseBoardSnapshot(snapshotRef.current);
      if (remoteSnapshot) {
        setSnapshot(remoteSnapshot);
      }
    } catch (error) {
      console.warn("Nao foi possivel carregar os dados do Supabase.", error);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    void hydrateFromSupabase();

    const client = getSupabaseBrowserClient();
    if (!client) {
      return;
    }

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        void hydrateFromSupabase();
      }

      if (event === "SIGNED_OUT") {
        setHydrated(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [hydrateFromSupabase]);

  const queueWorkspaceSync = useCallback((boardId?: string) => {
    if (!boardId) {
      return;
    }

    pendingWorkspaceSyncIds.current.add(boardId);
    setWorkspaceSyncTick((tick) => tick + 1);
  }, []);

  const queueWorkspaceDelete = useCallback((boardId: string) => {
    pendingWorkspaceDeleteIds.current.add(boardId);
    setWorkspaceSyncTick((tick) => tick + 1);
  }, []);

  const queueBoardContentSync = useCallback((boardId?: string) => {
    if (!boardId) {
      return;
    }

    pendingBoardContentSyncIds.current.add(boardId);
    setBoardContentSyncTick((tick) => tick + 1);
  }, []);

  useEffect(() => {
    const syncIds = Array.from(pendingWorkspaceSyncIds.current);
    const deleteIds = Array.from(pendingWorkspaceDeleteIds.current);

    if (syncIds.length === 0 && deleteIds.length === 0) {
      return;
    }

    pendingWorkspaceSyncIds.current.clear();
    pendingWorkspaceDeleteIds.current.clear();

    syncIds.forEach((boardId) => {
      const board = snapshot.boards[boardId];
      if (!board) {
        return;
      }

      void upsertSupabaseWorkspaceFromBoardEntity(board).catch((error) => {
        console.warn("Nao foi possivel sincronizar o workspace no Supabase.", error);
      });
    });

    deleteIds.forEach((boardId) => {
      void deleteSupabaseWorkspaceByLocalId(boardId).catch((error) => {
        console.warn("Nao foi possivel remover o workspace no Supabase.", error);
      });
    });
  }, [snapshot, workspaceSyncTick]);

  useEffect(() => {
    const boardIds = Array.from(pendingBoardContentSyncIds.current);
    if (boardIds.length === 0) {
      return;
    }

    pendingBoardContentSyncIds.current.clear();

    boardIds.forEach((boardId) => {
      void syncSupabaseBoardContent(snapshot, boardId).catch((error) => {
        console.warn("Nao foi possivel sincronizar listas/cards/pastas no Supabase.", error);
      });
    });
  }, [boardContentSyncTick, snapshot]);

  const boards = useMemo(() => selectBoardViews(snapshot), [snapshot]);
  const filters = useMemo(() => snapshot.filters, [snapshot]);
  const adminUsers = useMemo(() => selectAdminUsers(snapshot), [snapshot]);
  const workspaceAccess = useMemo(() => selectWorkspaceAccess(snapshot), [snapshot]);
  const adminActivity = useMemo(() => selectAdminActivity(snapshot), [snapshot]);
  const notifications = useMemo(
    () => buildNotificationsFromBoards(boards, notificationReadIds),
    [boards, notificationReadIds],
  );

  const addBoard = useCallback((payload: { name: string; description: string; accent: string }) => {
    const next = addBoardToSnapshot(snapshot, payload);
    setSnapshot(next);
    const boardId = newestBoardId(next);
    queueWorkspaceSync(boardId);
    queueBoardContentSync(boardId);
  }, [queueBoardContentSync, queueWorkspaceSync, snapshot]);

  const createWorkspace = useCallback(
    (payload: {
      name: string;
      description: string;
      accent: string;
      clientName?: string;
      userIds?: string[];
    }) => {
      const next = createWorkspaceInSnapshot(snapshot, payload);
      setSnapshot(next);
      const boardId = newestBoardId(next);
      queueWorkspaceSync(boardId);
      queueBoardContentSync(boardId);
    },
    [queueBoardContentSync, queueWorkspaceSync, snapshot],
  );

  const addList = useCallback((boardId: string, title: string) => {
    setSnapshot((current) => addListToSnapshot(current, boardId, title));
    queueBoardContentSync(boardId);
  }, [queueBoardContentSync]);

  const duplicateWorkspace = useCallback(
    (payload: {
      sourceBoardId: string;
      name: string;
      description?: string;
    }) => {
      const next = duplicateWorkspaceInSnapshot(snapshot, payload);
      setSnapshot(next);
      const boardId = newestBoardId(next);
      queueWorkspaceSync(boardId);
      queueBoardContentSync(boardId);
    },
    [queueBoardContentSync, queueWorkspaceSync, snapshot],
  );

  const addCard = useCallback((boardId: string, listId: string, payload: NewCardPayload) => {
    setSnapshot((current) => addCardToSnapshot(current, boardId, listId, payload));
    queueBoardContentSync(boardId);
  }, [queueBoardContentSync]);

  const updateCard = useCallback(
    (
      boardId: string,
      listId: string,
      cardId: string,
      updates: Partial<CardRecord>,
      activityText?: string,
    ) => {
      setSnapshot((current) =>
        updateCardInSnapshot(current, boardId, listId, cardId, updates, activityText),
      );
      queueBoardContentSync(boardId);
    },
    [queueBoardContentSync],
  );

  const moveCard = useCallback(
    (
      boardId: string,
      sourceListId: string,
      targetListId: string,
      cardId: string,
      targetCardId?: string,
    ) => {
      setSnapshot((current) =>
        moveCardInSnapshot(current, boardId, sourceListId, targetListId, cardId, targetCardId),
      );
      queueBoardContentSync(boardId);
    },
    [queueBoardContentSync],
  );

  const duplicateCard = useCallback((boardId: string, listId: string, cardId: string) => {
    setSnapshot((current) => duplicateCardInSnapshot(current, boardId, listId, cardId));
    queueBoardContentSync(boardId);
  }, [queueBoardContentSync]);

  const deleteCard = useCallback((boardId: string, listId: string, cardId: string) => {
    setSnapshot((current) => deleteCardInSnapshot(current, boardId, listId, cardId));
    queueBoardContentSync(boardId);
  }, [queueBoardContentSync]);

  const saveCardTemplate = useCallback((boardId: string, listId: string, cardId: string) => {
    setSnapshot((current) => saveCardTemplateInSnapshot(current, boardId, listId, cardId));
  }, []);

  const updateBoard = useCallback((boardId: string, updates: Partial<BoardRecord>) => {
    const next = updateBoardInSnapshot(snapshot, boardId, updates);
    setSnapshot(next);
    queueWorkspaceSync(boardId);
    queueBoardContentSync(boardId);
  }, [queueBoardContentSync, queueWorkspaceSync, snapshot]);

  const updateList = useCallback((boardId: string, listId: string, updates: Partial<ListRecord>) => {
    setSnapshot((current) => updateListInSnapshot(current, boardId, listId, updates));
    queueBoardContentSync(boardId);
  }, [queueBoardContentSync]);

  const duplicateList = useCallback((boardId: string, listId: string) => {
    setSnapshot((current) => duplicateListInSnapshot(current, boardId, listId));
    queueBoardContentSync(boardId);
  }, [queueBoardContentSync]);

  const moveList = useCallback((boardId: string, listId: string, direction: "left" | "right") => {
    setSnapshot((current) => moveListInSnapshot(current, boardId, listId, direction));
    queueBoardContentSync(boardId);
  }, [queueBoardContentSync]);

  const archiveList = useCallback((boardId: string, listId: string) => {
    setSnapshot((current) => archiveListInSnapshot(current, boardId, listId));
    queueBoardContentSync(boardId);
  }, [queueBoardContentSync]);

  const upsertBoardLabel = useCallback((boardId: string, label: LabelRecord) => {
    setSnapshot((current) => upsertBoardLabelInSnapshot(current, boardId, label));
  }, []);

  const removeBoardLabel = useCallback((boardId: string, labelId: string) => {
    setSnapshot((current) => removeBoardLabelInSnapshot(current, boardId, labelId));
  }, []);

  const updateFilters = useCallback((boardId: string, updates: Partial<BoardFiltersRecord>) => {
    setSnapshot((current) => updateFiltersInSnapshot(current, boardId, updates));
  }, []);

  const clearFilters = useCallback((boardId: string) => {
    setSnapshot((current) => clearFiltersInSnapshot(current, boardId));
  }, []);

  const upsertAdminUser = useCallback(
    (payload: {
      id?: string;
      name: string;
      email: string;
      kind: "admin" | "cliente" | "colaborador";
      status?: "ativo" | "pendente" | "desativado";
      company?: string;
      title?: string;
    }) => {
      setSnapshot((current) => upsertAdminUserInSnapshot(current, payload));
    },
    [],
  );

  const deleteAdminUser = useCallback((userId: string) => {
    setSnapshot((current) => deleteAdminUserInSnapshot(current, userId));
  }, []);

  const deleteWorkspace = useCallback((boardId: string) => {
    setSnapshot(deleteWorkspaceInSnapshot(snapshot, boardId));
    queueWorkspaceDelete(boardId);
  }, [queueWorkspaceDelete, snapshot]);

  const grantWorkspaceAccess = useCallback(
    (payload: {
      userId: string;
      boardId: string;
      boardRole: "Membro" | "Observador" | "Administrador";
      panel?: "admin" | "cliente" | "colaborador";
    }) => {
      setSnapshot((current) => grantWorkspaceAccessInSnapshot(current, payload));
    },
    [],
  );

  const revokeWorkspaceAccess = useCallback((accessId: string) => {
    setSnapshot((current) => revokeWorkspaceAccessInSnapshot(current, accessId));
  }, []);

  const renameDeliveredFolder = useCallback((boardId: string, folderId: string, name: string) => {
    setSnapshot((current) => renameDeliveredFolderInSnapshot(current, boardId, folderId, name));
    queueBoardContentSync(boardId);
  }, [queueBoardContentSync]);

  const deleteDeliveredFolder = useCallback((boardId: string, folderId: string) => {
    setSnapshot((current) => deleteDeliveredFolderInSnapshot(current, boardId, folderId));
    queueBoardContentSync(boardId);
  }, [queueBoardContentSync]);

  const markNotificationRead = useCallback((notificationId: string) => {
    setNotificationReadIds((current) =>
      current.includes(notificationId) ? current : [...current, notificationId],
    );
  }, []);

  const markNotificationsRead = useCallback((notificationIds: string[]) => {
    if (notificationIds.length === 0) {
      return;
    }

    setNotificationReadIds((current) => {
      const next = new Set(current);
      notificationIds.forEach((notificationId) => next.add(notificationId));
      return Array.from(next);
    });
  }, []);

  const getBoardStats = useCallback(
    (boardId: string) => ({
      ...selectBoardStats(snapshot, boardId),
      activeFilterCount: countActiveFilters(snapshot.filters[boardId]),
    }),
    [snapshot],
  );

  const value = useMemo<FlowBoardContextValue>(
    () => ({
      boards,
      hydrated,
      filters,
      notifications,
      adminUsers,
      workspaceAccess,
      adminActivity,
      addBoard,
      createWorkspace,
      duplicateWorkspace,
      addList,
      addCard,
      updateCard,
      moveCard,
      duplicateCard,
      deleteCard,
      saveCardTemplate,
      updateBoard,
      updateList,
      duplicateList,
      moveList,
      archiveList,
      upsertBoardLabel,
      removeBoardLabel,
      updateFilters,
      clearFilters,
      upsertAdminUser,
      deleteAdminUser,
      deleteWorkspace,
      grantWorkspaceAccess,
      revokeWorkspaceAccess,
      renameDeliveredFolder,
      deleteDeliveredFolder,
      markNotificationRead,
      markNotificationsRead,
      getBoardStats,
    }),
    [
      addBoard,
      adminActivity,
      adminUsers,
      addCard,
      addList,
      archiveList,
      boards,
      clearFilters,
      createWorkspace,
      duplicateWorkspace,
      deleteAdminUser,
      deleteWorkspace,
      duplicateList,
      duplicateCard,
      deleteCard,
      deleteDeliveredFolder,
      filters,
      notifications,
      getBoardStats,
      grantWorkspaceAccess,
      hydrated,
      markNotificationRead,
      markNotificationsRead,
      moveCard,
      moveList,
      removeBoardLabel,
      revokeWorkspaceAccess,
      renameDeliveredFolder,
      saveCardTemplate,
      workspaceAccess,
      upsertAdminUser,
      updateBoard,
      updateCard,
      updateFilters,
      updateList,
      upsertBoardLabel,
    ],
  );

  return <FlowBoardContext.Provider value={value}>{children}</FlowBoardContext.Provider>;
}

export function useFlowBoardStore() {
  const context = useContext(FlowBoardContext);

  if (!context) {
    throw new Error("useFlowBoardStore must be used within FlowBoardProvider.");
  }

  return context;
}
