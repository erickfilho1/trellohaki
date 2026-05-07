"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  CheckCircle,
  FilmSlate,
  GlobeHemisphereWest,
  ImageSquare,
  LinkSimple,
  Palette,
  Password,
  TrayArrowDown,
  UploadSimple,
  User,
  X,
} from "@phosphor-icons/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createId, stripHtml } from "@/lib/flowboard-helpers";
import { uploadProjectSummaryImageAsset } from "@/lib/supabase/storage";
import type {
  CardRecord,
  ProjectSummaryDepartmentKey,
  ProjectSummaryFieldRecord,
  ProjectSummaryRecord,
  ProjectSummarySectionRecord,
} from "@/lib/flowboard-types";
import { cn } from "@/lib/utils";

const DEPARTMENT_META: Record<
  ProjectSummaryDepartmentKey,
  {
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }
> = {
  design: {
    title: "Design",
    subtitle: "Artes, briefings, imagens e arquivos criativos.",
    icon: Palette,
  },
  video: {
    title: "Vídeo",
    subtitle: "Roteiro, materiais, cortes e links finais.",
    icon: FilmSlate,
  },
  webdesign: {
    title: "Webdesign",
    subtitle: "Site publicado, WordPress e acessos técnicos.",
    icon: GlobeHemisphereWest,
  },
};

function createFields(
  definitions: Array<Omit<ProjectSummaryFieldRecord, "id" | "value"> & { value?: string }>,
): ProjectSummaryFieldRecord[] {
  return definitions.map((field) => ({
    id: createId("summary-field"),
    value: field.value ?? "",
    ...field,
  }));
}

function createDefaultSummary(card: CardRecord): ProjectSummaryRecord {
  const descriptionText = stripHtml(card.description);
  const linksText = card.attachments.map((attachment) => attachment.url).join("\n");
  const attachmentNames = card.attachments.map((attachment) => attachment.name).join("\n");
  const labelText = card.labels.map((label) => label.name).join(", ");
  const customFieldsText = card.customFields.map((field) => `${field.name}: ${field.value}`).join("\n");
  const lowerLabels = labelText.toLowerCase();

  const designEnabled =
    lowerLabels.includes("design") ||
    lowerLabels.includes("arte") ||
    lowerLabels.includes("conteúdo") ||
    Boolean(descriptionText || linksText);
  const videoEnabled = lowerLabels.includes("video") || lowerLabels.includes("vídeo");
  const webdesignEnabled =
    lowerLabels.includes("site") ||
    lowerLabels.includes("lp") ||
    lowerLabels.includes("landing") ||
    lowerLabels.includes("web");

  const designFields = createFields([
    {
      label: "Briefing",
      placeholder: "Resumo do pedido, objetivos, referências e direcionamento visual.",
      multiline: true,
      value: descriptionText,
    },
    {
      label: "Links úteis",
      placeholder: "Links do Drive, Figma, Notion ou links do cliente.",
      multiline: true,
      value: linksText,
    },
    {
      label: "Imagens e assets",
      placeholder: "Liste imagens aprovadas, bancos, nomes de arquivos ou referências.",
      multiline: true,
      value: attachmentNames,
    },
    {
      label: "Observações de design",
      placeholder: "Ajustes finais, observações e decisões visuais aprovadas.",
      multiline: true,
      value: customFieldsText,
    },
  ]);

  const videoFields = createFields([
    {
      label: "Briefing do vídeo",
      placeholder: "Objetivo do vídeo, linguagem, duração e entregáveis.",
      multiline: true,
      value: descriptionText,
    },
    {
      label: "Roteiro e observações",
      placeholder: "Copie aqui roteiro, cortes, cenas ou direcionamento de edição.",
      multiline: true,
    },
    {
      label: "Links de vídeo",
      placeholder: "Link do Drive, Vimeo, frame.io ou pasta final.",
      multiline: true,
      value: linksText,
    },
    {
      label: "Assets e materiais",
      placeholder: "Música, locução, imagens, motion files e observações.",
      multiline: true,
      value: attachmentNames,
    },
  ]);

  const webdesignFields = createFields([
    {
      label: "Link do site",
      placeholder: "https://www.seusite.com.br",
      value: card.attachments[0]?.url ?? "",
    },
    {
      label: "WordPress admin",
      placeholder: "https://dominio.com/wp-admin",
      value: "",
    },
    {
      label: "Usuário",
      placeholder: "usuario-admin",
      value: "",
    },
    {
      label: "Senha",
      placeholder: "Senha de acesso do WordPress",
      value: "",
      secret: true,
    },
    {
      label: "Hospedagem",
      placeholder: "Dados da hospedagem, painel ou provedor.",
      multiline: true,
      value: customFieldsText,
    },
    {
      label: "Registro.br / domínio",
      placeholder: "Dados de domínio, registrador e observações.",
      multiline: true,
    },
  ]);

  return {
    updatedAt: new Date().toISOString(),
    sections: {
      design: {
        id: "design",
        title: DEPARTMENT_META.design.title,
        description: DEPARTMENT_META.design.subtitle,
        enabled: designEnabled,
        fields: designFields,
      },
      video: {
        id: "video",
        title: DEPARTMENT_META.video.title,
        description: DEPARTMENT_META.video.subtitle,
        enabled: videoEnabled,
        fields: videoFields,
      },
      webdesign: {
        id: "webdesign",
        title: DEPARTMENT_META.webdesign.title,
        description: DEPARTMENT_META.webdesign.subtitle,
        enabled: webdesignEnabled,
        fields: webdesignFields,
      },
    },
  };
}

