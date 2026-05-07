import type { BoardRole, LabelRecord, LabelTone, MemberRecord } from "@/lib/flowboard-types";

export const LABEL_COLOR_ORDER: LabelTone[] = [
  "green-dark",
  "yellow-dark",
  "orange",
  "red-dark",
  "purple-dark",
  "green",
  "yellow",
  "orange",
  "red",
  "purple",
  "green-light",
  "yellow",
  "orange",
  "coral",
  "lilac",
  "blue-dark",
  "cyan",
  "green-dark",
  "purple-dark",
  "gray",
  "blue",
  "cyan",
  "green",
  "pink",
  "gray",
  "blue-light",
  "blue-light",
  "green-light",
  "pink",
  "gray",
];

export const LABEL_COLOR_SWATCHES: Record<
  LabelTone,
  { solid: string; text: string; surface: string; border: string; preview: string }
> = {
  "green-dark": {
    solid: "bg-[#1b6140]",
    text: "text-white",
    surface: "bg-[#1b6140]/22",
    border: "border-[#2d8b60]/30",
    preview: "#1b6140",
  },
  green: {
    solid: "bg-[#2f8d62]",
    text: "text-white",
    surface: "bg-[#2f8d62]/22",
    border: "border-[#47b27f]/30",
    preview: "#2f8d62",
  },
  "green-light": {
    solid: "bg-[#52c78d]",
    text: "text-[#0b1e16]",
    surface: "bg-[#52c78d]/22",
    border: "border-[#79d9a8]/30",
    preview: "#52c78d",
  },
  "yellow-dark": {
    solid: "bg-[#7a5b05]",
    text: "text-white",
    surface: "bg-[#7a5b05]/22",
    border: "border-[#a37b08]/30",
    preview: "#7a5b05",
  },
  yellow: {
    solid: "bg-[#f0c629]",
    text: "text-[#2b2202]",
    surface: "bg-[#f0c629]/24",
    border: "border-[#f7d65f]/34",
    preview: "#f0c629",
  },
  orange: {
    solid: "bg-[#c36b05]",
    text: "text-white",
    surface: "bg-[#c36b05]/24",
    border: "border-[#df8f37]/30",
    preview: "#c36b05",
  },
  "red-dark": {
    solid: "bg-[#7b2a1f]",
    text: "text-white",
    surface: "bg-[#7b2a1f]/22",
    border: "border-[#a54133]/30",
    preview: "#7b2a1f",
  },
  red: {
    solid: "bg-[#c63529]",
    text: "text-white",
    surface: "bg-[#c63529]/24",
    border: "border-[#db6158]/30",
    preview: "#c63529",
  },
  coral: {
    solid: "bg-[#fb6f67]",
    text: "text-[#32100e]",
    surface: "bg-[#fb6f67]/24",
    border: "border-[#ff8f89]/30",
    preview: "#fb6f67",
  },
  "purple-dark": {
    solid: "bg-[#5a2e73]",
    text: "text-white",
    surface: "bg-[#5a2e73]/24",
    border: "border-[#7a4697]/30",
    preview: "#5a2e73",
  },
  purple: {
    solid: "bg-[#8a45ba]",
    text: "text-white",
    surface: "bg-[#8a45ba]/24",
    border: "border-[#a467ce]/30",
    preview: "#8a45ba",
  },
  lilac: {
    solid: "bg-[#b56ae2]",
    text: "text-[#24112f]",
    surface: "bg-[#b56ae2]/24",
    border: "border-[#cb92ec]/30",
    preview: "#b56ae2",
  },
  "blue-dark": {
    solid: "bg-[#234989]",
    text: "text-white",
    surface: "bg-[#234989]/24",
    border: "border-[#3c6bbc]/30",
    preview: "#234989",
  },
  blue: {
    solid: "bg-[#2b63c8]",
    text: "text-white",
    surface: "bg-[#2b63c8]/24",
    border: "border-[#5485d8]/30",
    preview: "#2b63c8",
  },
  "blue-light": {
    solid: "bg-[#6996e2]",
    text: "text-[#13233f]",
    surface: "bg-[#6996e2]/24",
    border: "border-[#8fb2ec]/30",
    preview: "#6996e2",
  },
  cyan: {
    solid: "bg-[#2b7d9a]",
    text: "text-white",
    surface: "bg-[#2b7d9a]/24",
    border: "border-[#4b9eb9]/30",
    preview: "#2b7d9a",
  },
  pink: {
    solid: "bg-[#d468b4]",
    text: "text-[#311126]",
    surface: "bg-[#d468b4]/24",
    border: "border-[#e190cb]/30",
    preview: "#d468b4",
  },
  gray: {
    solid: "bg-[#6d7077]",
    text: "text-white",
    surface: "bg-[#6d7077]/24",
    border: "border-[#898e98]/30",
    preview: "#6d7077",
  },
};

export const DEFAULT_LABELS: Array<{ name: string; tone: LabelTone }> = [
  { name: "Projeto ja comecou", tone: "green" },
  { name: "Em alteracao", tone: "yellow-dark" },
  { name: "LP / Site", tone: "yellow" },
  { name: "Manutencao", tone: "orange" },
  { name: "Aguardando Acesso", tone: "orange" },
  { name: "Bloqueado/Falta Info", tone: "red-dark" },
  { name: "Urgente", tone: "red" },
  { name: "Design", tone: "blue" },
  { name: "Conteudo", tone: "gray" },
  { name: "Revisao", tone: "purple" },
  { name: "Aprovado", tone: "green-light" },
];

export const DEFAULT_LABEL_CATALOG: LabelRecord[] = DEFAULT_LABELS.map((label, index) => ({
  id: `catalog-${index + 1}`,
  name: label.name,
  tone: label.tone,
}));

export const DEFAULT_BOARD_MEMBERS: MemberRecord[] = [
  {
    id: "member-erick",
    name: "Erick Filho (voce)",
    handle: "@erickfilho281",
    role: "Administrador",
    initials: "EF",
  },
  {
    id: "member-cliente",
    name: "Cliente",
    handle: "@vibefor",
    role: "Membro",
    initials: "CL",
  },
  {
    id: "member-designer",
    name: "Designer",
    handle: "@studio.design",
    role: "Membro",
    initials: "DS",
  },
  {
    id: "member-copywriter",
    name: "Copywriter",
    handle: "@studio.copy",
    role: "Membro",
    initials: "CP",
  },
];

export const DEFAULT_JOIN_REQUESTS: MemberRecord[] = [
  {
    id: "member-ops",
    name: "Marina Costa",
    handle: "@marina.operations",
    role: "Observador",
    initials: "MC",
  },
];

export const BOARD_ROLES: BoardRole[] = ["Membro", "Observador", "Administrador"];
export const DATE_REMINDERS = ["Nenhum", "No horario", "10 minutos antes", "1 hora antes", "1 dia antes"];
export const DATE_RECURRENT_OPTIONS = ["Nunca", "Diariamente", "Semanalmente", "Mensalmente"];
