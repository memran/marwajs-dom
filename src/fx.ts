// @marwajs/dom/fx
// Adds single-word animation helpers to Dom via a one-time enableFx() call.
// Usage:
//   import dom, { Dom } from "@marwajs/dom";
//   import { enableFx, ease } from "@marwajs/dom/fx";
//   enableFx();  // patches Dom.prototype
//   dom("#box").fade(300).move(20, 0, 300).scale(1.2, 300);

type Easing = (t: number) => number;

const ease = {
  linear: (t: number) => t,
  in: (t: number) => t * t,
  out: (t: number) => 1 - (1 - t) * (1 - t),
  inout: (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  elastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    const c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  /** Symmetric bounce with multiple reversals */
  bounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
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

function parseTransform(cs: CSSStyleDeclaration): {
  x: number;
  y: number;
  scale: number;
  rotate: number;
} {
  const raw = cs.transform || "";
  let x = 0,
    y = 0,
    scale = 1,
    rotate = 0;

  // matrix(a, b, c, d, tx, ty)
  const matrixMatch = raw.match(
    /matrix\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\s*\)/,
  );
  if (matrixMatch) {
    const a = parseFloat(matrixMatch[1]);
    const b = parseFloat(matrixMatch[2]);
    const tx = parseFloat(matrixMatch[5]);
    const ty = parseFloat(matrixMatch[6]);
    x = tx;
    y = ty;
    scale = Math.sqrt(a * a + b * b);
    rotate = Math.atan2(b, a) * (180 / Math.PI);
    return { x, y, scale, rotate };
  }

  // translate(tx [ty])
  const tMatch = raw.match(/translate\(\s*([^,]+)(?:\s*,\s*([^)]+))?\s*\)/);
  if (tMatch) {
    x = parseFloat(tMatch[1]) || 0;
    y = parseFloat(tMatch[2]) || 0;
  }

  // scale(sx [sy])
  const sMatch = raw.match(/scale\(\s*([^,]+)(?:\s*,\s*([^)]+))?\s*\)/);
  if (sMatch) {
    scale = parseFloat(sMatch[1]) || 1;
    const sy = parseFloat(sMatch[2]);
    if (!isNaN(sy)) scale = sy; // use sy if present
  }

  // rotate(angle)
  const rMatch = raw.match(/rotate\(\s*([^)]+)\s*\)/);
  if (rMatch) {
    const deg = parseFloat(rMatch[1]) || 0;
    if (rMatch[1].includes("deg")) rotate = deg;
    else rotate = deg * (180 / Math.PI);
  }

  return { x, y, scale, rotate };
}

function readStyle(el: HTMLElement, k: string): number {
  const cs = getComputedStyle(el);
  if (k === "opacity") return parseFloat(cs.opacity || "1") || 0;
  if (k === "x" || k === "y" || k === "scale" || k === "rotate") {
    const { x, y, scale, rotate } = parseTransform(cs);
    if (k === "x") return x;
    if (k === "y") return y;
    if (k === "scale") return scale;
    if (k === "rotate") return rotate;
  }
  const raw =
    cs.getPropertyValue(
      k.startsWith("--")
        ? k
        : k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()),
    ) || "0";
  const num = parseFloat(raw);
  return isNaN(num) ? 0 : num;
}

function write(el: HTMLElement, k: string, v: number) {
  if (k === "opacity") {
    el.style.opacity = String(v);
    return;
  }
  if (k === "x" || k === "y" || k === "scale" || k === "rotate") {
    const st = FX.get(el) as FXState;
    const f = st?.to || {};
    const x = k === "x" ? v : (f.x ?? st?.from?.x ?? 0);
    const y = k === "y" ? v : (f.y ?? st?.from?.y ?? 0);
    const s = k === "scale" ? v : (f.scale ?? st?.from?.scale ?? 1);
    const r = k === "rotate" ? v : (f.rotate ?? st?.from?.rotate ?? 0);
    const existing = el.style.transform || "";
    const preserved = existing
      .replace(/translate\([^)]*\)\s*scale\([^)]*\)\s*rotate\([^)]*\)/g, "")
      .trim();
    (el.style as any).transform = preserved
      ? `${preserved} translate(${x}px, ${y}px) scale(${s}) rotate(${r}deg)`
      : `translate(${x}px, ${y}px) scale(${s}) rotate(${r}deg)`;
    return;
  }
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
  onDone?: () => void,
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
function fxTo(
  d: any,
  to: Tweenable,
  ms = 300,
  easing: Easing = ease.inout,
): any {
  const el = d.first as HTMLElement | undefined;
  if (el) tweenElement(el, to, ms, easing);
  return d;
}
function fxFade(
  d: any,
  ms = 300,
  show?: boolean,
  easing: Easing = ease.inout,
): any {
  const el = d.first as HTMLElement | undefined;
  if (!el) return d;
  const target =
    show === undefined
      ? parseFloat(getComputedStyle(el).opacity || "1") < 0.5
      : show;
  el.style.willChange = "opacity";
  if (target && el.style.display === "none") el.style.display = "";
  tweenElement(el, { opacity: target ? 1 : 0 }, ms, easing, () => {
    el.style.willChange = "";
    if (!target) el.style.display = "none";
  });
  return d;
}
function fxMove(
  d: any,
  x = 0,
  y = 0,
  ms = 300,
  easing: Easing = ease.inout,
): any {
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

let _patched = false;
let _domProto: any = null;

async function getDomPrototype(): Promise<any> {
  if (_domProto) return _domProto;
  const { Dom } = await import("./index.js");
  _domProto = Dom.prototype;
  return _domProto;
}

let _patchPromise: Promise<void> | null = null;

export function enableFx(): Promise<void> | void {
  if (_patched) return;
  if (!_patchPromise) {
    _patchPromise = getDomPrototype().then((P) => {
      if (P.__fxPatched) return;
      P.to = function (to: Tweenable, ms?: number, easing?: Easing) {
        return fxTo(this, to, ms, easing);
      };
      P.fade = function (ms?: number, show?: boolean, easing?: Easing) {
        return fxFade(this, ms, show, easing);
      };
      P.move = function (x?: number, y?: number, ms?: number, easing?: Easing) {
        return fxMove(this, x, y, ms, easing);
      };
      P.scale = function (s?: number, ms?: number, easing?: Easing) {
        return fxScale(this, s, ms, easing);
      };
      P.rotate = function (deg?: number, ms?: number, easing?: Easing) {
        return fxRotate(this, deg, ms, easing);
      };
      P.stop = function () {
        return fxStop(this);
      };
      P.__fxPatched = true;
      _patched = true;
    });
  }
  return _patchPromise;
}

// Ambient typing for consumers (optional)
declare global {
  interface HTMLElement {
    // no-op, reserved
  }
  interface DomFX {}
}

export type { Tweenable, Easing };
