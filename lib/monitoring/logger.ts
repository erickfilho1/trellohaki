type LogLevel = "info" | "warn" | "error";

type LogPayload = {
  level: LogLevel;
  message: string;
  route?: string;
  requestId?: string | null;
  durationMs?: number;
  [key: string]: unknown;
};

type LogPayloadInput = Omit<LogPayload, "level"> & {
  message: string;
};

function writeLog(payload: LogPayload) {
  const entry = JSON.stringify({
    app: "flowboard",
    timestamp: new Date().toISOString(),
    ...payload,
  });

  if (payload.level === "error") {
    console.error(entry);
    return;
  }

  if (payload.level === "warn") {
    console.warn(entry);
    return;
  }

  console.log(entry);
}

export function logInfo(payload: LogPayloadInput) {
  writeLog({ level: "info", ...payload });
}

export function logWarn(payload: LogPayloadInput) {
  writeLog({ level: "warn", ...payload });
}

export function logError(payload: LogPayloadInput) {
  writeLog({ level: "error", ...payload });
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
