import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { errorMessage, logError, logInfo } from "@/lib/monitoring/logger";

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function GET(request: Request) {
  const start = Date.now();
  const route = "/api/health";
  const requestId = request.headers.get("x-vercel-id");

  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      logError({
        message: "health_supabase_env_missing",
        route,
        requestId,
        durationMs: Date.now() - start,
      });

      return NextResponse.json(
        { ok: false, service: "flowboard", supabase: "missing_env" },
        { status: 500 },
      );
    }

    const { error } = await supabase.from("workspaces").select("id", { count: "exact", head: true });
    if (error) {
      logError({
        message: "health_supabase_failed",
        route,
        requestId,
        error: error.message,
        durationMs: Date.now() - start,
      });

      return NextResponse.json(
        { ok: false, service: "flowboard", supabase: "unhealthy" },
        { status: 503 },
      );
    }

    logInfo({
      message: "health_ok",
      route,
      requestId,
      durationMs: Date.now() - start,
    });

    return NextResponse.json({
      ok: true,
      service: "flowboard",
      supabase: "healthy",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError({
      message: "health_unhandled_error",
      route,
      requestId,
      error: errorMessage(error),
      durationMs: Date.now() - start,
    });

    return NextResponse.json(
      { ok: false, service: "flowboard", supabase: "unknown" },
      { status: 500 },
    );
  }
}
