"use client";

import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFlowBoardStore } from "@/components/providers/flowboard-provider";
import {
  fetchSupabaseProfileById,
  fetchSupabaseProfileByEmail,
  getRegistrationInvite,
  panelFromProfile,
  updateSupabaseProfileSettings,
  type SupabaseProfile,
} from "@/lib/supabase/access";
import { writeStoredAccountSettings } from "@/lib/account-settings";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  DEMO_COLLAB_EMAIL,
  DEMO_COLLAB_PASSWORD,
} from "@/lib/auth/demo-credentials";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";

const SESSION_STORAGE_KEY = "clientboard-auth-session";
const ACCOUNTS_STORAGE_KEY = "clientboard-auth-accounts";

type StoredAuthSession = {
  userId: string;
  email: string;
  panel: "admin" | "cliente" | "colaborador";
};

type StoredAuthAccount = {
  userId: string;
  name: string;
  email: string;
  password: string;
  panel: "cliente" | "colaborador";
  createdAt: string;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  panel: "admin" | "cliente" | "colaborador";
};

type AuthResult = {
  ok: boolean;
  error?: string;
  nextPath?: string;
};

type AuthContextValue = {
  user: AuthUser;
  authenticated: boolean;
  hydrated: boolean;
  homePath: string;
  login: (payload: { email: string; password: string }) => Promise<AuthResult>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    boardId?: string | null;
  }) => Promise<AuthResult>;
  saveProfile: (payload: { name: string; avatarUrl: string }) => Promise<AuthResult>;
  logout: () => Promise<void>;
};

const FALLBACK_USER: AuthUser = {
  id: "guest",
  name: "Convidado",
  email: "",
  panel: "cliente",
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getInitialHydratedState() {
  return typeof window !== "undefined";
}

function readStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredAuthSession;
  } catch {
    return null;
  }
}

function readStoredAccounts() {
  if (typeof window === "undefined") {
    return [] as StoredAuthAccount[];
  }

  const raw = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);
  if (!raw) {
    return [] as StoredAuthAccount[];
  }

  try {
    return JSON.parse(raw) as StoredAuthAccount[];
  } catch {
    return [];
  }
}

