// @marwajs/dom/net
// Minimal fetch client with single-word verbs, JSON helpers, timeout, and interceptors.
//
// Usage:
//   import { net } from "@marwajs/dom/net";
//   const api = net("https://api.example.com", { headers: { Authorization: "Bearer X" } });
//   const { data } = await api.get("/users", { q: "john" }).json();
//   const r = await api.post("/items", { name: "A" }).json();

export type Query = Record<string, string | number | boolean | null | undefined>;

export type NetInit = {
  base?: string;
  headers?: HeadersInit;
  query?: Query;
  timeout?: number; // ms
};

type Req = {
  url: string;
  init: RequestInit;
  controller: AbortController;
};

type Interceptor = (req: Req) => Promise<void> | void;
type Afterceptor = (res: Response, req: Req) => Promise<void> | void;
type Errorceptor = (err: unknown, req: Req) => Promise<void> | void;

function qs(obj?: Query): string {
  if (!obj) return "";
  const p = Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return p ? `?${p}` : "";
}

function join(base: string | undefined, path: string): string {
  if (!base) return path;
  if (path.startsWith("http")) return path;
  return base.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
}

class Reply {
  constructor(readonly res: Response) {}
  ok() { if (!this.res.ok) throw new Error(`${this.res.status} ${this.res.statusText}`); return this; }
  async json<T = unknown>() { return { data: (await this.res.json()) as T, res: this.res }; }
  async text() { return { data: await this.res.text(), res: this.res }; }
  async blob() { return { data: await this.res.blob(), res: this.res }; }
  async bytes() { return { data: new Uint8Array(await this.res.arrayBuffer()), res: this.res }; }
}

export interface Client {
  get(path: string, query?: Query, init?: RequestInit): Promise<Reply>;
  post(path: string, body?: unknown, init?: RequestInit): Promise<Reply>;
  put(path: string, body?: unknown, init?: RequestInit): Promise<Reply>;
  patch(path: string, body?: unknown, init?: RequestInit): Promise<Reply>;
  del(path: string, queryOrBody?: Query | unknown, init?: RequestInit): Promise<Reply>;
  head(path: string, query?: Query, init?: RequestInit): Promise<Reply>;

  use(fn: Interceptor): this;
  after(fn: Afterceptor): this;
  trap(fn: Errorceptor): this;

  // utilities
  abort(): void;          // abort all in-flight
  header(name: string, value: string): this; // mutate default headers
  base(url: string): this; // set base
  timeout(ms: number): this; // set default timeout
}

export function net(base?: string, init: Omit<NetInit, "base"> = {}): Client {
  let _base = base ?? init.base ?? "";
  let _headers: HeadersInit = init.headers ?? {};
  let _query: Query | undefined = init.query;
  let _timeout = init.timeout ?? 15000;
  const _pending = new Set<AbortController>();
  const _use: Interceptor[] = [];
  const _after: Afterceptor[] = [];
  const _trap: Errorceptor[] = [];

  function compose(path: string, method: string, body?: unknown, extra?: RequestInit, query?: Query): Req {
    const controller = new AbortController();
    const mergedQuery = { ..._query, ...query };
    const url = join(_base, path) + qs(mergedQuery);
    const isJSON = body != null && typeof body !== "string" && !(body instanceof FormData) && !(body instanceof Blob);
    const headers = new Headers(_headers);
    if (isJSON) headers.set("Content-Type", "application/json");
    const init: RequestInit = {
      method,
      headers,
      body: body == null ? undefined : isJSON ? JSON.stringify(body) : (body as any),
      signal: controller.signal,
      ...extra,
    };
    return { url, init, controller };
  }

  async function run(req: Req): Promise<Reply> {
    for (const f of _use) await f(req);
    _pending.add(req.controller);

    let timer: any;
    if (_timeout > 0) {
      timer = setTimeout(() => req.controller.abort(), _timeout);
    }

    try {
      const res = await fetch(req.url, req.init);
      for (const f of _after) await f(res, req);
      return new Reply(res);
    } catch (err) {
      for (const f of _trap) await f(err, req);
      throw err;
    } finally {
      clearTimeout(timer);
      _pending.delete(req.controller);
    }
  }

  const client: Client = {
    get: (path, query, extra) => run(compose(path, "GET", undefined, extra, query)),
    head: (path, query, extra) => run(compose(path, "HEAD", undefined, extra, query)),
    post: (path, body, extra) => run(compose(path, "POST", body, extra)),
    put: (path, body, extra) => run(compose(path, "PUT", body, extra)),
    patch: (path, body, extra) => run(compose(path, "PATCH", body, extra)),
    del: (path, queryOrBody, extra) => {
      if (queryOrBody && typeof queryOrBody === "object" && !(queryOrBody as any) instanceof Blob && !(queryOrBody as any) instanceof FormData) {
        // prefer body for DELETE; but allow query via 'init'
        return run(compose(path, "DELETE", queryOrBody, extra));
      }
      return run(compose(path, "DELETE", undefined, extra, queryOrBody as Query | undefined));
    },

    use(fn: Interceptor) { _use.push(fn); return this; },
    after(fn: Afterceptor) { _after.push(fn); return this; },
    trap(fn: Errorceptor) { _trap.push(fn); return this; },

    abort() { _pending.forEach(c => c.abort()); _pending.clear(); },
    header(name: string, value: string) { ( _headers as any )[name] = value; return this; },
    base(url: string) { _base = url; return this; },
    timeout(ms: number) { _timeout = ms; return this; },
  };

  return client;
}
