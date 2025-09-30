// @marwajs/dom/fx
// Adds single-word animation helpers to Dom via a one-time enableFx() call.
// Usage:
//   import dom, { Dom } from "@marwajs/dom";
//   import { enableFx, ease } from "@marwajs/dom/fx";
//   enableFx();  // patches Dom.prototype
//   dom("#box").fade(300).move(20, 0, 300).scale(1.2, 300);

import type { Dom as DomType } from "./index";

type Easing = (t: number) => number;

const ease = {
  linear: (t: number) => t,
  in: (t: number) => t * t,
  out: (t: number) => 1 - (1 - t) * (1 - t),
  inout: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
} as const;
export { ease };

type Tweenable = {
  opacity?: number;
  x?: number; // translateX px
  y?: number; // translateY px
  scale?: number;
  rotate?: number; // deg
  [cssProp: `--${string}` | string]: number | undefined; // numeric CSS custom props or styles
};

type FXState = {
  raf?: number;
  start?: number;
  stop?: boolean;
  from?: Record<string, number>;
  to?: Record<string, number>;
};

const FX = new WeakMap<Element, FXState>();

function now() {
  return performance.now();
}

function readStyle(el: HTMLElement, k: string): number {
  const cs = getComputedStyle(el);
  if (k === "opacity") return parseFloat(cs.opacity || "1") || 0;
  if (k === "x") return 0; // we manage transforms ourselves
  if (k === "y") return 0;
  if (k === "scale") return 1;
  if (k === "rotate") return 0;
  const raw = cs.getPropertyValue(k.startsWith("--") ? k : k.replace(/[A-Z]/g, m => "-" + m.toLowerCase())) || "0";
  const num = parseFloat(raw);
  return isNaN(num) ? 0 : num;
}

function write(el: HTMLElement, k: string, v: number) {
  if (k === "opacity") {
    el.style.opacity = String(v);
    return;
  }
  if (k === "x" || k === "y" || k === "scale" || k === "rotate") {
    // transform composer
    const st = FX.get(el) as FXState;
    const f = st?.to || {};
    const x = k === "x" ? v : f.x ?? st?.from?.x ?? 0;
    const y = k === "y" ? v : f.y ?? st?.from?.y ?? 0;
    const s = k === "scale" ? v : f.scale ?? st?.from?.scale ?? 1;
    const r = k === "rotate" ? v : f.rotate ?? st?.from?.rotate ?? 0;
    (el.style as any).transform = `translate(${x}px, ${y}px) scale(${s}) rotate(${r}deg)`;
    return;
  }
  // css vars or numeric styles (assume px)
  if (k.startsWith("--")) el.style.setProperty(k, String(v));
  else (el.style as any)[k] = `${v}px`;
}

function cancel(el: Element) {
  const st = FX.get(el);
  if (!st) return;
  st.stop = true;
  if (st.raf) cancelAnimationFrame(st.raf);
  FX.delete(el);
}

function tweenElement(
  el: HTMLElement,
  to: Tweenable,
  ms: number,
  easing: Easing,
  onDone?: () => void
) {
  cancel(el);
  const from: Record<string, number> = {};
  const dst: Record<string, number> = {};
  for (const k of Object.keys(to)) {
    const t = to[k]!;
    const cur = readStyle(el, k);
    from[k] = cur;
    dst[k] = t;
  }
  const st: FXState = { from, to: dst, stop: false };
  FX.set(el, st);

  const start = now();
  st.start = start;

  const step = () => {
    if (st.stop) return;
    const t = Math.min(1, (now() - start) / Math.max(1, ms));
    const e = easing(t);

    for (const k of Object.keys(dst)) {
      const a = from[k]!;
      const b = dst[k]!;
      const v = a + (b - a) * e;
      write(el, k, v);
    }

    if (t < 1) {
      st.raf = requestAnimationFrame(step);
    } else {
      FX.delete(el);
      onDone && onDone();
    }
  };

  st.raf = requestAnimationFrame(step);
}

// Public helpers (operate on first element in the Dom set)
function fxTo(d: any, to: Tweenable, ms = 300, easing: Easing = ease.inout): any {
  const el = d.first as HTMLElement | undefined;
  if (el) tweenElement(el, to, ms, easing);
  return d;
}
function fxFade(d: any, ms = 300, show?: boolean, easing: Easing = ease.inout): any {
  const el = d.first as HTMLElement | undefined;
  if (!el) return d;
  const target = show === undefined ? (parseFloat(getComputedStyle(el).opacity || "1") < 0.5) : show;
  el.style.willChange = "opacity";
  if (target && el.style.display === "none") el.style.display = "";
  tweenElement(
    el,
    { opacity: target ? 1 : 0 },
    ms,
    easing,
    () => {
      el.style.willChange = "";
      if (!target) el.style.display = "none";
    }
  );
  return d;
}
function fxMove(d: any, x = 0, y = 0, ms = 300, easing: Easing = ease.inout): any {
  const el = d.first as HTMLElement | undefined;
  if (el) tweenElement(el, { x, y }, ms, easing);
  return d;
}
function fxScale(d: any, s = 1, ms = 300, easing: Easing = ease.inout): any {
  const el = d.first as HTMLElement | undefined;
  if (el) tweenElement(el, { scale: s }, ms, easing);
  return d;
}
function fxRotate(d: any, deg = 0, ms = 300, easing: Easing = ease.inout): any {
  const el = d.first as HTMLElement | undefined;
  if (el) tweenElement(el, { rotate: deg }, ms, easing);
  return d;
}
function fxStop(d: any): any {
  const el = d.first as HTMLElement | undefined;
  if (el) cancel(el);
  return d;
}

/** Enable patching: adds single-word fx methods onto Dom.prototype */
export function enableFx() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Dom } = require("./index") as { Dom: typeof DomType };
  const P = (Dom as any).prototype;
  if (P.__fxPatched) return;
  P.to = function (to: Tweenable, ms?: number, easing?: Easing) { return fxTo(this, to, ms, easing); };
  P.fade = function (ms?: number, show?: boolean, easing?: Easing) { return fxFade(this, ms, show, easing); };
  P.move = function (x?: number, y?: number, ms?: number, easing?: Easing) { return fxMove(this, x, y, ms, easing); };
  P.scale = function (s?: number, ms?: number, easing?: Easing) { return fxScale(this, s, ms, easing); };
  P.rotate = function (deg?: number, ms?: number, easing?: Easing) { return fxRotate(this, deg, ms, easing); };
  P.stop = function () { return fxStop(this); };
  P.__fxPatched = true;
}

// Ambient typing for consumers (optional)
declare global {
  interface HTMLElement {
    // no-op, reserved
  }
  // Augment Dom type when enableFx() is used
  // (kept here for editor intellisense; actual patch via enableFx)
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface DomFX {}
}

export type { Tweenable, Easing };
