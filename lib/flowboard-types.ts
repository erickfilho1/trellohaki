import type {
  AdminActivity,
  AdminUser,
  WorkspaceAccess,
  WorkspacePanel,
} from "@/types/board";

export type LabelTone =
  | "green-dark"
  | "green"
  | "green-light"
  | "yellow-dark"
  | "yellow"
  | "orange"
  | "red-dark"
  | "red"
  | "coral"
  | "purple-dark"
  | "purple"
  | "lilac"
  | "blue-dark"
  | "blue"
  | "blue-light"
  | "cyan"
  | "pink"
  | "gray";

export type BoardRole = "Membro" | "Observador" | "Administrador";

export type LabelRecord = {
  id: string;
  name: string;
  tone: LabelTone;
};

export type MemberRecord = {
  id: string;
  name: string;
  handle: string;
  role: BoardRole;
  avatar?: string;
  initials: string;
};

export type CommentRecord = {
  id: string;
  author: MemberRecord;
  createdAt: string;
  text: string;
};

export type ActivityRecord = {
  id: string;
  createdAt: string;
  text: string;
};

export type NotificationKind = "mention" | "comment";

export type NotificationRecord = {
  id: string;
  kind: NotificationKind;
  boardId: string;
  boardName: string;
  cardId: string;
  cardTitle: string;
  actor: MemberRecord;
  recipient: MemberRecord;
  excerpt: string;
  createdAt: string;
  read: boolean;
};

export type ChecklistItemRecord = {
  id: string;
  text: string;
  completed: boolean;
};

export type ChecklistRecord = {
  id: string;
  title: string;
  items: ChecklistItemRecord[];
};

export type AttachmentRecord = {
  id: string;
  name: string;
  url: string;
  kind: "link" | "file";
};

export type CardDatesRecord = {
  startDate?: string;
  dueDate?: string;
  recurring: string;
  reminder: string;
};

export type CardCoverRecord = {
  tone?: LabelTone;
  imageUrl?: string;
  size?: "header" | "full";
};

export type ProjectSummaryDepartmentKey = "design" | "video" | "webdesign";

export type ProjectSummaryFieldRecord = {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  secret?: boolean;
  media?: Array<{
    id: string;
    name: string;
    url: string;
  }>;
};

export type ProjectSummarySectionRecord = {
  id: ProjectSummaryDepartmentKey;
  title: string;
  description: string;
  enabled: boolean;
  fields: ProjectSummaryFieldRecord[];
};

export type ProjectSummaryRecord = {
  updatedAt: string;
  sections: Record<ProjectSummaryDepartmentKey, ProjectSummarySectionRecord>;
};

export type DeliveredFolderRecord = {
  id: string;
  name: string;
  color: LabelTone;
  createdAt: string;
};

export type CardRecord = {
  id: string;
  title: string;
  description: string;
  labels: LabelRecord[];
  comments: CommentRecord[];
  dates: CardDatesRecord;
  checklists: ChecklistRecord[];
  attachments: AttachmentRecord[];
  members: MemberRecord[];
  activity: ActivityRecord[];
  customFields: Array<{ id: string; name: string; value: string }>;
  cover?: CardCoverRecord;
  projectSummary?: ProjectSummaryRecord;
  deliveredFolderId?: string;
  location?: string;
  completed?: boolean;
};

export type CardTemplateRecord = {
  id: string;
  title: string;
  description: string;
  labels: LabelRecord[];
  dates: CardDatesRecord;
  checklists: ChecklistRecord[];
  attachments: AttachmentRecord[];
  members: MemberRecord[];
  customFields: Array<{ id: string; name: string; value: string }>;
  cover?: CardCoverRecord;
  location?: string;
  createdAt: string;
};

export type ListRecord = {
  id: string;
  title: string;
  cards: CardRecord[];
  color?: LabelTone | null;
  following?: boolean;
};

