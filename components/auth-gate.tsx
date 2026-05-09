"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { canAccessPath } from "@/lib/permissions";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function AuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { authenticated, hydrated, homePath, user } = useAuth();
  const isLoginRoute = pathname === "/login";
  const inviteMode = searchParams.get("mode") === "register";
  const inviteEmail = normalizeEmail(searchParams.get("email") ?? "");
  const isInviteRegisterRoute = isLoginRoute && inviteMode && Boolean(inviteEmail);
  const inviteTargetsAnotherUser =
    isInviteRegisterRoute && authenticated && inviteEmail !== normalizeEmail(user.email || "");
  const canAccessCurrentPath = isLoginRoute || canAccessPath(user.panel, pathname);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!authenticated && !isLoginRoute) {
      router.replace("/login");
      return;
    }

    if (authenticated && isLoginRoute && !inviteTargetsAnotherUser) {
      router.replace(homePath);
      return;
    }

    if (authenticated && !canAccessCurrentPath) {
      router.replace(homePath);
    }
  }, [
    authenticated,
    canAccessCurrentPath,
    hydrated,
    homePath,
    inviteTargetsAnotherUser,
    isLoginRoute,
    router,
  ]);

  if (!hydrated) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#0b0b0b] text-[#cfd6e6]">
        <div className="rounded-[1.4rem] border border-white/8 bg-white/4 px-5 py-3 text-sm">
          Carregando portal...
        </div>
      </div>
    );
  }

  if (
    (!authenticated && !isLoginRoute) ||
    (authenticated && isLoginRoute && !inviteTargetsAnotherUser) ||
    (authenticated && !canAccessCurrentPath)
  ) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#0b0b0b] text-[#cfd6e6]">
        <div className="rounded-[1.4rem] border border-white/8 bg-white/4 px-5 py-3 text-sm">
          Redirecionando...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
