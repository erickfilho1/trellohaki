import type { Metadata } from "next";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthGate } from "@/components/auth-gate";
import { AuthProvider } from "@/components/providers/auth-provider";
import { FlowBoardProvider } from "@/components/providers/flowboard-provider";
import { PomodoroProvider } from "@/components/providers/pomodoro-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Painel Haki",
  description: "Painel Haki para operacao, clientes e entregas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('painel-haki-theme')==='light'?'light':'dark';document.documentElement.dataset.hakiTheme=t;document.documentElement.style.colorScheme=t==='light'?'light':'dark'}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <FlowBoardProvider>
          <AuthProvider>
            <PomodoroProvider>
              <Suspense
                fallback={
                  <div className="grid min-h-[100dvh] place-items-center bg-[#0b0b0b] text-[#cfd6e6]">
                    <div className="rounded-[1.4rem] border border-white/8 bg-white/4 px-5 py-3 text-sm">
                      Carregando portal...
                    </div>
                  </div>
                }
              >
                <AuthGate>{children}</AuthGate>
              </Suspense>
            </PomodoroProvider>
          </AuthProvider>
        </FlowBoardProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
