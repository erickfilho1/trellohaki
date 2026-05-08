import { cleanProfileName } from "@/lib/account-settings";
import { stripHtml } from "@/lib/flowboard-helpers";
import type {
  BoardRecord,
  CardRecord,
  CommentRecord,
  MemberRecord,
  NotificationRecord,
} from "@/lib/flowboard-types";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeHandle(handle: string) {
  return normalizeText(handle.replace(/^@/, ""));
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function buildMentionTokens(member: MemberRecord) {
  const normalizedName = normalizeText(cleanProfileName(member.name));
  const firstName = normalizedName.split(" ")[0] ?? normalizedName;
  const compactName = normalizedName.replace(/\s+/g, "");
  const handle = normalizeHandle(member.handle);
  const initials = normalizeText(member.initials);

  return uniqueById(
    [normalizedName, firstName, compactName, handle, initials]
      .filter(Boolean)
      .map((value) => ({ id: `${member.id}:${value}`, value })),
  ).map((item) => item.value);
}

function extractMentionIdsFromHtml(content: string) {
  const matches = [...content.matchAll(/data-mention-id="([^"]+)"/g)];
  return [...new Set(matches.map((match) => match[1]).filter(Boolean))];
}

export function extractMentionedMembers(content: string, members: MemberRecord[], authorId?: string) {
  const explicitMentionIds = extractMentionIdsFromHtml(content);
  if (explicitMentionIds.length > 0) {
    return members.filter((member) => explicitMentionIds.includes(member.id) && member.id !== authorId);
  }

  const plainText = normalizeText(stripHtml(content));
  if (!plainText.includes("@")) {
    return [] as MemberRecord[];
  }

  return members.filter((member) => {
    if (member.id === authorId) {
      return false;
    }

    return buildMentionTokens(member).some((token) => plainText.includes(`@${token}`));
  });
}

function truncateExcerpt(content: string) {
  const plainText = stripHtml(content);
  if (plainText.length <= 132) {
    return plainText;
  }

  return `${plainText.slice(0, 129).trimEnd()}...`;
}

export function memberMatchesViewer(member: MemberRecord, viewer: { name: string; email: string }) {
  const normalizedViewerName = normalizeText(cleanProfileName(viewer.name));
  const normalizedMemberName = normalizeText(cleanProfileName(member.name));
  const emailPrefix = normalizeText(viewer.email.split("@")[0] ?? "");
  const normalizedHandle = normalizeHandle(member.handle);

  return (
    (member.id === "member-erick" && normalizeText(viewer.email) === "erickfilho281@gmail.com") ||
    normalizedMemberName === normalizedViewerName ||
    normalizedHandle === emailPrefix ||
    normalizedHandle === normalizeText(viewer.email)
  );
}

export function buildNotificationsFromBoards(
  boards: BoardRecord[],
  readIds: string[],
): NotificationRecord[] {
  const readSet = new Set(readIds);
  const notifications: NotificationRecord[] = [];

  boards.forEach((board) => {
    board.lists.forEach((list) => {
      list.cards.forEach((card) => {
        card.comments.forEach((comment) => {
          const mentionedMembers = extractMentionedMembers(comment.text, board.members, comment.author.id);

          mentionedMembers.forEach((recipient) => {
            const notificationId = `mention:${comment.id}:${recipient.id}`;
            notifications.push({
              id: notificationId,
              kind: "mention",
              boardId: board.id,
              boardName: board.name,
              cardId: card.id,
              cardTitle: card.title,
              actor: comment.author,
              recipient,
              excerpt: truncateExcerpt(comment.text),
              createdAt: comment.createdAt,
              read: readSet.has(notificationId),
            });
          });
        });
      });
    });
  });

  return notifications.sort(
    (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  );
}

export function filterNotificationsForViewer(
  notifications: NotificationRecord[],
  viewer: { name: string; email: string },
) {
  return notifications.filter((notification) => memberMatchesViewer(notification.recipient, viewer));
}

export function insertMentionValue(currentHtml: string, member: MemberRecord) {
  const mentionValue = `<span data-mention-id="${member.id}" data-mention-name="${cleanProfileName(member.name)}" class="flowboard-mention-chip">@${cleanProfileName(member.name)}</span>&nbsp;`;
  if (!currentHtml.trim()) {
    return `<p>${mentionValue}</p>`;
  }

  return `${currentHtml}<p>${mentionValue}</p>`;
}

export function getNotificationCard(board: BoardRecord | undefined, cardId: string) {
  if (!board) {
    return null as CardRecord | null;
  }

  for (const list of board.lists) {
    const card = list.cards.find((item) => item.id === cardId);
    if (card) {
      return card;
    }
  }

  return null;
}
