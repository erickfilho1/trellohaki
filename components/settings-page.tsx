"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowSquareOut, Camera, CheckCircle, DotsThree, ShieldCheck } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { ClientLayout } from "@/components/client-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFlowBoardData } from "@/hooks/use-flowboard-store";
import { ACCOUNT_SETTINGS_STORAGE_KEY, initialsFromName, readStoredAccountSettings } from "@/lib/account-settings";
import { cn } from "@/lib/utils";

export function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { logout, user } = useAuth();
  const { boards } = useFlowBoardData();
  const currentBoard = boards[0];
  const [displayName, setDisplayName] = useState(user.name);
  const [avatarDataUrl, setAvatarDataUrl] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = readStoredAccountSettings();
    setDisplayName(stored.displayName || user.name);
    setAvatarDataUrl(stored.avatarDataUrl || user.avatarUrl || "");
  }, [user.avatarUrl, user.name]);

  const initials = useMemo(() => initialsFromName(displayName || user.name || "Painel Haki"), [displayName, user.name]);
  const remainingChars = Math.max(0, 32 - displayName.length);

  function saveSettings() {
    window.localStorage.setItem(
      ACCOUNT_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        displayName: displayName.trim() || user.name,
        avatarDataUrl,
      }),
    );
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarDataUrl(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
  }

  return (
    <ClientLayout projectName={currentBoard?.name ?? "Painel Haki"}>
      <main className="flowboard-scrollbar min-h-0 flex-1 overflow-y-auto bg-[#0b0b0b] text-white">
        <header className="sticky top-0 z-20 border-b border-white/8 bg-[#0b0b0b]/92 px-5 py-4 backdrop-blur-xl sm:px-8">
          <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-4">
            <div className="w-12" />
            <h1 className="text-sm font-semibold tracking-[-0.02em] text-[#f4f4f5]">Configurações</h1>
            <button
              type="button"
              aria-label="Mais opções"
              className="grid size-10 place-items-center rounded-full border border-transparent text-[#a1a1aa] transition hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
            >
              <DotsThree size={22} weight="bold" />
            </button>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-5 py-8 sm:px-8">
          <section className="overflow-hidden rounded-[1.35rem] border border-white/12 bg-[#101010] shadow-[0_30px_90px_-62px_rgba(0,0,0,0.9)]">
            <div className="grid items-center gap-8 px-7 py-8 md:grid-cols-[minmax(0,1fr)_auto] md:px-8">
              <div className="max-w-2xl">
                <h2 className="text-[1.45rem] font-semibold tracking-[-0.04em] text-white">Avatar</h2>
                <p className="mt-5 max-w-[58ch] text-[0.98rem] leading-7 text-[#d6d6d6]">
                  Esta é sua imagem no painel. Clique no avatar para enviar um arquivo do seu computador.
                </p>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group relative grid size-28 place-items-center justify-self-start overflow-hidden rounded-full border border-white/12 bg-[#171717] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:-translate-y-0.5 hover:border-[#dc3933]/45 md:justify-self-end"
              >
                {avatarDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarDataUrl} alt="Avatar do usuário" className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_28%_24%,#363636,#171717_44%,#0d0d0d)] text-3xl font-semibold text-[#f4f4f5]">
                    {initials}
                  </span>
                )}
                <span className="absolute inset-0 grid place-items-center bg-black/45 opacity-0 transition group-hover:opacity-100">
                  <Camera size={24} weight="duotone" />
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            <div className="border-t border-white/10 px-7 py-5 text-sm text-[#a1a1aa] md:px-8">
              O avatar é opcional, mas ajuda a reconhecer responsáveis em comentários e convites.
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.35rem] border border-white/12 bg-[#101010] shadow-[0_30px_90px_-62px_rgba(0,0,0,0.9)]">
            <div className="px-7 py-8 md:px-8">
              <h2 className="text-[1.45rem] font-semibold tracking-[-0.04em] text-white">Nome de exibição</h2>
              <p className="mt-5 max-w-[68ch] text-[0.98rem] leading-7 text-[#d6d6d6]">
                Use seu nome completo ou um nome curto que deixe claro quem está movimentando demandas.
              </p>

              <div className="mt-6 max-w-[420px] space-y-2">
                <label className="text-sm font-medium text-[#f4f4f5]" htmlFor="display-name">
                  Nome
                </label>
                <Input
                  id="display-name"
                  value={displayName}
                  maxLength={32}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="h-12 rounded-[0.85rem] border-white/14 bg-[#0b0b0b] px-4 text-white placeholder:text-[#666] focus-visible:border-[#dc3933]/70 focus-visible:ring-[#dc3933]/15"
                />
              </div>
            </div>

            <div className="flex flex-col gap-4 border-t border-white/10 px-7 py-5 sm:flex-row sm:items-center sm:justify-between md:px-8">
              <p className="text-sm text-[#a1a1aa]">Use no máximo 32 caracteres. Restam {remainingChars}.</p>
              <Button
                onClick={saveSettings}
                className={cn(
                  "h-10 rounded-[0.85rem] px-5 text-sm font-semibold transition",
                  saved
                    ? "bg-[#1f7a4a] text-white hover:bg-[#238a55]"
                    : "bg-[#f4f4f5] text-[#111] hover:bg-white",
                )}
              >
                {saved ? <CheckCircle size={16} weight="fill" /> : null}
                {saved ? "Salvo" : "Salvar"}
              </Button>
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.35rem] border border-white/12 bg-[#101010] shadow-[0_30px_90px_-62px_rgba(0,0,0,0.9)]">
            <div className="grid gap-6 px-7 py-8 md:grid-cols-[minmax(0,1fr)_auto] md:px-8">
              <div>
                <h2 className="text-[1.45rem] font-semibold tracking-[-0.04em] text-white">Acesso</h2>
                <p className="mt-5 max-w-[68ch] text-[0.98rem] leading-7 text-[#d6d6d6]">
                  Seu email fica vinculado ao painel correto. As permissões mudam conforme o perfil liberado no admin.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1rem] border border-white/10 bg-[#0b0b0b] p-4">
                    <p className="text-xs tracking-[0.18em] text-[#8e8e93] uppercase">Email</p>
                    <p className="mt-2 truncate text-sm font-medium text-white">{user.email || "sem email ativo"}</p>
                  </div>
                  <div className="rounded-[1rem] border border-white/10 bg-[#0b0b0b] p-4">
                    <p className="text-xs tracking-[0.18em] text-[#8e8e93] uppercase">Perfil</p>
                    <p className="mt-2 flex items-center gap-2 text-sm font-medium text-white">
                      <ShieldCheck size={16} className="text-[#dc3933]" />
                      {user.panel}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  logout();
                  router.replace("/login");
                }}
                className="h-11 self-start rounded-[0.95rem] border-white/12 bg-white/[0.035] px-5 text-white hover:border-[#dc3933]/40 hover:bg-[#dc3933]/12"
              >
                <ArrowSquareOut size={16} />
                Logout
              </Button>
            </div>
          </section>
        </div>
      </main>
    </ClientLayout>
  );
}
