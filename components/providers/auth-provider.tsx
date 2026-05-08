"use client";

import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useFlowBoardStore } from "@/components/providers/flowboard-provider";
import {
  fetchSupabaseProfileByEmail,
  getRegistrationInvite,
  panelFromProfile,
} from "@/lib/supabase/access";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";

const SESSION_STORAGE_KEY = "clientboard-auth-session";
const ACCOUNTS_STORAGE_KEY = "clientboard-auth-accounts";

const ADMIN_EMAIL = "erickfilho281@gmail.com";
const ADMIN_PASSWORD = "erickE10@";

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
  register: (payload: { name: string; email: string; password: string }) => Promise<AuthResult>;
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

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { adminUsers, upsertAdminUser } = useFlowBoardStore();
  const [session, setSession] = useState<StoredAuthSession | null>(readStoredSession);
  const [accounts, setAccounts] = useState<StoredAuthAccount[]>(readStoredAccounts);
  const [hydrated] = useState(getInitialHydratedState);
  const supabaseEnabled = hasSupabaseEnv();

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
        setSession(null);
        return;
      }

      const nextSession = await buildSupabaseSession(userEmail);
      setSession(nextSession);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSessionData) => {
      const userEmail = normalizeEmail(nextSessionData?.user.email ?? "");
      if (!userEmail) {
        setSession(null);
        return;
      }

      void buildSupabaseSession(userEmail).then((nextSession) => {
        setSession(nextSession);
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [adminUsers, buildSupabaseSession, supabaseEnabled]);

  const resolvedUser = useMemo<AuthUser>(() => {
    if (!session) {
      return FALLBACK_USER;
    }

    if (session.email === ADMIN_EMAIL) {
      return {
        id: "admin-erick",
        name: "Erick Filho",
        email: ADMIN_EMAIL,
        panel: "admin",
      };
    }

    const invitedUser = adminUsers.find((user) => normalizeEmail(user.email) === session.email);
    if (!invitedUser) {
      return FALLBACK_USER;
    }

    return {
      id: invitedUser.id,
      name: invitedUser.name,
      email: invitedUser.email,
      avatarUrl: invitedUser.avatarUrl,
      panel: session.panel,
    };
  }, [adminUsers, session]);

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

        if (!normalizedEmail || !password.trim()) {
          return { ok: false, error: "Preencha email e senha para entrar." };
        }

        if (normalizedEmail === ADMIN_EMAIL) {
          if (password !== ADMIN_PASSWORD) {
            return { ok: false, error: "Senha incorreta para o acesso admin." };
          }

          const nextSession: StoredAuthSession = {
            userId: "admin-erick",
            email: ADMIN_EMAIL,
            panel: "admin",
          };

          setSession(nextSession);
          return { ok: true, nextPath: "/admin" };
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
          return { ok: true, nextPath: defaultHomePath(nextSession.panel) };
        }

        const invitedUser = adminUsers.find((user) => normalizeEmail(user.email) === normalizedEmail);
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
        return { ok: true, nextPath: defaultHomePath(account.panel) };
      },
      register: async ({ name, email, password }) => {
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
        const remoteInvite = supabaseEnabled ? await getRegistrationInvite(normalizedEmail) : null;
        if (!invitedUser && !remoteInvite) {
          return {
            ok: false,
            error: "Este email nao foi autorizado pelo painel admin.",
          };
        }

        const accessKind = remoteInvite?.kind ?? invitedUser?.kind ?? "cliente";
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

          const localUserId =
            invitedUser?.id ??
            `admin-invite-${normalizedEmail.split("@")[0].replace(/[^a-z0-9._-]/gi, "-")}`;

          upsertAdminUser({
            id: localUserId,
            name: trimmedName,
            email: normalizedEmail,
            kind: accessKind,
            status: "ativo",
            company: invitedUser?.company ?? remoteInvite?.workspaceTitle,
            title: invitedUser?.title,
          });

          const nextSession = data.user ? await buildSupabaseSession(normalizedEmail) : null;

          if (nextSession) {
            setSession(nextSession);
            return { ok: true, nextPath: defaultHomePath(nextSession.panel) };
          }

          return {
            ok: true,
            nextPath: "/login",
            error: "Conta criada. Se o projeto exigir confirmacao de email, conclua a etapa e depois entre.",
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
      logout: async () => {
        if (supabaseEnabled) {
          const supabase = getSupabaseBrowserClient();
          await supabase?.auth.signOut();
        }
        setSession(null);
      },
    }),
    [accounts, adminUsers, authenticated, buildSupabaseSession, homePath, hydrated, resolvedUser, supabaseEnabled, upsertAdminUser],
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
