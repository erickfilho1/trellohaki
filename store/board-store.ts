import { DEFAULT_BOARD_MEMBERS, DEFAULT_JOIN_REQUESTS } from "@/lib/flowboard-constants";
import {
  createId,
  createLabel,
  initialsFromName,
  stripHtml,
} from "@/lib/flowboard-helpers";
import { createInitialBoards, normalizeBoardState } from "@/lib/flowboard-data";
import type {
  ActivityRecord,
  BoardRecord,
  CardRecord,
  ChecklistRecord,
  CommentRecord,
  LabelRecord,
  ListRecord,
  MemberRecord,
  NewCardPayload,
} from "@/lib/flowboard-types";
import type {
  AdminActivity,
  AdminActivityType,
  AdminUser,
  AdminUserKind,
  Activity,
  ActivityRange,
  ActivityType,
  BoardStoreSnapshot,
  BoardRole,
  Card,
  CardTemplate,
  Comment,
  Filters,
  Label,
  Member,
  WorkspaceAccess,
  WorkspacePanel,
} from "@/types/board";

const CURRENT_USER_ID = "member-erick";
const CURRENT_ADMIN_USER_ID = "admin-erick";
const DEFAULT_BOARD_ACCENT = "from-[#1d7185] via-[#3a2857] to-[#6f365d]";

type AdminUserInput = {
  id?: string;
  name: string;
  email: string;
  kind: AdminUserKind;
  status?: AdminUser["status"];
  company?: string;
  title?: string;
};

type WorkspaceCreateInput = {
  name: string;
  description: string;
  accent: string;
  clientName?: string;
  userIds?: string[];
};

type WorkspaceDuplicateInput = {
  sourceBoardId: string;
  name: string;
  description?: string;
};

type WorkspaceAccessInput = {
  userId: string;
  boardId: string;
  boardRole: BoardRole;
  panel?: WorkspacePanel;
};

export const DEFAULT_FILTERS: Filters = {
  keyword: "",
  memberIds: [],
  assignedToMe: false,
  noMembers: false,
  completed: false,
  notCompleted: false,
  noDueDate: false,
  overdue: false,
  dueToday: false,
  dueTomorrow: false,
  dueThisWeek: false,
  dueThisMonth: false,
  labelIds: [],
  noLabels: false,
  activityRange: null,
};

// Future Supabase mapping:
// boards, lists, cards, labels, comments, members and activity become first-class tables.
// The snapshot actions below are intentionally shaped like future mutations so the UI layer can stay stable.

function nowIso() {
  return new Date().toISOString();
}

function deriveAdminKind(member: Member): AdminUserKind {
  if (member.id === CURRENT_USER_ID || member.role === "Administrador") {
    return "admin";
  }

  const identity = `${member.name} ${member.handle}`.toLowerCase();
  if (identity.includes("cliente") || identity.includes("vibefor")) {
    return "cliente";
  }

  return "colaborador";
}

function derivePanelFromKind(kind: AdminUserKind): WorkspacePanel {
  if (kind === "admin") {
    return "admin";
  }

  return kind === "cliente" ? "cliente" : "colaborador";
}

function toAdminUserId(memberId: string) {
  return `admin-${memberId.replace(/^member-/, "")}`;
}

function toMemberIdFromAdmin(userId: string) {
  if (userId === CURRENT_ADMIN_USER_ID) {
    return CURRENT_USER_ID;
  }

  return userId.startsWith("admin-")
    ? `member-${userId.replace(/^admin-/, "")}`
    : `member-${userId}`;
}

function ensureMemberForAdminUser(snapshot: BoardStoreSnapshot, user: AdminUser, role: BoardRole) {
  const memberId = toMemberIdFromAdmin(user.id);
  snapshot.members[memberId] = {
    id: memberId,
    name: user.id === CURRENT_ADMIN_USER_ID ? `${user.name} (voce)` : user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role,
    handle: `@${user.email.split("@")[0].replace(/[^a-z0-9._-]/gi, "").toLowerCase()}`,
    initials: initialsFromName(user.name),
  };
  return memberId;
}

function addAdminActivityEntity(
  snapshot: BoardStoreSnapshot,
  type: AdminActivityType,
  message: string,
  options?: { boardId?: string; userId?: string; actorId?: string },
) {
  const activityId = createId("admin-activity");
  snapshot.adminActivity[activityId] = {
    id: activityId,
    type,
    boardId: options?.boardId,
    userId: options?.userId,
    actorId: options?.actorId ?? CURRENT_ADMIN_USER_ID,
    message,
    createdAt: nowIso(),
  };
}

function cloneFilters(filters?: Partial<Filters>): Filters {
  return {
    ...DEFAULT_FILTERS,
    ...filters,
    memberIds: [...(filters?.memberIds ?? [])],
    labelIds: [...(filters?.labelIds ?? [])],
  };
}

function asMemberRecord(member: Member): MemberRecord {
  return {
    id: member.id,
    name: member.name,
    handle: member.handle,
    role: member.role,
    avatar: member.avatarUrl,
    initials: member.initials,
  };
}

function asLabelRecord(label: Label): LabelRecord {
  return {
    id: label.id,
    name: label.title,
    tone: label.color,
  };
}

function asCommentRecord(comment: Comment, members: Record<string, Member>): CommentRecord {
  const author = members[comment.authorId] ?? members[CURRENT_USER_ID] ?? toMemberEntity(DEFAULT_BOARD_MEMBERS[0]);
  return {
    id: comment.id,
    author: asMemberRecord(author),
    createdAt: comment.createdAt,
    text: comment.content,
  };
}

function asActivityRecord(activity: Activity): ActivityRecord {
  return {
    id: activity.id,
    createdAt: activity.createdAt,
    text: activity.message,
  };
}

function toMemberEntity(member: MemberRecord): Member {
  return {
    id: member.id,
    name: member.name,
    email: `${member.handle.replace("@", "")}@clientboard.local`,
    avatarUrl: member.avatar,
    role: member.role,
    handle: member.handle,
    initials: member.initials || initialsFromName(member.name),
  };
}