function cloneSummary(summary: ProjectSummaryRecord): ProjectSummaryRecord {
  return {
    ...summary,
    sections: Object.fromEntries(
      Object.entries(summary.sections).map(([key, section]) => [
        key,
        {
          ...section,
          fields: section.fields.map((field) => ({ ...field })),
        },
      ]),
    ) as ProjectSummaryRecord["sections"],
  };
}

function countFilledFields(section: ProjectSummarySectionRecord) {
  return section.fields.filter((field) => field.value.trim()).length;
}

export function DeliveredProjectSummaryModal({
  open,
  onOpenChange,
  card,
  folderName,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: CardRecord | null;
  folderName: string;
  onSave: (summary: ProjectSummaryRecord) => void;
}) {
  const initialSummary = useMemo(
    () => (card ? (card.projectSummary ? cloneSummary(card.projectSummary) : createDefaultSummary(card)) : null),
    [card],
  );
  const [draft, setDraft] = useState<ProjectSummaryRecord | null>(initialSummary);
  const [activeDepartment, setActiveDepartment] = useState<ProjectSummaryDepartmentKey>(() => {
    if (!initialSummary) {
      return "design";
    }

    return (
      (Object.values(initialSummary.sections).find((section) => section.enabled)?.id as
        | ProjectSummaryDepartmentKey
        | undefined) ?? "design"
    );
  });

  const currentSection = draft?.sections[activeDepartment];
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadingFieldId, setUploadingFieldId] = useState<string | null>(null);
  const filledSectionCount = useMemo(() => {
    if (!draft) {
      return 0;
    }

    return Object.values(draft.sections).filter((section) => section.enabled).length;
  }, [draft]);

  if (!card || !draft || !currentSection) {
    return null;
  }

  function updateField(fieldId: string, updater: (field: ProjectSummaryFieldRecord) => ProjectSummaryFieldRecord) {
    setDraft((current) =>
      current
        ? {
            ...current,
            sections: {
              ...current.sections,
              [activeDepartment]: {
                ...current.sections[activeDepartment],
                fields: current.sections[activeDepartment].fields.map((item) =>
                  item.id === fieldId ? updater(item) : item,
                ),
              },
            },
          }
        : current,
    );
  }

  function handleMediaUpload(fieldId: string, files: FileList | null) {
    if (!card) {
      return;
    }

    if (!files?.length) {
      return;
    }

    const entries = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!entries.length) {
      return;
    }

    const cardId = card.id;
    setUploadingFieldId(fieldId);
    Promise.all(
      entries.map(async (file) => {
        const uploaded = await uploadProjectSummaryImageAsset({
          cardId,
          fieldId,
          file,
        });

        return {
          id: createId("summary-media"),
          name: uploaded.name,
          url: uploaded.publicUrl,
        };
      }),
    )
      .then((mediaItems) => {
        updateField(fieldId, (field) => ({
          ...field,
          media: [...(field.media ?? []), ...mediaItems.filter((item) => item.url)],
        }));
      })
      .catch((error) => {
        console.warn("Nao foi possivel enviar as imagens do resumo.", error);
      })
      .finally(() => {
        setUploadingFieldId(null);
        const input = fileInputsRef.current[fieldId];
        if (input) {
          input.value = "";
        }
      });
  }

  function removeMedia(fieldId: string, mediaId: string) {
    updateField(fieldId, (field) => ({
      ...field,
      media: (field.media ?? []).filter((item) => item.id !== mediaId),
    }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="h-[82vh] !w-[min(1220px,calc(100vw-2.5rem))] !max-w-[min(1220px,calc(100vw-2.5rem))] overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#161a22] p-0 text-white shadow-[0_52px_140px_-36px_rgba(0,0,0,0.98)]"
        style={{
          width: "min(1220px, calc(100vw - 2.5rem))",
          maxWidth: "min(1220px, calc(100vw - 2.5rem))",
        }}
      >
        <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden min-[1240px]:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-h-0 flex-col overflow-hidden min-[1240px]:border-r min-[1240px]:border-white/8">
            <div className="border-b border-white/8 bg-[linear-gradient(180deg,#181e2a,#151923)] px-6 py-6 min-[1240px]:px-8 min-[1240px]:py-7">
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8ea0c8]">
                    Resumo de entrega
                  </p>
                  <h2 className="mt-3 text-[1.6rem] font-semibold tracking-[-0.05em] text-white min-[1240px]:text-[2rem]">
                    {card.title}
                  </h2>
                  <p className="mt-3 max-w-[58ch] text-[0.92rem] leading-7 text-[#98a6c2]">
                    Organize os entregáveis por departamento para o cliente acessar briefing, arquivos, links e acessos sem depender do board operacional.
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2 rounded-full border border-emerald-400/18 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
                  <CheckCircle size={16} weight="fill" />
                  Entrega consolidada
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2.5 min-[1240px]:gap-3">
                {(Object.keys(DEPARTMENT_META) as ProjectSummaryDepartmentKey[]).map((departmentKey) => {
                  const section = draft.sections[departmentKey];
                  const Icon = DEPARTMENT_META[departmentKey].icon;
                  const active = activeDepartment === departmentKey;
                  return (
                    <button
                      key={departmentKey}
                      type="button"
                      onClick={() => setActiveDepartment(departmentKey)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-[1rem] border px-3.5 py-2.5 text-left transition-all duration-200 min-[1240px]:px-4 min-[1240px]:py-3",
                        active
                          ? "border-[#7ea3ff]/45 bg-[#202b43] text-white shadow-[0_18px_40px_-24px_rgba(41,83,160,0.85)]"
                          : "border-white/8 bg-white/[0.03] text-[#d6def1] hover:bg-white/[0.06]",
                      )}
                    >
                      <Icon size={18} className={active ? "text-[#9db9ff]" : "text-[#9aa7c0]"} />
                      <span className="text-sm font-medium">{section.title}</span>
                      <span className="rounded-full bg-black/18 px-2 py-0.5 text-[11px] text-[#a5b4d2]">
                        {countFilledFields(section)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flowboard-scrollbar flex-1 min-h-0 overflow-y-auto px-6 py-6 pb-24 min-[1240px]:px-8 min-[1240px]:py-7">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[1.1rem] font-semibold tracking-[-0.03em] text-white min-[1240px]:text-[1.2rem]">
                    {currentSection.title}
                  </h3>
                  <p className="mt-2 max-w-[56ch] text-sm leading-7 text-[#96a3be]">
                    {currentSection.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            sections: {
                              ...current.sections,
                              [activeDepartment]: {
                                ...current.sections[activeDepartment],
                                enabled: !current.sections[activeDepartment].enabled,
                              },
                            },
                          }
                        : current,
                    )
                  }
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-2 text-sm transition-colors",
                    currentSection.enabled
                      ? "border-emerald-400/22 bg-emerald-400/10 text-emerald-200"
                      : "border-white/10 bg-white/[0.04] text-[#cbd5ea]",
                  )}
                >
                  {currentSection.enabled ? "Departamento ativo" : "Ativar departamento"}
                </button>
              </div>

              <div className="grid gap-4">
                {currentSection.fields.map((field) => (
                  <div
                    key={field.id}
                    className="rounded-[1.15rem] border border-white/8 bg-white/[0.03] p-4"
                  >
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#dde5f4]">
                      {field.secret ? (
                        <Password size={16} className="text-[#9fb3da]" />
                      ) : field.label.toLowerCase().includes("link") ? (
                        <LinkSimple size={16} className="text-[#9fb3da]" />
                      ) : field.label.toLowerCase().includes("imagem") ? (
                        <ImageSquare size={16} className="text-[#9fb3da]" />
                      ) : field.label.toLowerCase().includes("usuário") || field.label.toLowerCase().includes("usuario") ? (
                        <User size={16} className="text-[#9fb3da]" />
                      ) : (
                        <TrayArrowDown size={16} className="text-[#9fb3da]" />
                      )}
                      {field.label}
                    </div>

                    {field.label.toLowerCase().includes("imagem") ? (
                      <div className="mb-3">
                        <input
                          ref={(node) => {
                            fileInputsRef.current[field.id] = node;
                          }}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(event) => handleMediaUpload(field.id, event.target.files)}
                        />

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputsRef.current[field.id]?.click()}
                            disabled={uploadingFieldId === field.id}
                            className="inline-flex h-10 items-center gap-2 rounded-[0.95rem] border border-white/10 bg-[#1c212b] px-3.5 text-sm text-white transition-colors hover:bg-[#212735] disabled:cursor-wait disabled:opacity-60"
                          >
                            <UploadSimple size={16} className="text-[#9fb3da]" />
                            {uploadingFieldId === field.id ? "Enviando..." : "Adicionar imagens"}
                          </button>
                          <span className="text-xs text-[#7f8dab]">
                            PNG, JPG, WEBP e outras imagens para esta entrega.
                          </span>
                        </div>

                        {field.media?.length ? (
                          <div className="mt-3 grid grid-cols-2 gap-3 min-[900px]:grid-cols-3">
                            {field.media.map((media) => (
                              <div
                                key={media.id}
                                className="group relative overflow-hidden rounded-[1rem] border border-white/10 bg-[#1b202a]"
                              >
                                <Image
                                  src={media.url}
                                  alt={media.name}
                                  width={480}
                                  height={224}
                                  className="h-28 w-full object-cover"
                                  unoptimized
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-3 py-2">
                                  <p className="truncate text-xs text-white/92">{media.name}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeMedia(field.id, media.id)}
                                  className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full border border-white/12 bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {field.multiline ? (
                      <textarea
                        value={field.value}
                        onChange={(event) => updateField(field.id, (currentField) => ({ ...currentField, value: event.target.value }))}
                        placeholder={field.placeholder}
                        className="min-h-[116px] w-full resize-y rounded-[1rem] border border-white/10 bg-[#1c212b] px-4 py-3 text-sm leading-7 text-white outline-none placeholder:text-[#73819c] focus:border-[#6f92f4]"
                      />
                    ) : (
                      <Input
                        type={field.secret ? "password" : "text"}
                        value={field.value}
                        onChange={(event) => updateField(field.id, (currentField) => ({ ...currentField, value: event.target.value }))}
                        placeholder={field.placeholder}
                        className="h-12 rounded-[1rem] border-white/10 bg-[#1c212b] text-white placeholder:text-[#73819c]"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="flowboard-scrollbar h-full min-h-0 overflow-y-auto border-t border-white/8 bg-[linear-gradient(180deg,#121722,#0f131c)] px-6 py-6 min-[1240px]:border-l min-[1240px]:border-t-0 min-[1240px]:py-7">
            <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7f8bad]">
                Cliente / pasta
              </p>
              <h3 className="mt-3 text-[1.28rem] font-semibold text-white">{folderName}</h3>
              <p className="mt-2 text-sm leading-7 text-[#98a5bf]">
                Cada entrega fica ligada a esta pasta para o cliente consultar materiais finais, acessos e informações do projeto em um só lugar.
              </p>
            </div>

            <div className="mt-5 rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7f8bad]">
                Leitura rápida
              </p>
              <div className="mt-4 space-y-4 text-sm text-[#d7e0f1]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#96a3be]">Departamentos ativos</span>
                  <span>{filledSectionCount}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#96a3be]">Etiquetas do card</span>
                  <span>{card.labels.length}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#96a3be]">Anexos vinculados</span>
                  <span>{card.attachments.length}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#96a3be]">Campos extras</span>
                  <span>{card.customFields.length}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7f8bad]">
                Materiais já puxados
              </p>
              <div className="mt-4 space-y-3">
                {card.attachments.length === 0 ? (
                  <p className="text-sm leading-7 text-[#98a5bf]">
                    Este projeto ainda não tem anexos vinculados no card operacional.
                  </p>
                ) : (
                  card.attachments.slice(0, 5).map((attachment) => (
                    <div
                      key={attachment.id}
                      className="rounded-[0.95rem] border border-white/8 bg-[#1c212b] px-3 py-3"
                    >
                      <p className="text-sm font-medium text-white">{attachment.name}</p>
                      <p className="mt-1 text-xs leading-6 text-[#94a1bb]">{attachment.url}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Button
                onClick={() => {
                  onSave({
                    ...draft,
                    updatedAt: new Date().toISOString(),
                  });
                  onOpenChange(false);
                }}
                className="h-12 rounded-[1rem] border border-white/10 bg-[#5c86ff] text-white hover:bg-[#6b93ff]"
              >
                Salvar resumo
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-12 rounded-[1rem] border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06]"
              >
                Fechar
              </Button>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