function writeStoredSession(session: StoredAuthSession | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function writeStoredAccounts(accounts: StoredAuthAccount[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function defaultHomePath(panel: AuthUser["panel"]) {
  return panel === "admin" ? "/admin" : "/";
}

async function triggerWelcomeEmail(payload: {
  accessToken: string;
  email: string;
  name: string;
  boardName: string;
  accessLink: string;
  accessKind: "cliente" | "colaborador";
}) {
  await fetch("/api/welcome/send", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${payload.accessToken}`,
    },
    body: JSON.stringify({
      to: payload.email,
      recipientName: payload.name,
      boardName: payload.boardName,
      accessLink: payload.accessLink,
      accessKind: payload.accessKind,
    }),
  }).catch(() => undefined);
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { adminUsers, upsertAdminUser } = useFlowBoardStore();
  const [session, setSession] = useState<StoredAuthSession | null>(readStoredSession);
  const [accounts, setAccounts] = useState<StoredAuthAccount[]>(readStoredAccounts);
  const [profile, setProfile] = useState<SupabaseProfile | null>(null);
  const [hydrated] = useState(getInitialHydratedState);
  const supabaseEnabled = hasSupabaseEnv();
  const logoutRequestedRef = useRef(false);

  const shouldKeepLocalSession = useCallback(
    (candidate: StoredAuthSession | null) => {
      if (!candidate) {
        return false;
      }

      return candidate.email === ADMIN_EMAIL || candidate.email === DEMO_COLLAB_EMAIL;
    },
    [],
  );

  const buildSupabaseSession = useCallback(async (panelEmail: string) => {
    if (panelEmail === ADMIN_EMAIL) {
      return {
        userId: "admin-erick",
        email: ADMIN_EMAIL,
        panel: "admin" as const,
      };
    }

    const profile = await fetchSupabaseProfileByEmail(panelEmail);
    if (!profile || profile.status === "desativado") {
      return null;
    }

    return {
      userId: profile.id,
      email: profile.email,
      panel: panelFromProfile(profile),
    };
  }, []);

  const loadProfileForSession = useCallback(
    async (candidate: StoredAuthSession | null) => {
      if (!candidate || !supabaseEnabled) {
        setProfile(null);
        return null;
      }

      if (
        candidate.userId === "admin-erick" ||
        candidate.userId === "demo-colaborador"
      ) {
        setProfile(null);
        return null;
      }

      const nextProfile =
        (await fetchSupabaseProfileById(candidate.userId)) ??
        (await fetchSupabaseProfileByEmail(candidate.email));

      setProfile(nextProfile);
      return nextProfile;
    },
    [supabaseEnabled],
  );

  useEffect(() => {
    writeStoredSession(session);
  }, [session]);

  useEffect(() => {
    writeStoredAccounts(accounts);
  }, [accounts]);

  useEffect(() => {
    if (!supabaseEnabled) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) {
        return;
      }

      const userEmail = normalizeEmail(data.session?.user.email ?? "");
      if (!userEmail) {
        if (logoutRequestedRef.current) {
          setSession(null);
          setProfile(null);
          return;
        }

        if (shouldKeepLocalSession(session)) {
          return;
        }

        setSession(null);
        setProfile(null);
        return;
      }

      const nextSession = await buildSupabaseSession(userEmail);
      setSession(nextSession);
      void loadProfileForSession(nextSession);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSessionData) => {
      const userEmail = normalizeEmail(nextSessionData?.user.email ?? "");
      if (!userEmail) {
        if (logoutRequestedRef.current) {
          setSession(null);
          setProfile(null);
          return;
        }

        if (shouldKeepLocalSession(session)) {
          return;
        }

        setSession(null);
        setProfile(null);
        return;
      }

      void buildSupabaseSession(userEmail).then((nextSession) => {
        setSession(nextSession);
        void loadProfileForSession(nextSession);
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [adminUsers, buildSupabaseSession, loadProfileForSession, session, shouldKeepLocalSession, supabaseEnabled]);

  useEffect(() => {
    void loadProfileForSession(session);
  }, [loadProfileForSession, session]);

  const resolvedUser = useMemo<AuthUser>(() => {
    if (!session) {
      return FALLBACK_USER;
    }

    if (session.email === ADMIN_EMAIL) {
      return {
        id: session.userId,
        name: profile?.full_name?.trim() || "Erick Filho",
        email: ADMIN_EMAIL,
        avatarUrl: profile?.avatar_url || undefined,
        panel: "admin",
      };
    }

    if (session.email === DEMO_COLLAB_EMAIL) {
      return {
        id: session.userId,
        name: profile?.full_name?.trim() || "Colaborador Demo",
        email: DEMO_COLLAB_EMAIL,
        avatarUrl: profile?.avatar_url || undefined,
        panel: "colaborador",
      };
    }

    const invitedUser = adminUsers.find((user) => normalizeEmail(user.email) === session.email);
    const fallbackName =
      profile?.full_name?.trim() ||
      invitedUser?.name ||
      session.email.split("@")[0] ||
      "Painel Haki";

    return {
      id: session.userId,
      name: fallbackName,
      email: profile?.email || invitedUser?.email || session.email,
      avatarUrl: profile?.avatar_url || invitedUser?.avatarUrl,
      panel: session.panel,
    };
  }, [adminUsers, profile, session]);

  const authenticated = Boolean(session && resolvedUser.id !== FALLBACK_USER.id);
  const homePath = defaultHomePath(resolvedUser.panel);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: resolvedUser,
      authenticated,
      hydrated,
      homePath,
      login: async ({ email, password }) => {
        const normalizedEmail = normalizeEmail(email);
        const invitedUser = adminUsers.find((user) => normalizeEmail(user.email) === normalizedEmail);

        if (!normalizedEmail || !password.trim()) {
          return { ok: false, error: "Preencha email e senha para entrar." };
        }

        if (normalizedEmail === ADMIN_EMAIL) {
          if (password !== ADMIN_PASSWORD) {
            return { ok: false, error: "Senha incorreta para o acesso admin." };
          }

          if (supabaseEnabled) {
            const supabase = getSupabaseBrowserClient();
            if (!supabase) {
              return { ok: false, error: "Cliente Supabase indisponivel." };
            }

            let authUser = null as Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>["data"]["user"];
            let authError = null as Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>["error"];

            const { data, error } = await supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password,
            });
            authUser = data.user;
            authError = error;

            if (authError) {
              const { data: createdData, error: createdError } = await supabase.auth.signUp({
                email: normalizedEmail,
                password,
                options: {
                  data: {
                    name: "Erick Filho",
                    kind: "admin",
                    panel: "admin",
                  },
                },
              });

              if (!createdError && createdData.user) {
                authUser = createdData.user;
                authError = null;
              }
            }

            if (authError || !authUser) {
              return {
                ok: false,
                error: authError?.message ?? "Nao foi possivel autenticar o admin no Supabase.",
              };
            }

            const nextSession = await buildSupabaseSession(normalizedEmail);
            if (!nextSession) {
              return {
                ok: false,
                error: "A conta admin autenticou, mas o perfil admin ainda nao ficou ativo no Supabase.",
              };
            }

            setSession(nextSession);
            void loadProfileForSession(nextSession);
            return { ok: true, nextPath: "/admin" };
          }

          const nextSession: StoredAuthSession = {
            userId: "admin-erick",
            email: ADMIN_EMAIL,
            panel: "admin",
          };

          setSession(nextSession);
          void loadProfileForSession(nextSession);
          return { ok: true, nextPath: "/admin" };
        }

        if (normalizedEmail === DEMO_COLLAB_EMAIL) {
          if (password !== DEMO_COLLAB_PASSWORD) {
            return { ok: false, error: "Senha incorreta para o acesso demo de colaborador." };
          }

          const nextSession: StoredAuthSession = {
            userId: "demo-colaborador",
            email: DEMO_COLLAB_EMAIL,
            panel: "colaborador",
          };

          setSession(nextSession);
          void loadProfileForSession(nextSession);
          return { ok: true, nextPath: "/" };
        }

        if (supabaseEnabled) {
          const supabase = getSupabaseBrowserClient();
          if (!supabase) {
            return { ok: false, error: "Cliente Supabase indisponivel." };
          }

          let authUser = null as Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>["data"]["user"];
          let authError = null as Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>["error"];

          const { data, error } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });
          authUser = data.user;
          authError = error;

          if (authError && normalizedEmail === ADMIN_EMAIL) {
            const { data: createdData, error: createdError } = await supabase.auth.signUp({
              email: normalizedEmail,
              password,
              options: {
                data: {
                  name: "Erick Filho",
                  kind: "admin",
                  panel: "admin",
                },
              },
            });

            if (!createdError && createdData.user) {
              authUser = createdData.user;
              authError = null;
            }
          }

          if (authError || !authUser) {
            return { ok: false, error: authError?.message ?? "Nao foi possivel entrar agora." };
          }

          const nextSession = await buildSupabaseSession(normalizedEmail);

          if (!nextSession) {
            await supabase.auth.signOut();
            return {
              ok: false,
              error: "Este email autenticou, mas ainda nao foi vinculado a um painel do workspace.",
            };
          }

          setSession(nextSession);
          void loadProfileForSession(nextSession);

          upsertAdminUser({
            id: nextSession.userId,
            name:
              invitedUser?.name ||
              authUser.user_metadata?.name ||
              normalizedEmail.split("@")[0] ||
              "Painel Haki",
            email: normalizedEmail,
            kind: nextSession.panel === "colaborador" ? "colaborador" : "cliente",
            status: "ativo",
            company: invitedUser?.company,
            title: invitedUser?.title,
          });

          if (data.session?.access_token && nextSession.panel !== "admin") {
            const currentProfile = await fetchSupabaseProfileByEmail(normalizedEmail);
            const boardName = currentProfile?.company || invitedUser?.company || "Painel Haki";
            const accessKind = nextSession.panel === "colaborador" ? "colaborador" : "cliente";
            const accessLink =
              typeof window !== "undefined"
                ? `${window.location.origin}${defaultHomePath(nextSession.panel)}`
                : defaultHomePath(nextSession.panel);

            void triggerWelcomeEmail({
              accessToken: data.session.access_token,
              email: normalizedEmail,
              name:
                currentProfile?.full_name?.trim() ||
                invitedUser?.name ||
                authUser.user_metadata?.name ||
                "Novo acesso",
              boardName,
              accessLink,
              accessKind,
            });
          }

          return { ok: true, nextPath: defaultHomePath(nextSession.panel) };
        }

        if (!invitedUser) {
          return {
            ok: false,
            error: "Este email ainda nao foi liberado no painel admin.",
          };
        }

        const account = accounts.find((item) => normalizeEmail(item.email) === normalizedEmail);
        if (!account) {
          return {
            ok: false,
            error: "Este email ja foi convidado, mas o cadastro ainda nao foi concluido.",
          };
        }

        if (account.password !== password) {
          return { ok: false, error: "Senha incorreta para este acesso." };
        }

        const nextSession: StoredAuthSession = {
          userId: invitedUser.id,
          email: normalizedEmail,
          panel: account.panel,
        };
        setSession(nextSession);
        void loadProfileForSession(nextSession);
        return { ok: true, nextPath: defaultHomePath(account.panel) };
      },
      register: async ({ name, email, password, boardId }) => {
        const normalizedEmail = normalizeEmail(email);
        const trimmedName = name.trim();

        if (!normalizedEmail || !trimmedName || !password.trim()) {
          return { ok: false, error: "Preencha nome, email e senha para criar o acesso." };
        }

        if (!supabaseEnabled && normalizedEmail === ADMIN_EMAIL) {
          return {
            ok: false,
            error: "O acesso de administrador ja existe e usa login direto.",
          };
        }

        const invitedUser = adminUsers.find((user) => normalizeEmail(user.email) === normalizedEmail);
        const remoteInvite = supabaseEnabled
          ? await getRegistrationInvite(normalizedEmail, boardId)
          : null;
        if (!invitedUser && !remoteInvite) {
          return {
            ok: false,
            error: "Este email nao foi autorizado pelo painel admin.",
          };
        }

        const rawAccessKind = remoteInvite?.kind ?? invitedUser?.kind ?? "cliente";
        const accessKind = rawAccessKind === "colaborador" ? "colaborador" : "cliente";
        const panel = accessKind === "colaborador" ? "colaborador" : "cliente";

        if (supabaseEnabled) {
          const supabase = getSupabaseBrowserClient();
          if (!supabase) {
            return { ok: false, error: "Cliente Supabase indisponivel." };
          }

          const { data, error } = await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
              data: {
                name: trimmedName,
                panel,
                kind: accessKind,
              },
            },
          });

          if (error) {
            return { ok: false, error: error.message };
          }

          const nextSession = data.user ? await buildSupabaseSession(normalizedEmail) : null;

          if (nextSession) {
            upsertAdminUser({
              id: nextSession.userId,
              name: trimmedName,
              email: normalizedEmail,
              kind: accessKind,
              status: "ativo",
              company: invitedUser?.company ?? remoteInvite?.workspaceTitle,
              title: invitedUser?.title,
            });

            setSession(nextSession);
            void loadProfileForSession(nextSession);

            const accessLink =
              typeof window !== "undefined"
                ? `${window.location.origin}${defaultHomePath(nextSession.panel)}`
                : defaultHomePath(nextSession.panel);

            const accessToken = data.session?.access_token;
            if (accessToken) {
              void triggerWelcomeEmail({
                accessToken,
                email: normalizedEmail,
                name: trimmedName,
                boardName: remoteInvite?.workspaceTitle ?? invitedUser?.company ?? "Painel Haki",
                accessLink,
                accessKind,
              });
            }

            return { ok: true, nextPath: defaultHomePath(nextSession.panel) };
          }

          return {
            ok: true,
            nextPath: "/login",
            error:
              "Conta criada. Se o projeto exigir confirmacao de email, conclua a etapa e depois entre.",
          };
        }

        if (!invitedUser) {
          return {
            ok: false,
            error: "Este email nao foi autorizado pelo painel admin.",
          };
        }

        const existingAccount = accounts.find((item) => normalizeEmail(item.email) === normalizedEmail);
        if (existingAccount) {
          return { ok: false, error: "Este email ja concluiu o registro. Use a area de login." };
        }

        const nextAccount: StoredAuthAccount = {
          userId: invitedUser.id,
          name: trimmedName,
          email: normalizedEmail,
          password,
          panel,
          createdAt: new Date().toISOString(),
        };

        setAccounts((current) => [...current, nextAccount]);
        upsertAdminUser({
          id: invitedUser.id,
          name: trimmedName,
          email: normalizedEmail,
          kind: invitedUser.kind,
          status: "ativo",
          company: invitedUser.company,
          title: invitedUser.title,
        });

        const nextSession: StoredAuthSession = {
          userId: invitedUser.id,
          email: normalizedEmail,
          panel,
        };
        setSession(nextSession);
        return { ok: true, nextPath: defaultHomePath(panel) };
      },
      saveProfile: async ({ name, avatarUrl }) => {
        if (!session) {
          return { ok: false, error: "Nenhum usuario autenticado para atualizar o perfil." };
        }

        const nextName = name.trim();
        if (!nextName) {
          return { ok: false, error: "Informe um nome para salvar o perfil." };
        }

        if (!supabaseEnabled || session.userId === "admin-erick" || session.userId === "demo-colaborador") {
          writeStoredAccountSettings(session.email, {
            displayName: nextName,
            avatarDataUrl: avatarUrl,
          });
          setProfile((current) =>
            current
              ? {
                  ...current,
                  full_name: nextName,
                  avatar_url: avatarUrl || null,
                }
              : current,
          );
          return { ok: true };
        }

        try {
          const nextProfile = await updateSupabaseProfileSettings({
            id: session.userId,
            fullName: nextName,
            avatarUrl,
          });
          writeStoredAccountSettings(session.email, {
            displayName: nextName,
            avatarDataUrl: avatarUrl,
          });
          setProfile(nextProfile);
          return { ok: true };
        } catch (error) {
          return {
            ok: false,
            error: error instanceof Error ? error.message : "Nao foi possivel salvar o perfil.",
          };
        }
      },
      logout: async () => {
        logoutRequestedRef.current = true;
        setSession(null);
        setProfile(null);
        writeStoredSession(null);
        if (supabaseEnabled) {
          const supabase = getSupabaseBrowserClient();
          await supabase?.auth.signOut();
        }
        logoutRequestedRef.current = false;
      },
    }),
    [accounts, adminUsers, authenticated, buildSupabaseSession, homePath, hydrated, loadProfileForSession, resolvedUser, session, supabaseEnabled, upsertAdminUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