export type BoardRecord = {
  id: string;
  name: string;
  description: string;
  accent: string;
  updatedAt: string;
  lists: ListRecord[];
  members: MemberRecord[];
  joinRequests: MemberRecord[];
  shareLink?: string;
  labelCatalog: LabelRecord[];
  deliveredFolders: DeliveredFolderRecord[];
  templates?: CardTemplateRecord[];
};

export type NewCardPayload = {
  title: string;
  description?: string;
  labels?: Array<{ name: string; tone: LabelTone; id?: string }>;
  dueDate?: string;
  startDate?: string;
};

export type BoardFiltersRecord = {
  keyword: string;
  memberIds: string[];
  assignedToMe: boolean;
  noMembers: boolean;
  completed: boolean;
  notCompleted: boolean;
  noDueDate: boolean;
  overdue: boolean;
  dueToday: boolean;
  dueTomorrow: boolean;
  dueThisWeek: boolean;
  dueThisMonth: boolean;
  labelIds: string[];
  noLabels: boolean;
  activityRange: "week" | "twoWeeks" | "fourWeeks" | null;
};

export type FlowBoardContextValue = {
  boards: BoardRecord[];
  hydrated: boolean;
  filters: Record<string, BoardFiltersRecord>;
  notifications: NotificationRecord[];
  adminUsers: AdminUser[];
  workspaceAccess: WorkspaceAccess[];
  adminActivity: AdminActivity[];
  addBoard: (payload: { name: string; description: string; accent: string }) => void;
  createWorkspace: (payload: {
    name: string;
    description: string;
    accent: string;
    clientName?: string;
    userIds?: string[];
  }) => void;
  duplicateWorkspace: (payload: {
    sourceBoardId: string;
    name: string;
    description?: string;
  }) => void;
  addList: (boardId: string, title: string) => void;
  addCard: (boardId: string, listId: string, payload: NewCardPayload) => void;
  updateCard: (
    boardId: string,
    listId: string,
    cardId: string,
    updates: Partial<CardRecord>,
    activityText?: string,
  ) => void;
  duplicateCard: (boardId: string, listId: string, cardId: string) => void;
  deleteCard: (boardId: string, listId: string, cardId: string) => void;
  saveCardTemplate: (boardId: string, listId: string, cardId: string) => void;
  moveCard: (
    boardId: string,
    sourceListId: string,
    targetListId: string,
    cardId: string,
    targetCardId?: string,
  ) => void;
  updateBoard: (boardId: string, updates: Partial<BoardRecord>) => void;
  updateList: (
    boardId: string,
    listId: string,
    updates: Partial<ListRecord>,
  ) => void;
  duplicateList: (boardId: string, listId: string) => void;
  moveList: (boardId: string, listId: string, direction: "left" | "right") => void;
  archiveList: (boardId: string, listId: string) => void;
  upsertBoardLabel: (boardId: string, label: LabelRecord) => void;
  removeBoardLabel: (boardId: string, labelId: string) => void;
  updateFilters: (boardId: string, updates: Partial<BoardFiltersRecord>) => void;
  clearFilters: (boardId: string) => void;
  upsertAdminUser: (payload: {
    id?: string;
    name: string;
    email: string;
    kind: AdminUser["kind"];
    status?: AdminUser["status"];
    company?: string;
    title?: string;
  }) => void;
  deleteAdminUser: (userId: string) => void;
  deleteWorkspace: (boardId: string) => void;
  grantWorkspaceAccess: (payload: {
    userId: string;
    boardId: string;
    boardRole: BoardRole;
    panel?: WorkspacePanel;
  }) => void;
  revokeWorkspaceAccess: (accessId: string) => void;
  renameDeliveredFolder: (boardId: string, folderId: string, name: string) => void;
  deleteDeliveredFolder: (boardId: string, folderId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  markNotificationsRead: (notificationIds: string[]) => void;
  clearNotifications: (notificationIds: string[]) => void;
  getBoardStats: (boardId: string) => {
    totalCards: number;
    filteredCards: number;
    totalChecklistItems: number;
    activeFilterCount?: number;
  };
};
