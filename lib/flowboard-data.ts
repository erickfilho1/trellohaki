import {
  DEFAULT_BOARD_MEMBERS,
  DEFAULT_JOIN_REQUESTS,
  DEFAULT_LABEL_CATALOG,
} from "@/lib/flowboard-constants";
import { createComment, createId, createLabel, createMemberActivity } from "@/lib/flowboard-helpers";
import type {
  BoardRecord,
  CardRecord,
  LabelRecord,
  ListRecord,
  NewCardPayload,
} from "@/lib/flowboard-types";

export function createCardRecord(payload: NewCardPayload): CardRecord {
  const owner = DEFAULT_BOARD_MEMBERS[0];

  return {
    id: createId("card"),
    title: payload.title,
    description: payload.description ?? "",
    labels:
      payload.labels?.map((label) => createLabel(label.name, label.tone, label.id)) ?? [],
    comments: [],
    dates: {
      startDate: payload.startDate,
      dueDate: payload.dueDate,
      recurring: "Nunca",
      reminder: "1 dia antes",
    },
    checklists: [],
    attachments: [],
    members: owner ? [owner] : [],
    activity: [createMemberActivity("Voce adicionou este card")],
    customFields: [],
    cover: undefined,
    deliveredFolderId: undefined,
    location: "",
  };
}

export function createListRecord(title: string): ListRecord {
  return {
    id: createId("list"),
    title,
    cards: [],
    color: null,
    following: false,
  };
}

export function createBoardRecord(payload: {
  name: string;
  description: string;
  accent: string;
}): BoardRecord {
  const createdAt = new Date().toISOString();
  return {
    id: createId("board"),
    name: payload.name,
    description: payload.description,
    accent: payload.accent,
    updatedAt: createdAt,
    lists: [],
    members: DEFAULT_BOARD_MEMBERS,
    joinRequests: DEFAULT_JOIN_REQUESTS,
    shareLink: "",
    labelCatalog: DEFAULT_LABEL_CATALOG,
    deliveredFolders: [
      {
        id: createId("delivered-folder"),
        name: payload.name,
        color: "green",
        createdAt,
      },
    ],
  };
}

function catalogLabel(name: string): LabelRecord | undefined {
  return DEFAULT_LABEL_CATALOG.find((label) => label.name === name);
}

export function createInitialBoards(): BoardRecord[] {
  return [
    {
      id: "board-hub",
      name: "Agencia Vibefor",
      description: "Quadro operacional com o mesmo clima visual do HUB para design e entrega.",
      accent: "from-[#1d7185] via-[#3a2857] to-[#6f365d]",
      updatedAt: new Date().toISOString(),
      members: DEFAULT_BOARD_MEMBERS,
      joinRequests: DEFAULT_JOIN_REQUESTS,
      shareLink: "",
      labelCatalog: DEFAULT_LABEL_CATALOG,
      deliveredFolders: [
        {
          id: "folder-vibefor",
          name: "Agencia Vibefor",
          color: "green",
          createdAt: new Date().toISOString(),
        },
      ],
      lists: [
        {
          id: "list-rules",
          title: "REGRAS",
          cards: [
            {
              ...createCardRecord({
                title: "Seja bem-vindo ao painel de design",
                description:
                  "Centralize demandas, arquivos e aprovacoes em um fluxo unico. Este card pode ser usado como introducao do board.",
                labels: [
                  {
                    id: catalogLabel("Design")?.id,
                    name: "Design",
                    tone: "blue",
                  },
                ],
              }),
              attachments: [
                {
                  id: createId("attachment"),
                  name: "Diretrizes do painel",
                  url: "https://flowboard.local/regra-inicial",
                  kind: "link",
                },
              ],
              color: "cyan",
            } as CardRecord & { color?: string },
            createCardRecord({
              title: "Regra de inicio",
              description:
                "Abra este card antes de delegar qualquer demanda para alinhar prazo, copy e anexos.",
              labels: [
                {
                  id: catalogLabel("Urgente")?.id,
                  name: "Urgente",
                  tone: "red",
                },
              ],
            }),
          ],
          color: "cyan",
          following: true,
        },
        {
          id: "list-inbound",
          title: "COMO DELEGAR DEMANDAS",
          cards: [
            {
              ...createCardRecord({
                title: "Template: Novo site ou LP",
                description:
                  "1. OBJETIVO DO PROJETO\n- Ex.: Vender curso X, captura de leads e site institucional para passar autoridade.\n\n1. CONTEUDO (COPY E IMAGENS)\n- Textos finais aprovados.\n- Pasta com imagens e videos em alta resolucao.\n- Observacao: sem copy final, o design nao inicia.",
                labels: [
                  {
                    id: catalogLabel("LP / Site")?.id,
                    name: "LP / Site",
                    tone: "yellow",
                  },
                  {
                    id: catalogLabel("Projeto ja comecou")?.id,
                    name: "Projeto ja comecou",
                    tone: "green",
                  },
                ],
              }),
              comments: [
                createComment(
                  DEFAULT_BOARD_MEMBERS[1],
                  "Pode usar este card como base para novas demandas do cliente.",
                ),
              ],
              activity: [
                createMemberActivity("Voce adicionou este card"),
                createMemberActivity("Voce adicionou a etiqueta LP / Site"),
              ],
            },
            createCardRecord({
              title: "Manutencao",
              description: "Resumo do problema, links afetados e prioridade comercial.",
              labels: [
                {
                  id: catalogLabel("Manutencao")?.id,
                  name: "Manutencao",
                  tone: "orange",
                },
              ],
            }),
            {
              ...createCardRecord({
                title: "Ajuste de pagina",
                description:
                  "Indique a pagina, a secao e o print de referencia para agilizar o ajuste.",
                labels: [
                  {
                    id: catalogLabel("Em alteracao")?.id,
                    name: "Em alteracao",
                    tone: "yellow-dark",
                  },
                ],
                dueDate: "2026-05-06T02:55:00.000Z",
              }),
              dates: {
                startDate: "2026-05-04T15:00:00.000Z",
                dueDate: "2026-05-06T02:55:00.000Z",
                recurring: "Nunca",
                reminder: "1 dia antes",
              },
            },
          ],
          color: "green-dark",
          following: true,
        },
        {
          id: "list-request",
          title: "Solicitacao",
          cards: [],
          color: null,
          following: false,
        },
        {
          id: "list-progress",
          title: "Em andamento",
          cards: [],
          color: null,
          following: false,
        },
        {
          id: "list-done",
          title: "Concluido",
          cards: [],
          color: null,
          following: false,
        },
      ],
    },
  ];
}

