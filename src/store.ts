// @marwajs/dom/store
// Fluent, namespaced wrapper for local/session storage.
// Usage:
//   import { store } from "@marwajs/dom/store";
//   const s = store("local", "app:"); s.set("token", "abc"); s.get("token");

type Scope = "local" | "session";

export interface Store {
  get<T = string>(key: string, fallback?: T): T | null;
  set<T = unknown>(key: string, value: T): this;
  rm(key: string): this;
  has(key: string): boolean;
  all<T = unknown>(): Record<string, T>;
  clear(): this;
}

function raw(scope: Scope) {
  return scope === "session" ? window.sessionStorage : window.localStorage;
}

function safe<T>(fn: () => T, fallback: T): T {
  try { return fn(); } catch { return fallback; }
}

/** Create a namespaced storage */
export function store(scope: Scope = "local", ns = ""): Store {
  const R = raw(scope);
  const keyOf = (k: string) => (ns ? ns + k : k);

  return {
    get<T = string>(key: string, fallback?: T): T | null {
      return safe(() => {
        const v = R.getItem(keyOf(key));
        if (v == null) return fallback ?? null;
        try { return JSON.parse(v) as T; } catch { return (v as unknown) as T; }
      }, fallback ?? null);
    },
    set<T = unknown>(key: string, value: T) {
      safe(() => R.setItem(keyOf(key), typeof value === "string" ? value : JSON.stringify(value)), undefined);
      return this;
    },
    rm(key: string) {
      safe(() => R.removeItem(keyOf(key)), undefined);
      return this;
    },
    has(key: string) {
      return safe(() => R.getItem(keyOf(key)) != null, false);
    },
    all<T = unknown>() {
      return safe(() => {
        const out: Record<string, T> = {};
        for (let i = 0; i < R.length; i++) {
          const k = R.key(i)!;
          if (ns && !k.startsWith(ns)) continue;
          const short = ns ? k.slice(ns.length) : k;
          const v = R.getItem(k);
          try { (out as any)[short] = v != null ? JSON.parse(v) : null; }
          catch { (out as any)[short] = v as any; }
        }
        return out;
      }, {} as Record<string, T>);
    },
    clear() {
      if (!ns) { safe(() => R.clear(), undefined); }
      else {
        const keys: string[] = [];
        for (let i = 0; i < R.length; i++) {
          const k = R.key(i)!;
          if (k.startsWith(ns)) keys.push(k);
        }
        keys.forEach(k => safe(() => R.removeItem(k), undefined));
      }
      return this;
    },
  };
}
