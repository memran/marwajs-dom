import { describe, it, expect, beforeEach } from "vitest";
import { store } from "../store";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("store()", () => {
  describe("basic CRUD", () => {
    it("set() and get() work with JSON values", () => {
      const s = store("local", "test_store:");
      s.set("user", { id: 1, name: "Alice" });
      expect(s.get<{ id: number; name: string }>("user")).toEqual({
        id: 1,
        name: "Alice",
      });
    });

    it("set() and get() work with strings", () => {
      const s = store("local", "test_store:");
      s.set("token", "abc123");
      expect(s.get("token")).toBe("abc123");
    });

    it("get() returns fallback when key missing", () => {
      const s = store("local", "test_store:");
      expect(s.get("missing")).toBeNull();
      expect(s.get("missing", "fallback")).toBe("fallback");
    });

    it("get() parses JSON numbers", () => {
      const s = store("local", "test_store:");
      s.set("count", 42);
      expect(s.get<number>("count")).toBe(42);
    });

    it("get() parses JSON booleans", () => {
      const s = store("local", "test_store:");
      s.set("enabled", true);
      expect(s.get<boolean>("enabled")).toBe(true);
    });

    it("rm() removes a key", () => {
      const s = store("local", "test_store:");
      s.set("temp", "value");
      s.rm("temp");
      expect(s.has("temp")).toBe(false);
    });

    it("has() checks key existence", () => {
      const s = store("local", "test_store:");
      s.set("exists", true);
      expect(s.has("exists")).toBe(true);
      expect(s.has("nope")).toBe(false);
    });
  });

  describe("all()", () => {
    it("returns all namespaced keys", () => {
      const s = store("local", "test_store:");
      s.set("a", 1);
      s.set("b", 2);
      expect(s.all<number>()).toEqual({ a: 1, b: 2 });
    });

    it("returns empty object when empty", () => {
      expect(store("local", "test_store:").all()).toEqual({});
    });

    it("ignores keys outside namespace", () => {
      const s = store("local", "test_store:");
      localStorage.setItem("other", '"x"');
      expect(s.all()).toEqual({});
      localStorage.removeItem("other");
    });
  });

  describe("clear()", () => {
    it("clears all namespaced keys", () => {
      const s = store("local", "test_store:");
      s.set("x", 1);
      s.set("y", 2);
      s.clear();
      expect(s.all()).toEqual({});
    });

    it("clear() with no namespace clears entire storage", () => {
      const s = store("local", "");
      s.set("a", 1);
      localStorage.setItem("b", '"2"');
      s.clear();
      expect(localStorage.length).toBe(0);
    });
  });

  describe("scoping", () => {
    it("uses sessionStorage when scope is 'session'", () => {
      const s = store("session", "test_store:");
      s.set("data", "session-value");
      expect(sessionStorage.getItem("test_store:data")).toBe("session-value");
    });

    it("uses localStorage by default", () => {
      const s = store();
      s.set("key", "local-value");
      expect(localStorage.getItem("key")).toBe("local-value");
    });
  });

  describe("namespace prefix", () => {
    it("prefixes keys correctly", () => {
      const s = store("local", "myapp:");
      s.set("token", "secret");
      expect(localStorage.getItem("myapp:token")).toBe("secret");
    });

    it("strips prefix in all()", () => {
      const s = store("local", "myapp:");
      s.set("user", { name: "Bob" });
      const keys = Object.keys(s.all());
      expect(keys).toContain("user");
      expect(keys).not.toContain("myapp:user");
    });
  });

  describe("chaining", () => {
    it("set() returns this for chaining", () => {
      const s = store("local", "test_store:");
      expect(s.set("a", 1).set("b", 2)).toBe(s);
    });

    it("rm() returns this for chaining", () => {
      const s = store("local", "test_store:");
      s.set("x", 1);
      expect(s.rm("x")).toBe(s);
    });

    it("clear() returns this for chaining", () => {
      const s = store("local", "test_store:");
      expect(s.clear()).toBe(s);
    });
  });

  describe("error handling", () => {
    it("handles storage errors gracefully", () => {
      const orig = Object.getOwnPropertyDescriptor(window, "localStorage");
      Object.defineProperty(window, "localStorage", {
        value: {
          getItem: () => {
            throw new Error("Storage error");
          },
          setItem: () => {
            throw new Error("Storage error");
          },
          removeItem: () => {},
          clear: () => {},
          key: () => null,
          get length() {
            return 0;
          },
        },
        writable: true,
        configurable: true,
      });
      const s = store("local", "test_store:");
      expect(() => s.set("key", "val")).not.toThrow();
      expect(s.get("key")).toBeNull();
      if (orig) Object.defineProperty(window, "localStorage", orig);
    });
  });
});
