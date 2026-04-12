import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockFetch } = vi.hoisted(() => {
  const mock = vi.fn();
  Object.defineProperty(globalThis, "fetch", {
    value: mock,
    writable: true,
    configurable: true,
  });
  return { mockFetch: mock };
});

const { net } = await import("../net");

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => null,
    text: async () => "",
    blob: async () => new Blob(),
    arrayBuffer: async () => new ArrayBuffer(0),
    headers: new Map([["content-type", "application/json"]]),
  } as unknown as Response);
});

describe("net()", () => {
  describe("basic HTTP methods", () => {
    it("get() sends GET request", async () => {
      await net("https://api.example.com").get("/users");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/users",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("post() sends POST with JSON body", async () => {
      await net("https://api.example.com").post("/users", { name: "Alice" });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/users",
        expect.objectContaining({ method: "POST", body: '{"name":"Alice"}' }),
      );
    });

    it("put() sends PUT request", async () => {
      await net("https://api.example.com").put("/users/1", { name: "Bob" });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: "PUT" }),
      );
    });

    it("patch() sends PATCH request", async () => {
      await net("https://api.example.com").patch("/users/1", { name: "Carol" });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("del() sends DELETE request", async () => {
      await net("https://api.example.com").del("/users/1");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("head() sends HEAD request", async () => {
      await net("https://api.example.com").head("/users");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: "HEAD" }),
      );
    });
  });

  describe("SSRF protection", () => {
    it("throws on javascript: base URL", () => {
      expect(() => net("javascript:alert(1)")).toThrow(
        "net: base must be a safe http(s) URL",
      );
    });

    it("throws on data: base URL", () => {
      expect(() => net("data:text/html,<h1>")).toThrow(
        "net: base must be a safe http(s) URL",
      );
    });

    it("throws on ftp: base URL", () => {
      expect(() => net("ftp://ftp.example.com")).toThrow(
        "net: base must be a safe http(s) URL",
      );
    });

    it("throws on absolute https URL in path", () => {
      const api = net("https://api.example.com");
      expect(() => api.get("https://evil.com")).toThrow(
        "net: absolute path URLs are not allowed",
      );
    });

    it("throws on absolute http URL in path", () => {
      const api = net("https://api.example.com");
      expect(() => api.get("http://internal.local")).toThrow(
        "net: absolute path URLs are not allowed",
      );
    });
  });

  describe("client utilities", () => {
    it("base() updates base URL", async () => {
      await net("https://api.example.com")
        .base("https://other.com")
        .get("/items");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://other.com/items",
        expect.any(Object),
      );
    });

    it("header() is chainable", () => {
      const api = net("https://api.example.com");
      expect(api.header("X-Custom", "value")).toBe(api);
    });

    it("after() is chainable", () => {
      const api = net("https://api.example.com");
      expect(api.after(() => {})).toBe(api);
    });

    it("use() is chainable", () => {
      const api = net("https://api.example.com");
      expect(api.use(() => {})).toBe(api);
    });

    it("abort() is callable", () => {
      expect(() => net("https://api.example.com").abort()).not.toThrow();
    });

    it("timeout() is chainable", () => {
      const api = net("https://api.example.com");
      expect(api.timeout(5000)).toBe(api);
    });
  });

  describe("safe extra props", () => {
    it("passes safe extra props (cache, credentials)", async () => {
      await (net("https://api.example.com") as any).post(
        "/data",
        { x: 1 },
        { cache: "no-store", credentials: "include" },
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ cache: "no-store", credentials: "include" }),
      );
    });

    it("rejects unsafe mode in extra", async () => {
      await (net("https://api.example.com") as any).post(
        "/data",
        { x: 1 },
        { mode: "no-cors" },
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.not.objectContaining({ mode: "no-cors" }),
      );
    });
  });
});
