"use client";

import { ArrowSquareOut } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { ClientLayout } from "@/components/client-layout";
import { Topbar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFlowBoardData } from "@/hooks/use-flowboard-store";

export function SettingsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const { boards } = useFlowBoardData();
  const currentBoard = boards[0];

  return (
    <ClientLayout projectName={currentBoard?.name ?? "Painel Haki"}>
      <Topbar
        title="Configuracoes"
        subtitle="Atualize os dados basicos do portal e os contatos principais do projeto."
      />

      <div className="flowboard-scrollbar flex min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 lg:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <div className="glass-panel rounded-[1.85rem] border border-white/8 bg-[linear-gradient(180deg,#151515,#101010)] p-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-[#cfd6e6]">Nome do cliente</label>
                <Input
                  defaultValue={currentBoard?.members[0]?.name ?? "Cliente"}
                  className="h-12 rounded-[1rem] border-white/10 bg-white/4 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-[#cfd6e6]">Nome do projeto</label>
                <Input
                  defaultValue={currentBoard?.name ?? "Painel Haki"}
                  className="h-12 rounded-[1rem] border-white/10 bg-white/4 text-white"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-[#cfd6e6]">E-mail</label>
                <Input
                  defaultValue="cliente@exemplo.com"
                  className="h-12 rounded-[1rem] border-white/10 bg-white/4 text-white"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button className="h-11 rounded-[1rem] border border-white/10 bg-[#4f79ff] text-white hover:bg-[#6388ff]">
                Salvar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  logout();
                  router.replace("/login");
                }}
                className="h-11 rounded-[1rem] border-white/10 bg-white/4 text-white hover:bg-white/8"
              >
                <ArrowSquareOut size={16} />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