function createAdminUserFromMember(member: Member, company?: string): AdminUser {
  const kind = deriveAdminKind(member);
  return {
    id: kind === "admin" && member.id === CURRENT_USER_ID ? CURRENT_ADMIN_USER_ID : toAdminUserId(member.id),
    name: member.name.replace(" (voce)", ""),
    email:
      member.email ||
      `${member.handle.replace("@", "").replace(/[^a-z0-9._-]/gi, "").toLowerCase()}@clientboard.local`,
    avatarUrl: member.avatarUrl,
    kind,
    status: kind === "cliente" ? "ativo" : "ativo",
    company,
    title:
      kind === "cliente"
        ? "Contato do cliente"
        : kind === "admin"
          ? "Administrador principal"
          : member.role,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function createWorkspaceAccessEntity(
  userId: string,
  boardId: string,
  boardRole: BoardRole,
  panel: WorkspacePanel,
): WorkspaceAccess {
  const timestamp = nowIso();
  return {
    id: createId("workspace-access"),
    userId,
    boardId,
    boardRole,
    panel,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function bootstrapAdminState(snapshot: BoardStoreSnapshot) {
  const adminUsers: Record<string, AdminUser> = snapshot.adminUsers ?? {};
  const workspaceAccess: Record<string, WorkspaceAccess> = snapshot.workspaceAccess ?? {};
  const adminActivity: Record<string, AdminActivity> = snapshot.adminActivity ?? {};

  Object.values(snapshot.boards).forEach((board) => {
    board.members.forEach((memberId) => {
      const member = snapshot.members[memberId];
      if (!member) {
        return;
      }

      const user = createAdminUserFromMember(member, board.clientName);
      if (!adminUsers[user.id]) {
        adminUsers[user.id] = user;
      }

      const existingAccess = Object.values(workspaceAccess).find(
        (access) => access.userId === user.id && access.boardId === board.id,
      );

      if (!existingAccess) {
        workspaceAccess[createId("workspace-access")] = {
          ...createWorkspaceAccessEntity(
            user.id,
            board.id,
            member.role,
            derivePanelFromKind(user.kind),
          ),
        };
      }
    });
  });

  if (!adminUsers[CURRENT_ADMIN_USER_ID]) {
    adminUsers[CURRENT_ADMIN_USER_ID] = {
      id: CURRENT_ADMIN_USER_ID,
      name: "Erick Filho",
      email: "erickfilho281@gmail.com",
      kind: "admin",
      status: "ativo",
      company: "Agencia Vibefor",
      title: "Administrador principal",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  }

  snapshot.adminUsers = adminUsers;
  snapshot.workspaceAccess = workspaceAccess;
  snapshot.adminActivity = adminActivity;
}

function addActivityEntity(
  snapshot: BoardStoreSnapshot,
  boardId: string,
  message: string,
  type: ActivityType,
  cardId?: string,
  actorId = CURRENT_USER_ID,
) {
  const activityId = createId("activity");
  snapshot.activity[activityId] = {
    id: activityId,
    boardId,
    cardId,
    actorId,
    type,
    message,
    createdAt: nowIso(),
  };
}

function getBoardLists(snapshot: BoardStoreSnapshot, boardId: string) {
  return Object.values(snapshot.lists)
    .filter((list) => list.boardId === boardId && !list.archived)
    .sort((a, b) => a.order - b.order);
}

function getListCards(snapshot: BoardStoreSnapshot, listId: string) {
  return Object.values(snapshot.cards)
    .filter((card) => card.listId === listId && !card.archived)
    .sort((a, b) => a.order - b.order);
}

function getCardComments(snapshot: BoardStoreSnapshot, cardId: string) {
  return Object.values(snapshot.comments)
    .filter((comment) => comment.cardId === cardId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function getCardActivity(snapshot: BoardStoreSnapshot, cardId: string) {
  return Object.values(snapshot.activity)
    .filter((activity) => activity.cardId === cardId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function ensureBoardFilters(snapshot: BoardStoreSnapshot, boardId: string) {
  if (!snapshot.filters[boardId]) {
    snapshot.filters[boardId] = cloneFilters();
  }
}

function normalizeChecklistCompletion(checklists: ChecklistRecord[]) {
  const items = checklists.flatMap((checklist) => checklist.items);
  return items.length > 0 && items.every((item) => item.completed);
}

function cloneProjectSummary<T extends { sections: Record<string, { fields: Array<Record<string, unknown>> }> } | undefined>(
  summary: T,
): T {
  if (!summary) {
    return summary;
  }

  return {
    ...summary,
    sections: Object.fromEntries(
      Object.entries(summary.sections).map(([key, section]) => [
        key,
        {
          ...section,
          fields: section.fields.map((field) => ({
            ...field,
            media: Array.isArray(field.media)
              ? field.media.map((item) => ({ ...item }))
              : field.media,
          })),
        },
      ]),
    ),
  } as T;
}

function resetCommentCollection(snapshot: BoardStoreSnapshot, cardId: string) {
  Object.keys(snapshot.comments).forEach((commentId) => {
    if (snapshot.comments[commentId]?.cardId === cardId) {
      delete snapshot.comments[commentId];
    }
  });
}

function resetActivityCollection(snapshot: BoardStoreSnapshot, cardId: string) {
  Object.keys(snapshot.activity).forEach((activityId) => {
    if (snapshot.activity[activityId]?.cardId === cardId) {
      delete snapshot.activity[activityId];
    }
  });
}

function hydrateCommentEntities(
  snapshot: BoardStoreSnapshot,
  boardId: string,
  cardId: string,
  comments: CommentRecord[],
) {
  resetCommentCollection(snapshot, cardId);

  comments.forEach((comment) => {
    if (comment.author) {
      snapshot.members[comment.author.id] = {
        ...snapshot.members[comment.author.id],
        ...toMemberEntity(comment.author),
      };
    }
    snapshot.comments[comment.id] = {
      id: comment.id,
      boardId,
      cardId,
      authorId: comment.author.id,
      content: comment.text,
      createdAt: comment.createdAt,
    };
  });
}

function hydrateActivityEntities(
  snapshot: BoardStoreSnapshot,
  boardId: string,
  cardId: string,
  activity: ActivityRecord[],
) {
  resetActivityCollection(snapshot, cardId);
  activity.forEach((entry) => {
    snapshot.activity[entry.id] = {
      id: entry.id,
      boardId,
      cardId,
      actorId: CURRENT_USER_ID,
      type: "card.updated",
      message: entry.text,
      createdAt: entry.createdAt,
    };
  });
}

function upsertMemberEntities(snapshot: BoardStoreSnapshot, members: MemberRecord[]) {
  members.forEach((member) => {
    snapshot.members[member.id] = {
      ...snapshot.members[member.id],
      ...toMemberEntity(member),
    };
  });
}

function migrateLegacyBoards(legacyBoards?: BoardRecord[]): BoardStoreSnapshot {
  const boards = legacyBoards?.length ? normalizeBoardState(legacyBoards) : normalizeBoardState(createInitialBoards());
  const snapshot: BoardStoreSnapshot = {
    version: 3,
    boards: {},
    lists: {},
    cards: {},
    labels: {},
    comments: {},
    members: {},
    activity: {},
    filters: {},
    adminUsers: {},
    workspaceAccess: {},
    adminActivity: {},
  };

  [...DEFAULT_BOARD_MEMBERS, ...DEFAULT_JOIN_REQUESTS].forEach((member) => {
    snapshot.members[member.id] = toMemberEntity(member);
  });

  boards.forEach((board) => {
    const createdAt = board.updatedAt || nowIso();
    const mergedMembers = [
      ...board.members,
      ...DEFAULT_BOARD_MEMBERS.filter(
        (member) => !board.members.some((item) => item.id === member.id),
      ),
    ];
    const boardMembers = mergedMembers.map((member) => member.id);
    const joinRequestIds = (board.joinRequests ?? []).map((member) => member.id);

    upsertMemberEntities(snapshot, [...mergedMembers, ...(board.joinRequests ?? [])]);

    snapshot.boards[board.id] = {
      id: board.id,
      title: board.name,
      clientName: mergedMembers[1]?.name ?? "Cliente",
      members: boardMembers,
      createdAt,
      updatedAt: board.updatedAt,
      description: board.description,
      accent: board.accent,
      shareLink: board.shareLink,
      joinRequestIds,
      templates: (board.templates ?? []).map((template) => ({
        id: template.id,
        title: template.title,
        description: template.description,
        labelIds: template.labels.map((label) => label.id),
        memberIds: template.members.map((member) => member.id),
        checklists: template.checklists.map((checklist) => ({
          ...checklist,
          items: checklist.items.map((item) => ({ ...item })),
        })),
        attachments: template.attachments.map((attachment) => ({ ...attachment })),
        customFields: template.customFields.map((field) => ({ ...field })),
        cover: template.cover
          ? {
              ...template.cover,
              size: template.cover.size ?? "header",
            }
          : undefined,
        location: template.location,
        dueDate: template.dates.dueDate,
        startDate: template.dates.startDate,
        recurring: template.dates.recurring,
        reminder: template.dates.reminder,
        createdAt: template.createdAt,
      })),
      deliveredFolders:
        board.deliveredFolders?.map((folder) => ({
          id: folder.id,
          boardId: board.id,
          name: folder.name,
          color: folder.color,
          createdAt: folder.createdAt,
          updatedAt: board.updatedAt,
        })) ?? [],
    };
    snapshot.filters[board.id] = cloneFilters();

    board.labelCatalog.forEach((label) => {
      snapshot.labels[label.id] = {
        id: label.id,
        boardId: board.id,
        title: label.name,
        color: label.tone,
        createdAt,
        updatedAt: board.updatedAt,
      };
    });

    board.lists.forEach((list, listIndex) => {
      snapshot.lists[list.id] = {
        id: list.id,
        boardId: board.id,
        title: list.title,
        order: listIndex,
        color: list.color ?? null,
        archived: false,
        following: list.following ?? false,
        createdAt,
        updatedAt: board.updatedAt,
      };

      list.cards.forEach((card, cardIndex) => {
        upsertMemberEntities(snapshot, card.members);

        snapshot.cards[card.id] = {
          id: card.id,
          boardId: board.id,
          listId: list.id,
          title: card.title,
          description: card.description,
          labelIds: card.labels.map((label) => label.id),
          memberIds: card.members.map((member) => member.id),
          checklistIds: card.checklists.map((checklist) => checklist.id),
          checklists: card.checklists.map((checklist) => ({
            ...checklist,
            items: checklist.items.map((item) => ({ ...item })),
          })),
          attachments: card.attachments.map((attachment) => ({ ...attachment })),
          customFields: card.customFields.map((field) => ({ ...field })),
          cover: card.cover
            ? {
                ...card.cover,
                size: card.cover.size ?? "header",
              }
            : undefined,
          projectSummary: cloneProjectSummary(card.projectSummary),
          location: card.location,
          deliveredFolderId: card.deliveredFolderId,
          dueDate: card.dates.dueDate,
          startDate: card.dates.startDate,
          recurring: card.dates.recurring,
          reminder: card.dates.reminder,
          completed: normalizeChecklistCompletion(card.checklists),
          archived: false,
          order: cardIndex,
          createdAt: card.activity.at(-1)?.createdAt ?? createdAt,
          updatedAt: card.activity[0]?.createdAt ?? board.updatedAt,
        };

        hydrateCommentEntities(snapshot, board.id, card.id, card.comments);
        hydrateActivityEntities(snapshot, board.id, card.id, card.activity);
      });
    });
  });

  bootstrapAdminState(snapshot);
  return snapshot;
}

function sanitizePersistedState(value: unknown): BoardStoreSnapshot {
  if (Array.isArray(value)) {
    return migrateLegacyBoards(value as BoardRecord[]);
  }

  if (!value || typeof value !== "object") {
    return migrateLegacyBoards();
  }

  const candidate = value as { version?: number } & Partial<Omit<BoardStoreSnapshot, "version">>;
  if (candidate.version !== 2 && candidate.version !== 3) {
    return migrateLegacyBoards();
  }

  const snapshot: BoardStoreSnapshot = {
    version: 3,
    boards: candidate.boards ?? {},
    lists: candidate.lists ?? {},
    cards: candidate.cards ?? {},
    labels: candidate.labels ?? {},
    comments: candidate.comments ?? {},
    members: candidate.members ?? {},
    activity: candidate.activity ?? {},
    filters: Object.fromEntries(
      Object.entries(candidate.filters ?? {}).map(([boardId, filters]) => [
        boardId,
        cloneFilters(filters),
      ]),
    ),
    adminUsers: candidate.adminUsers ?? {},
    workspaceAccess: candidate.workspaceAccess ?? {},
    adminActivity: candidate.adminActivity ?? {},
  };

  Object.values(snapshot.boards).forEach((board) => {
    board.deliveredFolders = board.deliveredFolders ?? [];
  });

  bootstrapAdminState(snapshot);
  return snapshot;
}

function searchCard(snapshot: BoardStoreSnapshot, boardId: string, card: Card, keyword: string) {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const labelText = card.labelIds
    .map((labelId) => snapshot.labels[labelId]?.title ?? "")
    .join(" ");
  const memberText = card.memberIds
    .map((memberId) => snapshot.members[memberId]?.name ?? "")
    .join(" ");
  const commentsText = getCardComments(snapshot, card.id)
    .map((comment) => comment.content)
    .join(" ");

  return [card.title, card.description, labelText, memberText, commentsText, boardId]
    .map((entry) => stripHtml(entry))
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function isSameDay(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function matchesDueDate(card: Card, filters: Filters) {
  const dueDateValue = card.dueDate ? new Date(card.dueDate) : null;
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const weekLimit = new Date(today);
  weekLimit.setDate(today.getDate() + 7);
  const monthLimit = new Date(today);
  monthLimit.setMonth(today.getMonth() + 1);

  if (filters.noDueDate && dueDateValue) {
    return false;
  }
  if (filters.noDueDate && !dueDateValue) {
    return true;
  }
  if (!dueDateValue) {
    return !(filters.overdue || filters.dueToday || filters.dueTomorrow || filters.dueThisWeek || filters.dueThisMonth);
  }
  if (filters.overdue && dueDateValue.getTime() >= today.getTime()) {
    return false;
  }
  if (filters.dueToday && !isSameDay(dueDateValue, today)) {
    return false;
  }
  if (filters.dueTomorrow && !isSameDay(dueDateValue, tomorrow)) {
    return false;
  }
  if (filters.dueThisWeek && (dueDateValue.getTime() < today.getTime() || dueDateValue.getTime() > weekLimit.getTime())) {
    return false;
  }
  if (filters.dueThisMonth && (dueDateValue.getTime() < today.getTime() || dueDateValue.getTime() > monthLimit.getTime())) {
    return false;
  }
  return true;
}

function matchesActivityRange(snapshot: BoardStoreSnapshot, card: Card, range: ActivityRange) {
  if (!range) {
    return true;
  }

  const days = range === "week" ? 7 : range === "twoWeeks" ? 14 : 28;
  const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
  const latestActivity = [
    ...getCardActivity(snapshot, card.id).map((item) => new Date(item.createdAt).getTime()),
    ...getCardComments(snapshot, card.id).map((item) => new Date(item.createdAt).getTime()),
  ].sort((a, b) => b - a)[0];

  if (!latestActivity) {
    return false;
  }

  return latestActivity >= threshold;
}

function cardMatchesFilters(snapshot: BoardStoreSnapshot, boardId: string, card: Card) {
  const filters = snapshot.filters[boardId] ?? DEFAULT_FILTERS;

  if (!searchCard(snapshot, boardId, card, filters.keyword)) {
    return false;
  }

  if (filters.noMembers && card.memberIds.length > 0) {
    return false;
  }

  if (filters.assignedToMe && !card.memberIds.includes(CURRENT_USER_ID)) {
    return false;
  }

  if (filters.memberIds.length > 0 && !filters.memberIds.some((memberId) => card.memberIds.includes(memberId))) {
    return false;
  }

  if (filters.noLabels && card.labelIds.length > 0) {
    return false;
  }

  if (filters.labelIds.length > 0 && !filters.labelIds.some((labelId) => card.labelIds.includes(labelId))) {
    return false;
  }

  if (filters.completed && !card.completed) {
    return false;
  }

  if (filters.notCompleted && card.completed) {
    return false;
  }

  if (!matchesDueDate(card, filters)) {
    return false;
  }

  if (!matchesActivityRange(snapshot, card, filters.activityRange)) {
    return false;
  }

  return true;
}

function createDerivedCard(snapshot: BoardStoreSnapshot, card: Card): CardRecord {
  return {
    id: card.id,
    title: card.title,
    description: card.description,
    labels: card.labelIds
      .map((labelId) => snapshot.labels[labelId])
      .filter(Boolean)
      .map((label) => asLabelRecord(label)),
    comments: getCardComments(snapshot, card.id).map((comment) => asCommentRecord(comment, snapshot.members)),
    dates: {
      startDate: card.startDate,
      dueDate: card.dueDate,
      recurring: card.recurring,
      reminder: card.reminder,
    },
    checklists: card.checklists.map((checklist) => ({
      ...checklist,
      items: checklist.items.map((item) => ({ ...item })),
    })),
    attachments: card.attachments.map((attachment) => ({ ...attachment })),
    members: card.memberIds
      .map((memberId) => snapshot.members[memberId])
      .filter(Boolean)
      .map((member) => asMemberRecord(member)),
    activity: getCardActivity(snapshot, card.id).map(asActivityRecord),
    customFields: card.customFields.map((field) => ({ ...field })),
    cover: card.cover
      ? {
          ...card.cover,
          size: card.cover.size ?? "header",
        }
      : undefined,
    projectSummary: cloneProjectSummary(card.projectSummary),
    deliveredFolderId: card.deliveredFolderId,
    location: card.location ?? "",
    completed: card.completed,
  };
}

function createDerivedTemplate(snapshot: BoardStoreSnapshot, template: CardTemplate) {
  return {
    id: template.id,
    title: template.title,
    description: template.description,
    labels: template.labelIds
      .map((labelId) => snapshot.labels[labelId])
      .filter(Boolean)
      .map((label) => asLabelRecord(label)),
    dates: {
      startDate: template.startDate,
      dueDate: template.dueDate,
      recurring: template.recurring,
      reminder: template.reminder,
    },
    checklists: template.checklists.map((checklist) => ({
      ...checklist,
      items: checklist.items.map((item) => ({ ...item })),
    })),
    attachments: template.attachments.map((attachment) => ({ ...attachment })),
    members: template.memberIds
      .map((memberId) => snapshot.members[memberId])
      .filter(Boolean)
      .map((member) => asMemberRecord(member)),
    customFields: template.customFields.map((field) => ({ ...field })),
    cover: template.cover
      ? {
          ...template.cover,
          size: template.cover.size ?? "header",
        }
      : undefined,
    location: template.location ?? "",
    createdAt: template.createdAt,
  };
}

export function selectBoardView(snapshot: BoardStoreSnapshot, boardId: string): BoardRecord | undefined {
  const board = snapshot.boards[boardId];
  if (!board) {
    return undefined;
  }

  const lists = getBoardLists(snapshot, boardId).map<ListRecord>((list) => ({
    id: list.id,
    title: list.title,
    color: list.color ?? null,
    following: list.following ?? false,
    cards: getListCards(snapshot, list.id)
      .filter((card) => cardMatchesFilters(snapshot, boardId, card))
      .map((card) => createDerivedCard(snapshot, card)),
  }));

  const members = board.members
    .map((memberId) => snapshot.members[memberId])
    .filter(Boolean)
    .map((member) => asMemberRecord(member));
  const joinRequests = (board.joinRequestIds ?? [])
    .map((memberId) => snapshot.members[memberId])
    .filter(Boolean)
    .map((member) => asMemberRecord(member));
  const labelCatalog = Object.values(snapshot.labels)
    .filter((label) => label.boardId === boardId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(asLabelRecord);

  return {
    id: board.id,
    name: board.title,
    description: board.description ?? "",
    accent: board.accent ?? DEFAULT_BOARD_ACCENT,
    updatedAt: board.updatedAt,
    lists,
    members,
    joinRequests,
    shareLink: board.shareLink ?? "",
    labelCatalog,
    deliveredFolders: (board.deliveredFolders ?? []).map((folder) => ({
      id: folder.id,
      name: folder.name,
      color: folder.color,
      createdAt: folder.createdAt,
    })),
    templates: (board.templates ?? []).map((template) => createDerivedTemplate(snapshot, template)),
  };
}

export function selectBoardViews(snapshot: BoardStoreSnapshot) {
  return Object.keys(snapshot.boards)
    .map((boardId) => selectBoardView(snapshot, boardId))
    .filter((board): board is BoardRecord => Boolean(board));
}

export function selectBoardStats(snapshot: BoardStoreSnapshot, boardId: string) {
  const allCards = Object.values(snapshot.cards).filter(
    (card) => card.boardId === boardId && !card.archived,
  );
  const filteredCards = allCards.filter((card) => cardMatchesFilters(snapshot, boardId, card));

  return {
    totalCards: allCards.length,
    filteredCards: filteredCards.length,
    totalChecklistItems: filteredCards.reduce(
      (sum, card) => sum + card.checklists.reduce((inner, checklist) => inner + checklist.items.length, 0),
      0,
    ),
  };
}

export function selectBoardMembers(snapshot: BoardStoreSnapshot, boardId: string) {
  const board = snapshot.boards[boardId];
  if (!board) {
    return [];
  }

  return board.members
    .map((memberId) => snapshot.members[memberId])
    .filter(Boolean)
    .map((member) => asMemberRecord(member));
}

export function selectAdminUsers(snapshot: BoardStoreSnapshot) {
  return Object.values(snapshot.adminUsers).sort((a, b) => a.name.localeCompare(b.name));
}

export function selectWorkspaceAccess(snapshot: BoardStoreSnapshot) {
  return Object.values(snapshot.workspaceAccess).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function selectAdminActivity(snapshot: BoardStoreSnapshot) {
  return Object.values(snapshot.adminActivity).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getInitialSnapshotFromStorage(serialized?: string | null) {
  if (!serialized) {
    return migrateLegacyBoards();
  }

  try {
    return sanitizePersistedState(JSON.parse(serialized) as unknown);
  } catch {
    return migrateLegacyBoards();
  }
}

export function addBoardToSnapshot(
  snapshot: BoardStoreSnapshot,
  payload: { name: string; description: string; accent: string },
) {
  const next = structuredClone(snapshot);
  const createdAt = nowIso();
  const boardId = createId("board");

  next.boards[boardId] = {
    id: boardId,
    title: payload.name,
    clientName: "Cliente",
    members: [CURRENT_USER_ID],
    createdAt,
    updatedAt: createdAt,
    description: payload.description,
    accent: payload.accent,
    shareLink: "",
    joinRequestIds: [],
    templates: [],
    deliveredFolders: [
      {
        id: createId("delivered-folder"),
        boardId,
        name: payload.name,
        color: "green",
        createdAt,
        updatedAt: createdAt,
      },
    ],
  };
  next.filters[boardId] = cloneFilters();
  return next;
}

export function upsertAdminUserInSnapshot(snapshot: BoardStoreSnapshot, payload: AdminUserInput) {
  const next = structuredClone(snapshot);
  const timestamp = nowIso();
  const userId = payload.id ?? createId("admin-user");
  const previous = next.adminUsers[userId];
  const nextUser: AdminUser = {
    id: userId,
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    kind: payload.kind,
    status: payload.status ?? "ativo",
    company: payload.company?.trim() || undefined,
    title: payload.title?.trim() || undefined,
    avatarUrl: previous?.avatarUrl,
    createdAt: previous?.createdAt ?? timestamp,
    updatedAt: timestamp,
    lastAccessAt: previous?.lastAccessAt,
  };

  next.adminUsers[userId] = nextUser;

  const relatedAccess = Object.values(next.workspaceAccess).filter((access) => access.userId === userId);
  relatedAccess.forEach((access) => {
    ensureMemberForAdminUser(next, nextUser, access.boardRole);
  });

  addAdminActivityEntity(
    next,
    previous ? "user.updated" : "user.created",
    previous
      ? `Voce atualizou o cadastro de ${nextUser.name}`
      : `Voce cadastrou ${nextUser.name} no painel administrativo`,
    { userId },
  );
  return next;
}

export function deleteAdminUserInSnapshot(snapshot: BoardStoreSnapshot, userId: string) {
  if (userId === CURRENT_ADMIN_USER_ID) {
    return snapshot;
  }

  const next = structuredClone(snapshot);
  const user = next.adminUsers[userId];
  if (!user) {
    return snapshot;
  }

  delete next.adminUsers[userId];
  const memberId = toMemberIdFromAdmin(userId);
  delete next.members[memberId];

  Object.keys(next.workspaceAccess).forEach((accessId) => {
    const access = next.workspaceAccess[accessId];
    if (access?.userId === userId) {
      delete next.workspaceAccess[accessId];
    }
  });

  Object.values(next.boards).forEach((board) => {
    board.members = board.members.filter((id) => id !== memberId);
    board.joinRequestIds = (board.joinRequestIds ?? []).filter((id) => id !== memberId);
    if (board.clientName === user.name) {
      board.clientName = "Cliente";
    }
  });

  Object.values(next.cards).forEach((card) => {
    card.memberIds = card.memberIds.filter((id) => id !== memberId);
    card.updatedAt = nowIso();
  });

  addAdminActivityEntity(next, "user.removed", `Voce removeu ${user.name} do painel administrativo`, {
    userId,
  });
  return next;
}

export function grantWorkspaceAccessInSnapshot(
  snapshot: BoardStoreSnapshot,
  payload: WorkspaceAccessInput,
) {
  const next = structuredClone(snapshot);
  const board = next.boards[payload.boardId];
  const user = next.adminUsers[payload.userId];

  if (!board || !user) {
    return snapshot;
  }

  const panel = payload.panel ?? derivePanelFromKind(user.kind);
  const memberId = ensureMemberForAdminUser(next, user, payload.boardRole);
  const existing = Object.values(next.workspaceAccess).find(
    (access) => access.userId === payload.userId && access.boardId === payload.boardId,
  );

  if (existing) {
    existing.boardRole = payload.boardRole;
    existing.panel = panel;
    existing.updatedAt = nowIso();
  } else {
    const access = createWorkspaceAccessEntity(payload.userId, payload.boardId, payload.boardRole, panel);
    next.workspaceAccess[access.id] = access;
  }

  if (!board.members.includes(memberId)) {
    board.members = [...board.members, memberId];
  }

  if (user.kind === "cliente") {
    board.clientName = user.name;
  }

  board.updatedAt = nowIso();
  addAdminActivityEntity(
    next,
    "access.granted",
    `Voce vinculou ${user.name} ao quadro ${board.title}`,
    { userId: payload.userId, boardId: payload.boardId },
  );
  return next;
}

export function revokeWorkspaceAccessInSnapshot(snapshot: BoardStoreSnapshot, accessId: string) {
  const next = structuredClone(snapshot);
  const access = next.workspaceAccess[accessId];
  if (!access) {
    return snapshot;
  }

  const board = next.boards[access.boardId];
  const user = next.adminUsers[access.userId];
  const memberId = toMemberIdFromAdmin(access.userId);
  delete next.workspaceAccess[accessId];

  if (board) {
    board.members = board.members.filter((id) => id !== memberId);
    board.updatedAt = nowIso();
  }

  Object.values(next.cards)
    .filter((card) => card.boardId === access.boardId)
    .forEach((card) => {
      card.memberIds = card.memberIds.filter((id) => id !== memberId);
      card.updatedAt = nowIso();
    });

  addAdminActivityEntity(
    next,
    "access.revoked",
    `Voce removeu o acesso de ${user?.name ?? "um usuario"} do quadro ${board?.title ?? ""}`.trim(),
    { userId: access.userId, boardId: access.boardId },
  );
  return next;
}

export function deleteWorkspaceInSnapshot(snapshot: BoardStoreSnapshot, boardId: string) {
  const board = snapshot.boards[boardId];
  if (!board) {
    return snapshot;
  }

  const next = structuredClone(snapshot);
  const boardTitle = next.boards[boardId]?.title ?? "quadro";

  Object.keys(next.lists).forEach((listId) => {
    if (next.lists[listId]?.boardId === boardId) {
      delete next.lists[listId];
    }
  });

  Object.keys(next.cards).forEach((cardId) => {
    if (next.cards[cardId]?.boardId === boardId) {
      delete next.cards[cardId];
    }
  });

  Object.keys(next.labels).forEach((labelId) => {
    if (next.labels[labelId]?.boardId === boardId) {
      delete next.labels[labelId];
    }
  });

  Object.keys(next.comments).forEach((commentId) => {
    if (next.comments[commentId]?.boardId === boardId) {
      delete next.comments[commentId];
    }
  });

  Object.keys(next.activity).forEach((activityId) => {
    if (next.activity[activityId]?.boardId === boardId) {
      delete next.activity[activityId];
    }
  });

  Object.keys(next.workspaceAccess).forEach((accessId) => {
    if (next.workspaceAccess[accessId]?.boardId === boardId) {
      delete next.workspaceAccess[accessId];
    }
  });

  delete next.filters[boardId];
  delete next.boards[boardId];

  addAdminActivityEntity(next, "workspace.removed", `Voce excluiu o quadro ${boardTitle}`, {
    boardId,
  });

  return next;
}

export function createWorkspaceInSnapshot(snapshot: BoardStoreSnapshot, payload: WorkspaceCreateInput) {
  let next = addBoardToSnapshot(snapshot, {
    name: payload.name,
    description: payload.description,
    accent: payload.accent || DEFAULT_BOARD_ACCENT,
  });

  const createdBoard = Object.values(next.boards).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!createdBoard) {
    return snapshot;
  }

  createdBoard.clientName = payload.clientName?.trim() || "Cliente";
  next = addListToSnapshot(next, createdBoard.id, "Solicitacoes");
  next = addListToSnapshot(next, createdBoard.id, "Em andamento");
  next = addListToSnapshot(next, createdBoard.id, "Projetos Entregues");

  const userIds = Array.from(new Set([CURRENT_ADMIN_USER_ID, ...(payload.userIds ?? [])]));
  userIds.forEach((userId) => {
    const user = next.adminUsers[userId];
    if (!user) {
      return;
    }

    next = grantWorkspaceAccessInSnapshot(next, {
      userId,
      boardId: createdBoard.id,
      boardRole: user.kind === "admin" ? "Administrador" : user.kind === "cliente" ? "Observador" : "Membro",
      panel: derivePanelFromKind(user.kind),
    });
  });

  addAdminActivityEntity(next, "workspace.created", `Voce criou o quadro ${createdBoard.title}`, {
    boardId: createdBoard.id,
  });
  return next;
}

export function duplicateWorkspaceInSnapshot(
  snapshot: BoardStoreSnapshot,
  payload: WorkspaceDuplicateInput,
) {
  const sourceBoard = snapshot.boards[payload.sourceBoardId];
  if (!sourceBoard || !payload.name.trim()) {
    return snapshot;
  }

  let next = structuredClone(snapshot);
  const timestamp = nowIso();
  const nextBoardId = createId("board");

  const labelIdMap = new Map<string, string>();
  const listIdMap = new Map<string, string>();

  Object.values(next.labels)
    .filter((label) => label.boardId === payload.sourceBoardId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach((label) => {
      const nextLabelId = createId("label");
      labelIdMap.set(label.id, nextLabelId);
      next.labels[nextLabelId] = {
        ...label,
        id: nextLabelId,
        boardId: nextBoardId,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    });

  next.boards[nextBoardId] = {
    id: nextBoardId,
    title: payload.name.trim(),
    clientName: sourceBoard.clientName,
    members: [CURRENT_USER_ID],
    createdAt: timestamp,
    updatedAt: timestamp,
    description: payload.description?.trim() || sourceBoard.description || "",
    accent: sourceBoard.accent || DEFAULT_BOARD_ACCENT,
    shareLink: "",
    joinRequestIds: [],
    deliveredFolders: (sourceBoard.deliveredFolders ?? []).map((folder) => ({
      ...folder,
      id: createId("delivered-folder"),
      boardId: nextBoardId,
      createdAt: timestamp,
      updatedAt: timestamp,
    })),
    templates: (sourceBoard.templates ?? []).map((template) => ({
      ...template,
      id: createId("template"),
      labelIds: template.labelIds.map((labelId) => labelIdMap.get(labelId) ?? labelId),
      checklists: template.checklists.map((checklist) => ({
        ...checklist,
        id: createId("checklist"),
        items: checklist.items.map((item) => ({
          ...item,
          id: createId("item"),
        })),
      })),
      attachments: template.attachments.map((attachment) => ({
        ...attachment,
        id: createId("attachment"),
      })),
      customFields: template.customFields.map((field) => ({
        ...field,
        id: createId("field"),
      })),
      createdAt: timestamp,
    })),
  };

  next.filters[nextBoardId] = cloneFilters();

  getBoardLists(next, payload.sourceBoardId).forEach((list) => {
    const nextListId = createId("list");
    listIdMap.set(list.id, nextListId);
    next.lists[nextListId] = {
      ...list,
      id: nextListId,
      boardId: nextBoardId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });

  Object.values(next.cards)
    .filter((card) => card.boardId === payload.sourceBoardId && !card.archived)
    .sort((a, b) => a.order - b.order)
    .forEach((card) => {
      const nextCardId = createId("card");
      const nextListId = listIdMap.get(card.listId);

      if (!nextListId) {
        return;
      }

      next.cards[nextCardId] = {
        ...card,
        id: nextCardId,
        boardId: nextBoardId,
        listId: nextListId,
        labelIds: card.labelIds.map((labelId) => labelIdMap.get(labelId) ?? labelId),
        memberIds: [],
        checklistIds: [],
        checklists: card.checklists.map((checklist) => {
          const nextChecklistId = createId("checklist");
          return {
            ...checklist,
            id: nextChecklistId,
            items: checklist.items.map((item) => ({
              ...item,
              id: createId("item"),
            })),
          };
        }),
        attachments: card.attachments.map((attachment) => ({
          ...attachment,
          id: createId("attachment"),
        })),
        customFields: card.customFields.map((field) => ({
          ...field,
          id: createId("field"),
        })),
        projectSummary: cloneProjectSummary(card.projectSummary),
        deliveredFolderId: undefined,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      next.cards[nextCardId].checklistIds = next.cards[nextCardId].checklists.map((checklist) => checklist.id);
    });

  next = grantWorkspaceAccessInSnapshot(next, {
    userId: CURRENT_ADMIN_USER_ID,
    boardId: nextBoardId,
    boardRole: "Administrador",
    panel: "admin",
  });

  addAdminActivityEntity(next, "workspace.created", `Voce duplicou o quadro ${sourceBoard.title} em ${payload.name.trim()}`, {
    boardId: nextBoardId,
  });

  return next;
}

export function addListToSnapshot(snapshot: BoardStoreSnapshot, boardId: string, title: string) {
  const next = structuredClone(snapshot);
  const createdAt = nowIso();
  const order = getBoardLists(next, boardId).length;
  const listId = createId("list");

  next.lists[listId] = {
    id: listId,
    boardId,
    title,
    order,
    color: null,
    archived: false,
    following: false,
    createdAt,
    updatedAt: createdAt,
  };
  next.boards[boardId].updatedAt = createdAt;
  addActivityEntity(next, boardId, `Voce criou a lista ${title}`, "list.created");
  return next;
}

function resolvePayloadLabels(
  snapshot: BoardStoreSnapshot,
  boardId: string,
  labels?: NewCardPayload["labels"],
) {
  if (!labels?.length) {
    return [];
  }

  const nextIds: string[] = [];
  labels.forEach((label) => {
    if (label.id && snapshot.labels[label.id]) {
      nextIds.push(label.id);
      return;
    }

    const created = createLabel(label.name, label.tone, label.id);
    snapshot.labels[created.id] = {
      id: created.id,
      boardId,
      title: created.name,
      color: created.tone,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    nextIds.push(created.id);
  });

  return nextIds;
}

export function addCardToSnapshot(
  snapshot: BoardStoreSnapshot,
  boardId: string,
  listId: string,
  payload: NewCardPayload,
) {
  const next = structuredClone(snapshot);
  const createdAt = nowIso();
  const cardId = createId("card");

  next.cards[cardId] = {
    id: cardId,
    boardId,
    listId,
    title: payload.title,
    description: payload.description ?? "",
    labelIds: resolvePayloadLabels(next, boardId, payload.labels),
    memberIds: [CURRENT_USER_ID],
    checklistIds: [],
    checklists: [],
    attachments: [],
    customFields: [],
    cover: undefined,
    projectSummary: undefined,
    deliveredFolderId: undefined,
    location: "",
    dueDate: payload.dueDate,
    startDate: payload.startDate,
    recurring: "Nunca",
    reminder: "1 dia antes",
    completed: false,
    archived: false,
    order: getListCards(next, listId).length,
    createdAt,
    updatedAt: createdAt,
  };
  addActivityEntity(next, boardId, "Voce adicionou este card", "card.created", cardId);
  next.boards[boardId].updatedAt = createdAt;
  return next;
}

export function updateCardInSnapshot(
  snapshot: BoardStoreSnapshot,
  boardId: string,
  listId: string,
  cardId: string,
  updates: Partial<CardRecord>,
  activityText?: string,
) {
  // This function is the main candidate to become a Supabase card mutation once persistence moves server-side.
  const next = structuredClone(snapshot);
  const card = next.cards[cardId];
  if (!card || card.boardId !== boardId || card.listId !== listId) {
    return snapshot;
  }

  const updatedAt = nowIso();

  if (typeof updates.title === "string") {
    card.title = updates.title;
  }
  if (typeof updates.description === "string") {
    card.description = updates.description;
  }
  if (updates.labels) {
    updates.labels.forEach((label) => {
      next.labels[label.id] = {
        id: label.id,
        boardId,
        title: label.name,
        color: label.tone,
        createdAt: next.labels[label.id]?.createdAt ?? updatedAt,
        updatedAt,
      };
    });
    card.labelIds = updates.labels.map((label) => label.id);
  }
  if (updates.members) {
    upsertMemberEntities(next, updates.members);
    card.memberIds = updates.members.map((member) => member.id);
  }
  if (updates.comments) {
    hydrateCommentEntities(next, boardId, cardId, updates.comments);
  }
  if (updates.activity) {
    hydrateActivityEntities(next, boardId, cardId, updates.activity);
  }
  if (updates.dates) {
    card.startDate = updates.dates.startDate;
    card.dueDate = updates.dates.dueDate;
    card.recurring = updates.dates.recurring;
    card.reminder = updates.dates.reminder;
  }
  if (updates.checklists) {
    card.checklists = updates.checklists.map((checklist) => ({
      ...checklist,
      items: checklist.items.map((item) => ({ ...item })),
    }));
    card.checklistIds = updates.checklists.map((checklist) => checklist.id);
    card.completed = normalizeChecklistCompletion(updates.checklists);
  }
  if (updates.attachments) {
    card.attachments = updates.attachments.map((attachment) => ({ ...attachment }));
  }
  if (updates.customFields) {
    card.customFields = updates.customFields.map((field) => ({ ...field }));
  }
  if ("cover" in updates) {
    card.cover = updates.cover
      ? {
          ...updates.cover,
          size: updates.cover.size ?? "header",
        }
      : undefined;
  }
  if ("projectSummary" in updates) {
    card.projectSummary = cloneProjectSummary(updates.projectSummary);
  }
  if ("deliveredFolderId" in updates) {
    card.deliveredFolderId = updates.deliveredFolderId;
  }
  if (typeof updates.location === "string") {
    card.location = updates.location;
  }
  if (typeof updates.completed === "boolean") {
    card.completed = updates.completed;
  }

  card.updatedAt = updatedAt;
  next.boards[boardId].updatedAt = updatedAt;

  if (activityText) {
    addActivityEntity(next, boardId, activityText, "card.updated", cardId);
  }

  return next;
}

function reindexListCards(snapshot: BoardStoreSnapshot, listId: string, cardIds: string[]) {
  cardIds.forEach((id, index) => {
    if (snapshot.cards[id]) {
      snapshot.cards[id].listId = listId;
      snapshot.cards[id].order = index;
      snapshot.cards[id].updatedAt = nowIso();
    }
  });
}

export function moveCardInSnapshot(
  snapshot: BoardStoreSnapshot,
  boardId: string,
  sourceListId: string,
  targetListId: string,
  cardId: string,
  targetCardId?: string,
) {
  const next = structuredClone(snapshot);
  const card = next.cards[cardId];
  if (!card) {
    return snapshot;
  }

  const boardLists = getBoardLists(next, boardId);
  const deliveredListId = boardLists.at(-1)?.id;
  const deliveredFolderId = next.boards[boardId]?.deliveredFolders?.[0]?.id;

  const sourceIds = getListCards(next, sourceListId)
    .map((item) => item.id)
    .filter((id) => id !== cardId);
  const targetIds =
    sourceListId === targetListId
      ? sourceIds
      : getListCards(next, targetListId).map((item) => item.id);

  const insertionIndex = targetCardId ? targetIds.findIndex((id) => id === targetCardId) : -1;
  if (insertionIndex === -1) {
    targetIds.push(cardId);
  } else {
    targetIds.splice(insertionIndex, 0, cardId);
  }

  if (sourceListId !== targetListId) {
    reindexListCards(next, sourceListId, sourceIds);
  }
  reindexListCards(next, targetListId, targetIds);
  next.cards[cardId].listId = targetListId;
  if (targetListId === deliveredListId && !next.cards[cardId].deliveredFolderId && deliveredFolderId) {
    next.cards[cardId].deliveredFolderId = deliveredFolderId;
  }
  next.boards[boardId].updatedAt = nowIso();

  const targetListTitle = next.lists[targetListId]?.title ?? "outra lista";
  addActivityEntity(next, boardId, `Voce moveu este card para ${targetListTitle}`, "card.moved", cardId);
  return next;
}

export function updateBoardInSnapshot(
  snapshot: BoardStoreSnapshot,
  boardId: string,
  updates: Partial<BoardRecord>,
) {
  const next = structuredClone(snapshot);
  const board = next.boards[boardId];
  if (!board) {
    return snapshot;
  }

  if (typeof updates.name === "string") {
    board.title = updates.name;
  }
  if (typeof updates.description === "string") {
    board.description = updates.description;
  }
  if (typeof updates.accent === "string") {
    board.accent = updates.accent;
  }
  if (typeof updates.shareLink === "string") {
    board.shareLink = updates.shareLink;
  }
  if (updates.templates) {
    board.templates = updates.templates.map((template) => ({
      id: template.id,
      title: template.title,
      description: template.description,
      labelIds: template.labels.map((label) => label.id),
      memberIds: template.members.map((member) => member.id),
      checklists: template.checklists.map((checklist) => ({
        ...checklist,
        items: checklist.items.map((item) => ({ ...item })),
      })),
      attachments: template.attachments.map((attachment) => ({ ...attachment })),
      customFields: template.customFields.map((field) => ({ ...field })),
      cover: template.cover
        ? {
            ...template.cover,
            size: template.cover.size ?? "header",
          }
        : undefined,
      location: template.location,
      dueDate: template.dates.dueDate,
      startDate: template.dates.startDate,
      recurring: template.dates.recurring,
      reminder: template.dates.reminder,
      createdAt: template.createdAt,
    }));
  }
  if (updates.deliveredFolders) {
    board.deliveredFolders = updates.deliveredFolders.map((folder) => ({
      id: folder.id,
      boardId,
      name: folder.name,
      color: folder.color,
      createdAt: folder.createdAt,
      updatedAt: nowIso(),
    }));
  }
  if (updates.members) {
    upsertMemberEntities(next, updates.members);
    board.members = updates.members.map((member) => member.id);
  }
  if (updates.joinRequests) {
    upsertMemberEntities(next, updates.joinRequests);
    board.joinRequestIds = updates.joinRequests.map((member) => member.id);
  }

  board.updatedAt = nowIso();
  addActivityEntity(next, boardId, "Voce atualizou o quadro", "board.updated");
  return next;
}

export function renameDeliveredFolderInSnapshot(
  snapshot: BoardStoreSnapshot,
  boardId: string,
  folderId: string,
  name: string,
) {
  const next = structuredClone(snapshot);
  const board = next.boards[boardId];
  const trimmed = name.trim();
  if (!board || !trimmed) {
    return snapshot;
  }

  const folder = board.deliveredFolders?.find((item) => item.id === folderId);
  if (!folder || folder.name === trimmed) {
    return snapshot;
  }

  folder.name = trimmed;
  folder.updatedAt = nowIso();
  board.updatedAt = folder.updatedAt;

  addAdminActivityEntity(next, "folder.updated", `Voce renomeou a pasta ${trimmed}`, {
    boardId,
  });

  return next;
}

export function deleteDeliveredFolderInSnapshot(
  snapshot: BoardStoreSnapshot,
  boardId: string,
  folderId: string,
) {
  const next = structuredClone(snapshot);
  const board = next.boards[boardId];
  if (!board || !board.deliveredFolders?.length) {
    return snapshot;
  }

  if (board.deliveredFolders.length <= 1) {
    return snapshot;
  }

  const removedFolder = board.deliveredFolders.find((item) => item.id === folderId);
  if (!removedFolder) {
    return snapshot;
  }

  const fallbackFolder = board.deliveredFolders.find((item) => item.id !== folderId);
  if (!fallbackFolder) {
    return snapshot;
  }

  board.deliveredFolders = board.deliveredFolders.filter((item) => item.id !== folderId);

  Object.values(next.cards)
    .filter((card) => card.boardId === boardId && card.deliveredFolderId === folderId)
    .forEach((card) => {
      card.deliveredFolderId = fallbackFolder.id;
      card.updatedAt = nowIso();
    });

  board.updatedAt = nowIso();

  addAdminActivityEntity(next, "folder.removed", `Voce removeu a pasta ${removedFolder.name}`, {
    boardId,
  });

  return next;
}

export function duplicateCardInSnapshot(
  snapshot: BoardStoreSnapshot,
  boardId: string,
  listId: string,
  cardId: string,
) {
  const next = structuredClone(snapshot);
  const source = next.cards[cardId];
  if (!source || source.boardId !== boardId || source.listId !== listId) {
    return snapshot;
  }

  const createdAt = nowIso();
  const nextCardId = createId("card");

  next.cards[nextCardId] = {
    ...source,
    id: nextCardId,
    title: `${source.title} (copia)`,
    checklists: source.checklists.map((checklist) => ({
      ...checklist,
      id: createId("checklist"),
      items: checklist.items.map((item) => ({
        ...item,
        id: createId("item"),
      })),
    })),
    attachments: source.attachments.map((attachment) => ({
      ...attachment,
      id: createId("attachment"),
    })),
    customFields: source.customFields.map((field) => ({
      ...field,
      id: createId("field"),
    })),
    cover: source.cover
      ? {
          ...source.cover,
          size: source.cover.size ?? "header",
        }
      : undefined,
    projectSummary: cloneProjectSummary(source.projectSummary),
    order: getListCards(next, listId).length,
    createdAt,
    updatedAt: createdAt,
  };
  next.cards[nextCardId].checklistIds = next.cards[nextCardId].checklists.map((checklist) => checklist.id);
  next.boards[boardId].updatedAt = createdAt;
  addActivityEntity(next, boardId, "Voce duplicou este card", "card.created", nextCardId);
  return next;
}

export function saveCardTemplateInSnapshot(
  snapshot: BoardStoreSnapshot,
  boardId: string,
  listId: string,
  cardId: string,
) {
  const next = structuredClone(snapshot);
  const source = next.cards[cardId];
  const board = next.boards[boardId];
  if (!source || !board || source.boardId !== boardId || source.listId !== listId) {
    return snapshot;
  }

  const createdAt = nowIso();
  const template: CardTemplate = {
    id: createId("template"),
    title: source.title,
    description: source.description,
    labelIds: [...source.labelIds],
    memberIds: [...source.memberIds],
    checklists: source.checklists.map((checklist) => ({
      ...checklist,
      items: checklist.items.map((item) => ({ ...item })),
    })),
    attachments: source.attachments.map((attachment) => ({ ...attachment })),
    customFields: source.customFields.map((field) => ({ ...field })),
    cover: source.cover
      ? {
          ...source.cover,
          size: source.cover.size ?? "header",
        }
      : undefined,
    location: source.location,
    dueDate: source.dueDate,
    startDate: source.startDate,
    recurring: source.recurring,
    reminder: source.reminder,
    createdAt,
  };

  board.templates = [...(board.templates ?? []), template];
  board.updatedAt = createdAt;
  addActivityEntity(next, boardId, "Voce salvou este card como template", "board.updated", cardId);
  return next;
}

export function deleteCardInSnapshot(
  snapshot: BoardStoreSnapshot,
  boardId: string,
  listId: string,
  cardId: string,
) {
  const next = structuredClone(snapshot);
  const card = next.cards[cardId];
  if (!card || card.boardId !== boardId || card.listId !== listId) {
    return snapshot;
  }

  card.archived = true;
  card.updatedAt = nowIso();
  next.boards[boardId].updatedAt = card.updatedAt;
  const remainingIds = getListCards(next, listId)
    .map((item) => item.id)
    .filter((id) => id !== cardId);
  reindexListCards(next, listId, remainingIds);
  addActivityEntity(next, boardId, "Voce excluiu este card", "card.updated");
  return next;
}

export function updateListInSnapshot(
  snapshot: BoardStoreSnapshot,
  boardId: string,
  listId: string,
  updates: Partial<ListRecord>,
) {
  const next = structuredClone(snapshot);
  const list = next.lists[listId];
  if (!list || list.boardId !== boardId) {
    return snapshot;
  }

  if (typeof updates.title === "string") {
    list.title = updates.title;
  }
  if ("color" in updates) {
    list.color = updates.color ?? null;
  }
  if (typeof updates.following === "boolean") {
    list.following = updates.following;
  }
  list.updatedAt = nowIso();
  next.boards[boardId].updatedAt = list.updatedAt;
  addActivityEntity(next, boardId, `Voce atualizou a lista ${list.title}`, "list.updated");
  return next;
}

export function duplicateListInSnapshot(snapshot: BoardStoreSnapshot, boardId: string, listId: string) {
  const next = structuredClone(snapshot);
  const source = next.lists[listId];
  if (!source || source.boardId !== boardId) {
    return snapshot;
  }

  const createdAt = nowIso();
  const copyId = `${source.id}-copy-${crypto.randomUUID().slice(0, 6)}`;
  const copyOrder = source.order + 1;

  Object.values(next.lists)
    .filter((list) => list.boardId === boardId && list.order > source.order)
    .forEach((list) => {
      list.order += 1;
    });

  next.lists[copyId] = {
    ...source,
    id: copyId,
    title: `${source.title} (copia)`,
    order: copyOrder,
    createdAt,
    updatedAt: createdAt,
  };

  getListCards(next, listId).forEach((card, index) => {
    const newCardId = `${card.id}-copy-${crypto.randomUUID().slice(0, 6)}`;
    next.cards[newCardId] = {
      ...card,
      id: newCardId,
      listId: copyId,
      order: index,
      createdAt,
      updatedAt: createdAt,
    };

    getCardComments(next, card.id).forEach((comment) => {
      const newCommentId = createId("comment");
      next.comments[newCommentId] = {
        ...comment,
        id: newCommentId,
        cardId: newCardId,
      };
    });

    getCardActivity(next, card.id).forEach((activity) => {
      const newActivityId = createId("activity");
      next.activity[newActivityId] = {
        ...activity,
        id: newActivityId,
        cardId: newCardId,
      };
    });
    addActivityEntity(next, boardId, "Voce copiou este card", "card.created", newCardId);
  });

  next.boards[boardId].updatedAt = createdAt;
  return next;
}

export function moveListInSnapshot(
  snapshot: BoardStoreSnapshot,
  boardId: string,
  listId: string,
  direction: "left" | "right",
) {
  const next = structuredClone(snapshot);
  const lists = getBoardLists(next, boardId);
  const index = lists.findIndex((list) => list.id === listId);
  if (index === -1) {
    return snapshot;
  }

  const targetIndex = direction === "left" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= lists.length) {
    return snapshot;
  }

  const reordered = [...lists];
  const [moved] = reordered.splice(index, 1);
  reordered.splice(targetIndex, 0, moved);
  reordered.forEach((list, order) => {
    next.lists[list.id].order = order;
    next.lists[list.id].updatedAt = nowIso();
  });
  next.boards[boardId].updatedAt = nowIso();
  return next;
}

export function archiveListInSnapshot(snapshot: BoardStoreSnapshot, boardId: string, listId: string) {
  const next = structuredClone(snapshot);
  const list = next.lists[listId];
  if (!list || list.boardId !== boardId) {
    return snapshot;
  }

  list.archived = true;
  list.updatedAt = nowIso();
  next.boards[boardId].updatedAt = list.updatedAt;
  addActivityEntity(next, boardId, `Voce arquivou a lista ${list.title}`, "list.archived");
  return next;
}

export function upsertBoardLabelInSnapshot(
  snapshot: BoardStoreSnapshot,
  boardId: string,
  label: LabelRecord,
) {
  const next = structuredClone(snapshot);
  next.labels[label.id] = {
    id: label.id,
    boardId,
    title: label.name,
    color: label.tone,
    createdAt: next.labels[label.id]?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };
  next.boards[boardId].updatedAt = nowIso();
  return next;
}

export function removeBoardLabelInSnapshot(
  snapshot: BoardStoreSnapshot,
  boardId: string,
  labelId: string,
) {
  const next = structuredClone(snapshot);
  delete next.labels[labelId];

  Object.values(next.cards)
    .filter((card) => card.boardId === boardId)
    .forEach((card) => {
      card.labelIds = card.labelIds.filter((id) => id !== labelId);
      card.updatedAt = nowIso();
    });

  next.boards[boardId].updatedAt = nowIso();
  return next;
}

export function updateFiltersInSnapshot(
  snapshot: BoardStoreSnapshot,
  boardId: string,
  updates: Partial<Filters>,
) {
  const next = structuredClone(snapshot);
  ensureBoardFilters(next, boardId);
  next.filters[boardId] = cloneFilters({
    ...next.filters[boardId],
    ...updates,
  });
  return next;
}

export function clearFiltersInSnapshot(snapshot: BoardStoreSnapshot, boardId: string) {
  const next = structuredClone(snapshot);
  next.filters[boardId] = cloneFilters();
  return next;
}

export function countActiveFilters(filters: Filters) {
  return [
    Boolean(filters.keyword.trim()),
    filters.memberIds.length > 0,
    filters.assignedToMe,
    filters.noMembers,
    filters.completed,
    filters.notCompleted,
    filters.noDueDate,
    filters.overdue,
    filters.dueToday,
    filters.dueTomorrow,
    filters.dueThisWeek,
    filters.dueThisMonth,
    filters.labelIds.length > 0,
    filters.noLabels,
    Boolean(filters.activityRange),
  ].filter(Boolean).length;
}
