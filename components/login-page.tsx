"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  EyeSlash,
  GlobeHemisphereWest,
  Lightning,
} from "@phosphor-icons/react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "register";

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authenticated, login, logout, register, user } = useAuth();
  const searchMode = searchParams.get("mode") === "register" ? "register" : "login";
  const inviteBoardId = searchParams.get("board");
  const inviteEmail = searchParams.get("email") ?? "";
  const [mode, setMode] = useState<AuthMode>(searchMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: inviteEmail,
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    setMode(searchMode);
  }, [searchMode]);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      email: inviteEmail || current.email,
    }));
  }, [inviteEmail]);

  useEffect(() => {
    if (
      authenticated &&
      searchMode === "register" &&
      inviteEmail.trim() &&
      user.email.trim().toLowerCase() !== inviteEmail.trim().toLowerCase()
    ) {
      void logout();
    }
  }, [authenticated, inviteEmail, logout, searchMode, user.email]);

  const title = useMemo(
    () =>
      mode === "login"
        ? "Entrar no Painel Haki"
        : "Criar acesso autorizado",
    [mode],
  );

  const subtitle = useMemo(
    () =>
      mode === "login"
        ? "Use seu email liberado para continuar no painel certo."
        : "O registro so e liberado para emails autorizados no painel admin.",
    [mode],
  );

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      if (mode === "register") {
        if (form.password !== form.confirmPassword) {
          setError("As senhas precisam ser iguais para concluir o registro.");
          return;
        }

        const result = await register({
          name: form.name,
          email: form.email,
          password: form.password,
          boardId: inviteBoardId,
        });

        if (!result.ok) {
          setError(result.error ?? "Nao foi possivel concluir o registro.");
          return;
        }

        router.replace(result.nextPath ?? "/");
        return;
      }

      const result = await login({
        email: form.email,
        password: form.password,
      });

      if (!result.ok) {
        setError(result.error ?? "Nao foi possivel entrar agora.");
        return;
      }

      router.replace(result.nextPath ?? "/");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flowboard-scrollbar relative h-[100dvh] overflow-y-auto bg-[#100809] px-3 py-4 sm:px-5 sm:py-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,57,51,0.2),transparent_32rem)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(120,24,22,0.18),transparent_32rem)]" />

      <div className="relative mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-[700px] items-center justify-center">
        <section className="flowboard-scrollbar w-full max-w-[580px] overflow-y-auto rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,#0d1018_0%,#0b0e15_100%)] px-5 py-6 shadow-[0_36px_120px_-44px_rgba(0,0,0,0.96)] sm:px-7 sm:py-7 lg:px-8 lg:py-8">
          <div className="mx-auto flex max-w-[420px] items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-[1rem] border border-[#ff6a5f]/20 bg-[#221316] text-[#ff5a4f] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <Lightning size={20} weight="fill" />
              </div>
              <div>
                <p className="text-[1.55rem] font-semibold tracking-[-0.045em] text-white">
                  Painel Haki
                </p>
                <p className="text-sm text-[#7e8ca7]">Acesso controlado por convite</p>
              </div>
            </div>

            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-[1rem] border border-white/10 bg-white/[0.03] px-4 text-sm text-white"
            >
              <GlobeHemisphereWest size={16} />
              PT-BR
            </button>
          </div>

          <div className="mx-auto mt-8 max-w-[420px] text-center sm:mt-9">
            <p className="text-[2rem] font-semibold tracking-[-0.06em] text-white sm:text-[2.35rem]">{title}</p>
            <p className="mt-2 text-sm leading-6 text-[#9aa5bc]">{subtitle}</p>
          </div>

          <div className="mx-auto mt-6 flex max-w-[420px] justify-center">
            <div className="inline-flex rounded-[1rem] border border-white/10 bg-white/[0.03] p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
                className={cn(
                  "h-10 rounded-[0.85rem] px-4 text-sm transition-all",
                  mode === "login"
                    ? "bg-[#321a1f] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    : "text-[#94a0b7] hover:text-white",
                )}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
                className={cn(
                  "h-10 rounded-[0.85rem] px-4 text-sm transition-all",
                  mode === "register"
                    ? "bg-[#321a1f] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    : "text-[#94a0b7] hover:text-white",
                )}
              >
                Registro
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mx-auto mt-6 max-w-[420px] space-y-3.5 pb-2">
            {mode === "register" ? (
              <label className="block space-y-2">
                <span className="text-sm text-[#cfd7e8]">Nome completo</span>
                <Input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  className="h-12 rounded-[1rem] border-white/10 bg-white/[0.03] px-4 text-white placeholder:text-[#637089]"
                  placeholder="Seu nome no painel"
                />
              </label>
            ) : null}

            <label className="block space-y-2">
              <span className="text-sm text-[#cfd7e8]">Email</span>
              <Input
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                className="h-12 rounded-[1rem] border-white/10 bg-white/[0.03] px-4 text-white placeholder:text-[#637089]"
                placeholder="seuemail@empresa.com"
              />
            </label>

            <label className="block space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-[#cfd7e8]">Senha</span>
                {mode === "login" ? (
                  <span className="text-xs text-[#8f9cb5]">
                    Use o acesso criado no Supabase ou o convite liberado no painel.
                  </span>
                ) : null}
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  className="h-12 rounded-[1rem] border-white/10 bg-white/[0.03] px-4 pr-12 text-white placeholder:text-[#637089]"
                  placeholder="Sua senha"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-[0.8rem] text-[#94a0b7] transition-colors hover:bg-white/[0.04] hover:text-white"
                >
                  {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {mode === "register" ? (
              <label className="block space-y-2">
                <span className="text-sm text-[#cfd7e8]">Confirmar senha</span>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={(event) => updateField("confirmPassword", event.target.value)}
                    className="h-12 rounded-[1rem] border-white/10 bg-white/[0.03] px-4 pr-12 text-white placeholder:text-[#637089]"
                    placeholder="Repita sua senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-[0.8rem] text-[#94a0b7] transition-colors hover:bg-white/[0.04] hover:text-white"
                  >
                    {showConfirmPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
            ) : null}

            {error ? (
              <div className="rounded-[1rem] border border-[#6e2d38] bg-[#331a22] px-4 py-3 text-sm leading-6 text-[#ffd3da]">
                {error}
              </div>
            ) : null}

            <Button
              type="submit"
              data-testid="auth-submit-button"
              disabled={busy}
              className="mt-1 h-12 w-full rounded-[1rem] border border-[#ff7268]/20 bg-[#d63a35] text-white shadow-[0_18px_46px_-28px_rgba(214,58,53,0.9)] hover:bg-[#ef5148] disabled:opacity-60"
            >
              {mode === "login" ? "Entrar no painel" : "Concluir registro"}
            </Button>
          </form>

          <div className="mx-auto mt-4 max-w-[420px] text-sm text-[#8e9ab2]">
            {mode === "login" ? (
              <p>
                Ainda nao concluiu o cadastro?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError("");
                  }}
                  className="text-[#ffaaa4] underline-offset-4 hover:underline"
                >
                  Criar acesso agora
                </button>
              </p>
            ) : (
              <p>
                Ja finalizou o cadastro?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                  className="text-[#ffaaa4] underline-offset-4 hover:underline"
                >
                  Voltar para login
                </button>
              </p>
            )}
          </div>

        </section>
      </div>
    </div>
  );
}
