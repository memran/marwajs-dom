import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import "../index";

const { enableFx, ease } = await import("../fx");

describe("fx — enableFx", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    await enableFx();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("patches Dom.prototype with animation methods", async () => {
    const $box = (await import("../index")).dom("#box");
    expect(typeof ($box as any).fade).toBe("function");
    expect(typeof ($box as any).move).toBe("function");
    expect(typeof ($box as any).scale).toBe("function");
    expect(typeof ($box as any).rotate).toBe("function");
    expect(typeof ($box as any).stop).toBe("function");
    expect(typeof ($box as any).to).toBe("function");
  });

  it("enableFx() is idempotent", async () => {
    await enableFx();
    await enableFx();
    const $box = (await import("../index")).dom("#box");
    expect(typeof ($box as any).fade).toBe("function");
  });
});

describe("fx — ease functions", () => {
  it("ease.linear", () => {
    expect(ease.linear(0)).toBe(0);
    expect(ease.linear(1)).toBe(1);
    expect(ease.linear(0.5)).toBe(0.5);
  });

  it("ease.in", () => {
    expect(ease.in(0)).toBe(0);
    expect(ease.in(1)).toBe(1);
    expect(ease.in(0.5)).toBe(0.25);
  });

  it("ease.out", () => {
    expect(ease.out(0)).toBe(0);
    expect(ease.out(1)).toBe(1);
    expect(ease.out(0.5)).toBe(0.75);
  });

  it("ease.inout", () => {
    expect(ease.inout(0)).toBe(0);
    expect(ease.inout(1)).toBe(1);
    expect(ease.inout(0.5)).toBe(0.5);
    expect(ease.inout(0.25)).toBeCloseTo(0.125);
  });
});
