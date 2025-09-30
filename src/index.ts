/* @marwajs/dom
 * Fluent, single-word, chainable DOM utilities for great DX.
 * ESM-only. No deps. Tree-shake friendly.
 */

export type DomInput =
  | string
  | Element
  | Document
  | Window
  | NodeListOf<Element>
  | Element[]
  | Dom;

type Maybe<T> = T | null | undefined;
type StyleValue = string | number;

type OnOptions = boolean | AddEventListenerOptions;
type EventMap = HTMLElementEventMap & DocumentEventMap & WindowEventMap;

function toArray<T>(x: ArrayLike<T> | T | null | undefined): T[] {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (typeof (x as any).length === "number")
    return Array.prototype.slice.call(x);
  return [x as T];
}

function isElement(x: any): x is Element {
  return x && typeof x === "object" && x.nodeType === 1;
}

function camel(name: string) {
  return name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function kebab(name: string) {
  return name.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
}

function setStyle(el: Element, k: string, v: StyleValue) {
  const style = (el as HTMLElement).style;
  if (!style) return;
  if (v == null) {
    // remove
    style.removeProperty(k.includes("-") ? k : kebab(k));
    return;
  }
  (style as any)[camel(k)] =
    typeof v === "number" && !/^(opacity|zIndex)$/i.test(k) ? `${v}px` : v;
}

/** Tiny internal event registry for `off()` without keeping user closures around */
const REG = new WeakMap<
  Element | Document | Window,
  Map<string, Set<EventListenerOrEventListenerObject>>
>();

function regGetKey(target: Element | Document | Window, type: string) {
  let m = REG.get(target);
  if (!m) {
    m = new Map();
    REG.set(target, m);
  }
  let set = m.get(type);
  if (!set) {
    set = new Set();
    m.set(type, set);
  }
  return set;
}

/** Core collection */
export class Dom {
  readonly list: (Element | Document | Window)[];

  constructor(input?: DomInput, root: Document | Element = document) {
    if (!input) {
      this.list = [];
    } else if (typeof input === "string") {
      this.list =
        input.trim() === "" ? [] : Array.from(root.querySelectorAll(input));
    } else if (input instanceof Dom) {
      this.list = input.list.slice();
    } else if (isElement(input) || input === document || input === window) {
      this.list = [input];
    } else if ((input as any).length != null) {
      this.list = toArray<Element>(input as any);
    } else {
      this.list = [];
    }
  }

  /** Make from anything */
  static of(input?: DomInput, root?: Document | Element) {
    return new Dom(input, root);
  }

  /** Create element(s) from HTML string or tag name */
  static make(htmlOrTag: string, attrs?: Record<string, any>): Dom {
    if (htmlOrTag.startsWith("<")) {
      const tpl = document.createElement("template");
      tpl.innerHTML = htmlOrTag.trim();
      return new Dom(Array.from(tpl.content.children) as Element[]);
    }
    const el = document.createElement(htmlOrTag);
    const d = new Dom(el);
    if (attrs) d.attr(attrs);
    return d;
  }

  // ===== Collection helpers =====
  get first(): Element | Document | Window | undefined {
    return this.list[0];
  }

  get length(): number {
    return this.list.length;
  }

  at(i: number): Dom {
    const el = this.list.at(i);
    return new Dom(el && isElement(el) ? (el as Element) : undefined);
  }

  each(fn: (el: Element, i: number) => void): this {
    this.list.forEach((e, i) => isElement(e) && fn(e, i));
    return this;
  }

  map<T>(fn: (el: Element, i: number) => T): T[] {
    const out: T[] = [];
    this.list.forEach((e, i) => isElement(e) && out.push(fn(e, i)));
    return out;
  }

  // ===== Query =====
  find(sel: string): Dom {
    const found: Element[] = [];
    this.each((el) => found.push(...Array.from(el.querySelectorAll(sel))));
    return new Dom(found);
  }

  near(sel: string): Dom {
    // siblings
    const out: Element[] = [];
    this.each((el) => {
      const parent = el.parentElement;
      if (!parent) return;
      out.push(
        ...Array.from(parent.children).filter((x) => x !== el && x.matches(sel))
      );
    });
    return new Dom(out);
  }

  root(sel?: string): Dom {
    if (!sel) return new Dom(document);
    return new Dom(document.querySelectorAll(sel));
  }

  up(sel: string): Dom {
    const out: Element[] = [];
    this.each((el) => {
      const m = el.closest(sel);
      if (m) out.push(m);
    });
    return new Dom(out);
  }

  // ===== Content =====
  text(v?: Maybe<string>): this | string {
    if (v === undefined) {
      const el = this.first as Element | undefined;
      return el ? (el.textContent ?? "") : "";
    }
    return this.each((el) => (el.textContent = v ?? ""));
  }

  html(v?: Maybe<string>): this | string {
    if (v === undefined) {
      const el = this.first as Element | undefined;
      return el ? (el.innerHTML ?? "") : "";
    }
    return this.each((el) => (el.innerHTML = v ?? ""));
  }

  val(v?: Maybe<string>): this | string | null {
    const el = this.first as any;
    if (v === undefined) {
      return el && "value" in el ? (el.value as string) : null;
    }
    this.each((e) => {
      if ("value" in (e as any)) (e as any).value = v ?? "";
    });
    return this;
  }

  // ===== Attrs & Data =====
  attr(name: string, value?: Maybe<string>): this;
  attr(map: Record<string, Maybe<string>>): this;
  attr(nameOrMap: any, value?: Maybe<string>): this {
    if (typeof nameOrMap === "string") {
      const k = nameOrMap;
      if (value === undefined) {
        // getter (first only)
        // NOTE: explicit getter is intentionally omitted to keep API single-word & chain-first
        return this;
      }
      return this.each((el) => {
        if (value == null) el.removeAttribute(k);
        else el.setAttribute(k, String(value));
      });
    } else if (nameOrMap && typeof nameOrMap === "object") {
      const obj = nameOrMap as Record<string, Maybe<string>>;
      Object.keys(obj).forEach((k) => this.attr(k, obj[k]));
      return this;
    }
    return this;
  }

  data(name: string, value?: Maybe<string>): this;
  data(map: Record<string, Maybe<string>>): this;
  data(nameOrMap: any, value?: Maybe<string>): this {
    if (typeof nameOrMap === "string") {
      const k = nameOrMap;
      return this.each((el) => {
        const ds = (el as HTMLElement).dataset;
        if (!ds) return;
        if (value == null) delete (ds as any)[camel(k)];
        else (ds as any)[camel(k)] = String(value);
      });
    } else if (nameOrMap && typeof nameOrMap === "object") {
      const obj = nameOrMap as Record<string, Maybe<string>>;
      Object.keys(obj).forEach((k) => this.data(k, obj[k]));
      return this;
    }
    return this;
  }

  // ===== Class (single-word, multi-mode) =====
  /** class("active") → add; class("!active") → remove; class("?active") → toggle */
  class(token: string): this {
    const mode =
      token[0] === "!" ? "remove" : token[0] === "?" ? "toggle" : "add";
    const name = token[0] === "!" || token[0] === "?" ? token.slice(1) : token;
    return this.each((el) => el.classList[mode](name));
  }

  // ===== Style =====
  css(name: string, value?: Maybe<StyleValue>): this;
  css(map: Record<string, Maybe<StyleValue>>): this;
  css(nameOrMap: any, value?: Maybe<StyleValue>): this {
    if (typeof nameOrMap === "string") {
      return this.each((el) => setStyle(el, nameOrMap, value as any));
    } else if (nameOrMap && typeof nameOrMap === "object") {
      const obj = nameOrMap as Record<string, Maybe<StyleValue>>;
      return this.each((el) => {
        Object.keys(obj).forEach((k) => setStyle(el, k, obj[k] as any));
      });
    }
    return this;
  }

  show(): this {
    return this.each((el) => setStyle(el, "display", ""));
  }

  hide(): this {
    return this.each((el) => setStyle(el, "display", "none"));
  }

  flip(show?: boolean): this {
    return show === undefined
      ? this.each(
          (el) => ((el as HTMLElement).hidden = !(el as HTMLElement).hidden)
        )
      : show
        ? this.show()
        : this.hide();
  }

  // ===== Tree ops =====
  add(child: DomInput | Node): this {
    const nodes =
      child instanceof Dom
        ? child.list
        : isElement(child) || child === document || child === window
          ? [child as any]
          : child instanceof Node
            ? [child]
            : new Dom(child as any).list;

    return this.each((el) => nodes.forEach((n) => el.appendChild(n as any)));
  }

  pre(child: DomInput | Node): this {
    const nodes =
      child instanceof Dom
        ? child.list
        : isElement(child) || child instanceof Node
          ? [child as any]
          : new Dom(child as any).list;

    return this.each((el) =>
      nodes.forEach((n) => el.insertBefore(n as any, el.firstChild))
    );
  }

  before(node: DomInput | Node): this {
    const nodes =
      node instanceof Dom
        ? node.list
        : isElement(node) || node instanceof Node
          ? [node as any]
          : new Dom(node as any).list;
    return this.each((el) =>
      nodes.forEach((n) => el.parentNode?.insertBefore(n as any, el))
    );
  }

  after(node: DomInput | Node): this {
    const nodes =
      node instanceof Dom
        ? node.list
        : isElement(node) || node instanceof Node
          ? [node as any]
          : new Dom(node as any).list;
    return this.each((el) =>
      nodes.forEach((n) =>
        el.parentNode?.insertBefore(n as any, el.nextSibling)
      )
    );
  }

  wrap(htmlOrTag: string): this {
    return this.each((el) => {
      const w = Dom.make(htmlOrTag).first as Element;
      if (!w || !el.parentNode) return;
      el.parentNode.insertBefore(w, el);
      w.appendChild(el);
    });
  }

  unwrap(): this {
    return this.each((el) => {
      const p = el.parentNode as Element | null;
      if (!p || !p.parentNode) return;
      while (el.firstChild) p.insertBefore(el.firstChild, el);
      p.removeChild(el);
    });
  }

  empty(): this {
    return this.each((el) => (el.innerHTML = ""));
  }

  rm(): this {
    this.each((el) => el.parentNode?.removeChild(el));
    return this;
  }

  clone(deep = true): Dom {
    const out: Element[] = [];
    this.each((el) => out.push(el.cloneNode(deep) as Element));
    return new Dom(out);
  }

  // ===== Geometry =====
  box(): DOMRect | null {
    const el = this.first as Element | undefined;
    return el && isElement(el) ? el.getBoundingClientRect() : null;
  }

  pos(x?: number, y?: number): this | { x: number; y: number } {
    const el = this.first as HTMLElement | undefined;
    if (!el) return this;
    if (x === undefined || y === undefined) {
      return { x: el.offsetLeft, y: el.offsetTop };
    }
    el.style.position ||= "relative";
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    return this;
  }

  // ===== Events =====
  on<K extends keyof EventMap>(
    type: K,
    handler: (ev: EventMap[K]) => void,
    opts?: OnOptions
  ): this {
    this.list.forEach((t) => {
      if (!t || (t as any).addEventListener == null) return;
      (t as any).addEventListener(type as string, handler as any, opts);
      regGetKey(t as any, type as string).add(handler as any);
    });
    return this;
  }

  off<K extends keyof EventMap>(
    type?: K,
    handler?: (ev: EventMap[K]) => void
  ): this {
    this.list.forEach((t) => {
      const target = t as any;
      if (!target || target.removeEventListener == null) return;

      if (!type) {
        // remove all types
        const m = REG.get(target);
        if (!m) return;
        m.forEach((set, typ) =>
          set.forEach((h) => target.removeEventListener(typ, h as any))
        );
        REG.delete(target);
        return;
      }

      if (handler) {
        target.removeEventListener(type as string, handler as any);
        const set = regGetKey(target, type as string);
        set.delete(handler as any);
      } else {
        const set = regGetKey(target, type as string);
        set.forEach((h) =>
          target.removeEventListener(type as string, h as any)
        );
        set.clear();
      }
    });
    return this;
  }

  once<K extends keyof EventMap>(
    type: K,
    handler: (ev: EventMap[K]) => void,
    opts?: OnOptions
  ): this {
    const wrap = (ev: Event) => {
      handler(ev as any);
      this.off(type as any, wrap as any);
    };
    return this.on(type, wrap as any, opts);
  }

  /** Delegated listener: onD("click", "button", h) */
  onD<K extends keyof EventMap>(
    type: K,
    sel: string,
    handler: (ev: EventMap[K], match: Element) => void,
    opts?: OnOptions
  ): this {
    return this.on(
      type,
      (ev: Event) => {
        const t = ev.target as Element | null;
        if (!t) return;
        const host = this.first as Element | Document | Window | undefined;
        const root =
          host && "contains" in (host as any) ? (host as Element) : document;
        const match = (t.closest as any)?.(sel);
        if (match && (root as Element).contains(match))
          handler(ev as any, match);
      },
      opts
    );
  }

  // ===== Scroll =====
  top(v?: number): this | number {
    const t = this.first as any;
    if (v === undefined) return t?.scrollTop ?? window.scrollY ?? 0;
    this.list.forEach((n) => {
      if ("scrollTop" in (n as any)) (n as any).scrollTop = v;
      else window.scrollTo({ top: v });
    });
    return this;
  }

  left(v?: number): this | number {
    const t = this.first as any;
    if (v === undefined) return t?.scrollLeft ?? window.scrollX ?? 0;
    this.list.forEach((n) => {
      if ("scrollLeft" in (n as any)) (n as any).scrollLeft = v;
      else window.scrollTo({ left: v });
    });
    return this;
  }

  // ===== Utility =====
  pipe(fn: (d: Dom) => void): this {
    fn(this);
    return this;
  }

  // Iterator (for ... of)
  [Symbol.iterator]() {
    return this.list[Symbol.iterator]();
  }
}

// ===== Entry sugar =====
export function dom(input?: DomInput, root?: Document | Element) {
  return new Dom(input, root);
}

// Named factory for “single-word” create
export function make(htmlOrTag: string, attrs?: Record<string, any>) {
  return Dom.make(htmlOrTag, attrs);
}

export default dom;
