import { cleanProfileName } from "@/lib/account-settings";
import { stripHtml } from "@/lib/flowboard-helpers";
import type {
  ActivityRecord,
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
  const legacyMatches = [...content.matchAll(/data-mention-id="([^"]+)"/g)];
  const linkMatches = [...content.matchAll(/href="mention:\/\/([^"]+)"/g)];

  return [
    ...new Set(
      [...legacyMatches, ...linkMatches]
        .map((match) => match[1])
        .filter(Boolean),
    ),
  ];
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

function findLatestAssignmentActivity(card: CardRecord, member: MemberRecord) {
  const normalizedMemberName = normalizeText(cleanProfileName(member.name));

  return card.activity.reduce<ActivityRecord | null>((latest, activity) => {
    const normalizedActivityText = normalizeText(activity.text);
    const assignedMember =
      normalizedActivityText.includes("adicionou") &&
      normalizedActivityText.includes("ao card") &&
      normalizedActivityText.includes(normalizedMemberName);

    if (!assignedMember) {
      return latest;
    }

    if (!latest) {
      return activity;
    }

    return new Date(activity.createdAt).getTime() > new Date(latest.createdAt).getTime()
      ? activity
      : latest;
  }, null);
}

function buildAssignmentExcerpt(cardTitle: string) {
  return `Você foi marcado para acompanhar o card ${cardTitle}.`;
}

export function memberMatchesViewer(member: MemberRecord, viewer: { id?: string; name: string; email: string }) {
  const normalizedViewerId = viewer.id?.trim();
  const normalizedMemberName = normalizeText(cleanProfileName(member.name));
  const emailPrefix = normalizeText(viewer.email.split("@")[0] ?? "");
  const normalizedHandle = normalizeHandle(member.handle);
  const normalizedViewerEmail = normalizeText(viewer.email);

  if (normalizedViewerId && (member.id === viewer.id || member.id === `member-${normalizedViewerId}`)) {
    return true;
  }

  return (
    (member.id === "member-erick" && normalizedViewerEmail === "erickfilho281@gmail.com") ||
    normalizedHandle === emailPrefix ||
    normalizedHandle === normalizedViewerEmail ||
    normalizedMemberName === normalizeText(viewer.email.split("@")[0] ?? "")
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
        card.members.forEach((recipient) => {
          const assignmentActivity = findLatestAssignmentActivity(card, recipient);
          const notificationId = assignmentActivity
            ? `comment:${assignmentActivity.id}:${recipient.id}`
            : `comment:${card.id}:${recipient.id}`;

          notifications.push({
            id: notificationId,
            kind: "comment",
            boardId: board.id,
            boardName: board.name,
            cardId: card.id,
            cardTitle: card.title,
            actor:
              board.members.find((member) => member.id !== recipient.id && member.role === "Administrador") ??
              board.members.find((member) => member.id !== recipient.id) ??
              recipient,
            recipient,
            excerpt: buildAssignmentExcerpt(card.title),
            createdAt:
              assignmentActivity?.createdAt ??
              card.activity[card.activity.length - 1]?.createdAt ??
              card.comments[card.comments.length - 1]?.createdAt ??
              board.updatedAt,
            read: readSet.has(notificationId),
          });
        });

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
  viewer: { id?: string; name: string; email: string },
) {
  return notifications.filter((notification) => memberMatchesViewer(notification.recipient, viewer));
}

export function getNotificationActionLabel(notification: NotificationRecord) {
  if (notification.kind === "mention") {
    return "mencionou você em";
  }

  return "marcou você em";
}

export function insertMentionValue(currentHtml: string, member: MemberRecord) {
  const mentionValue = `<a href="mention://${member.id}" class="flowboard-mention-chip">@${cleanProfileName(member.name)}</a>&nbsp;`;
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
