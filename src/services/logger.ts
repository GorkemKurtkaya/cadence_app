// Yapısal logger — uygulamada `console.log` yerine tek giriş noktası.
// (console kullanımına izin verilen TEK yer burasıdır.)

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

// Dev'de her şey, prod'da info ve üzeri.
const MIN_LEVEL: Level = import.meta.env.DEV ? "debug" : "info";

function emit(level: Level, module: string, message: string, meta?: unknown) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;
  const prefix = `[${level.toUpperCase()}] ${module}:`;
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (meta !== undefined) fn(prefix, message, meta);
  else fn(prefix, message);
}

export interface Logger {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

/** Modül bazlı logger üretir: `const log = getLogger("repoScanner")`. */
export function getLogger(module: string): Logger {
  return {
    debug: (m, meta) => emit("debug", module, m, meta),
    info: (m, meta) => emit("info", module, m, meta),
    warn: (m, meta) => emit("warn", module, m, meta),
    error: (m, meta) => emit("error", module, m, meta),
  };
}