export function normalizeBoardState(boards: BoardRecord[]): BoardRecord[] {
  return boards.map((board) => ({
    ...board,
    members: board.members?.length ? board.members : DEFAULT_BOARD_MEMBERS,
    joinRequests: board.joinRequests?.length ? board.joinRequests : DEFAULT_JOIN_REQUESTS,
    shareLink: board.shareLink ?? "",
    labelCatalog: board.labelCatalog?.length ? board.labelCatalog : DEFAULT_LABEL_CATALOG,
    deliveredFolders:
      board.deliveredFolders?.length
        ? board.deliveredFolders
        : [
            {
              id: createId("delivered-folder"),
              name: board.name,
              color: "green",
              createdAt: new Date().toISOString(),
            },
          ],
    lists: board.lists.map((list) => ({
      ...list,
      color: list.color ?? null,
      following: list.following ?? false,
      cards: list.cards.map((card) => {
        const legacyChecklist =
          "checklist" in card
            ? (card as CardRecord & { checklist?: { total: number; completed: number } }).checklist
            : undefined;
        const effectiveCatalog = board.labelCatalog?.length ? board.labelCatalog : DEFAULT_LABEL_CATALOG;
        return {
          ...card,
          labels:
            card.labels?.map((label) => {
              const fromCatalog = effectiveCatalog.find((item) => item.id === label.id || item.name === label.name);
              return fromCatalog
                ? { ...fromCatalog }
                : createLabel(label.name, label.tone, label.id);
            }) ?? [],
          comments: card.comments ?? [],
          dates: card.dates ?? {
            startDate: undefined,
            dueDate: (card as CardRecord & { dueDate?: string }).dueDate,
            recurring: "Nunca",
            reminder: "1 dia antes",
          },
          checklists:
            card.checklists ??
            (legacyChecklist && legacyChecklist.total > 0
              ? [
                  {
                    id: createId("checklist"),
                    title: "Checklist",
                    items: Array.from({ length: legacyChecklist.total }, (_, index) => ({
                      id: createId(`item-${index}`),
                      text: `Item ${index + 1}`,
                      completed: index < legacyChecklist.completed,
                    })),
                  },
                ]
              : []),
          attachments: card.attachments ?? [],
          members:
            card.members?.length
              ? card.members
              : board.members?.slice(0, 1) ?? DEFAULT_BOARD_MEMBERS.slice(0, 1),
          activity: card.activity ?? [createMemberActivity("Voce adicionou este card")],
          customFields: card.customFields ?? [],
          cover: card.cover
            ? {
                ...card.cover,
                size: card.cover.size ?? "header",
              }
            : undefined,
          deliveredFolderId: card.deliveredFolderId,
          location: card.location ?? "",
        };
      }),
    })),
  }));
}
