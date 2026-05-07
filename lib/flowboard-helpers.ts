import { LABEL_COLOR_SWATCHES } from "@/lib/flowboard-constants";
import { cn } from "@/lib/utils";
import type {
  ActivityRecord,
  CardDatesRecord,
  CommentRecord,
  LabelRecord,
  LabelTone,
  MemberRecord,
} from "@/lib/flowboard-types";

export function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function createLabel(name: string, tone: LabelTone, id?: string): LabelRecord {
  return {
    id: id ?? createId("label"),
    name,
    tone,
  };
}

export function createMemberActivity(text: string): ActivityRecord {
  return {
    id: createId("activity"),
    createdAt: new Date().toISOString(),
    text,
  };
}

export function createComment(author: MemberRecord, text: string): CommentRecord {
  return {
    id: createId("comment"),
    author,
    createdAt: new Date().toISOString(),
    text,
  };
}

export function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isRichTextEmpty(value: string) {
  return stripHtml(value).length === 0;
}

export function getLabelToneStyles(tone: LabelTone) {
  const swatch = LABEL_COLOR_SWATCHES[tone];
  return cn(swatch.solid, swatch.text);
}

export function getLabelPreviewColor(tone: LabelTone) {
  return LABEL_COLOR_SWATCHES[tone].preview;
}

export function getSurfaceColorClasses(tone?: LabelTone | null) {
  if (!tone) {
    return {
      card: "bg-[#11161f]/92 border-white/8",
      header: "bg-white/0",
      text: "text-white",
    };
  }

  const swatch = LABEL_COLOR_SWATCHES[tone];
  return {
    card: cn("border-white/10", swatch.surface),
    header: cn("rounded-[1.1rem] border px-3 py-2", swatch.surface, swatch.border),
    text: swatch.text,
  };
}

export function formatDateTime(value?: string) {
  if (!value) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDateOnly(value?: string) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(value));
}

export function formatDateInput(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function isDueSoon(dates: CardDatesRecord) {
  if (!dates.dueDate) {
    return false;
  }

  const diff = new Date(dates.dueDate).getTime() - Date.now();
  return diff > 0 && diff <= 1000 * 60 * 60 * 48;
}

export function isOverdue(dates: CardDatesRecord) {
  return Boolean(dates.dueDate && new Date(dates.dueDate).getTime() < Date.now());
}

export function getDueBadgeClass(dates: CardDatesRecord) {
  if (isOverdue(dates)) {
    return "bg-[#6b2626] text-[#ffd5d5]";
  }

  if (isDueSoon(dates)) {
    return "bg-[#654d1b] text-[#ffe2a7]";
  }

  return "bg-white/6 text-[#d7ddef]";
}

export function relativeTimestamp(value: string) {
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(delta / 60000));

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} h`;
  }

  const days = Math.floor(hours / 24);
  return `${days} d`;
}

export function getChecklistProgress(items: Array<{ completed: boolean }>) {
  if (items.length === 0) {
    return 0;
  }

  const completed = items.filter((item) => item.completed).length;
  return Math.round((completed / items.length) * 100);
}

export function getChecklistSummary(items: Array<{ completed: boolean }>) {
  const completed = items.filter((item) => item.completed).length;
  return `${completed}/${items.length}`;
}

export function initialsFromName(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function toneButtonClass(active: boolean) {
  return cn(
    "flex w-full items-center justify-between rounded-[1rem] border px-3 py-3 text-left transition-colors",
    active
      ? "border-white/14 bg-white/8 text-white"
      : "border-white/7 bg-white/3 text-[#cbd3e5] hover:bg-white/6",
  );
}
