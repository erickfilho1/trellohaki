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
export type AdminUserKind = "admin" | "cliente" | "colaborador";
export type AdminUserStatus = "ativo" | "pendente" | "desativado";
export type WorkspacePanel = "admin" | "cliente" | "colaborador";

export type Attachment = {
  id: string;
  name: string;
  url: string;
  kind: "link" | "file";
};

export type ChecklistItem = {
  id: string;
  text: string;
  completed: boolean;
};

export type Checklist = {
  id: string;
  title: string;
  items: ChecklistItem[];
};

export type CustomField = {
  id: string;
  name: string;
  value: string;
};

export type ProjectSummaryDepartmentKey = "design" | "video" | "webdesign";

export type ProjectSummaryField = {
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

export type ProjectSummarySection = {
  id: ProjectSummaryDepartmentKey;
  title: string;
  description: string;
  enabled: boolean;
  fields: ProjectSummaryField[];
};

export type ProjectSummary = {
  updatedAt: string;
  sections: Record<ProjectSummaryDepartmentKey, ProjectSummarySection>;
};

export type DeliveredFolder = {
  id: string;
  boardId: string;
  name: string;
  color: LabelTone;
  createdAt: string;
  updatedAt: string;
};

export type CardCover = {
  tone?: LabelTone;
  imageUrl?: string;
  size?: "header" | "full";
};

export type CardTemplate = {
  id: string;
  title: string;
  description: string;
  labelIds: string[];
  memberIds: string[];
  checklists: Checklist[];
  attachments: Attachment[];
  customFields: CustomField[];
  cover?: CardCover;
  location?: string;
  dueDate?: string;
  startDate?: string;
  recurring: string;
  reminder: string;
  createdAt: string;
};

export type Board = {
  id: string;
  title: string;
  clientName: string;
  members: string[];
  createdAt: string;
  updatedAt: string;
  description?: string;
  accent?: string;
  shareLink?: string;
  joinRequestIds?: string[];
  templates?: CardTemplate[];
  deliveredFolders?: DeliveredFolder[];
};

export type List = {
  id: string;
  boardId: string;
  title: string;
  order: number;
  color?: LabelTone | null;
  archived: boolean;
  following?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Card = {
  id: string;
  boardId: string;
  listId: string;
  title: string;
  description: string;
  labelIds: string[];
  memberIds: string[];
  checklistIds: string[];
  checklists: Checklist[];
  attachments: Attachment[];
  customFields: CustomField[];
  cover?: CardCover;
  projectSummary?: ProjectSummary;
  deliveredFolderId?: string;
  location?: string;
  dueDate?: string;
  startDate?: string;
  recurring: string;
  reminder: string;
  completed: boolean;
  archived: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type Label = {
  id: string;
  boardId: string;
  title: string;
  color: LabelTone;
  createdAt: string;
  updatedAt: string;
};

export type Comment = {
  id: string;
  boardId: string;
  cardId: string;
  authorId: string;
  content: string;
  createdAt: string;
};

export type Member = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: BoardRole;
  handle: string;
  initials: string;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  kind: AdminUserKind;
  status: AdminUserStatus;
  company?: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  lastAccessAt?: string;
};

export type WorkspaceAccess = {
  id: string;
  userId: string;
  boardId: string;
  boardRole: BoardRole;
  panel: WorkspacePanel;
  createdAt: string;
  updatedAt: string;
};

export type ActivityType =
  | "card.created"
  | "card.updated"
  | "card.moved"
  | "card.commented"
  | "card.label.added"
  | "card.label.removed"
  | "card.member.added"
  | "card.member.removed"
  | "card.checklist.updated"
  | "list.created"
  | "list.updated"
  | "list.archived"
  | "board.updated";

export type Activity = {
  id: string;
  boardId: string;
  cardId?: string;
  actorId: string;
  type: ActivityType;
  message: string;
  createdAt: string;
};

export type AdminActivityType =
  | "user.created"
  | "user.updated"
  | "user.removed"
  | "access.granted"
  | "access.revoked"
  | "workspace.created"
  | "workspace.updated"
  | "workspace.removed"
  | "folder.updated"
  | "folder.removed";

export type AdminActivity = {
  id: string;
  type: AdminActivityType;
  boardId?: string;
  userId?: string;
  actorId: string;
  message: string;
  createdAt: string;
};

export type ActivityRange = "week" | "twoWeeks" | "fourWeeks" | null;

export type Filters = {
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
  activityRange: ActivityRange;
};

export type BoardStoreSnapshot = {
  version: 3;
  boards: Record<string, Board>;
  lists: Record<string, List>;
  cards: Record<string, Card>;
  labels: Record<string, Label>;
  comments: Record<string, Comment>;
  members: Record<string, Member>;
  activity: Record<string, Activity>;
  filters: Record<string, Filters>;
  adminUsers: Record<string, AdminUser>;
  workspaceAccess: Record<string, WorkspaceAccess>;
  adminActivity: Record<string, AdminActivity>;
};
