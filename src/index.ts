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
  if (typeof x === "object" && "length" in x && typeof x.length === "number")
    return Array.from(x);
  return [x as T];
}

/** Assert a value is non-null */
function nn<T>(v: T | null | undefined): v is T {
  return v != null;
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

function sanitizeHTML(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\bon\w+\s*=/gi, "data-removed-event=");
}

function setStyle(el: Element, k: string, v: StyleValue) {
  const style = (el as HTMLElement).style;
  if (!style) return;
  if (v == null) {
    style.removeProperty(k.includes("-") ? k : kebab(k));
    return;
  }
  const prop = camel(k);
  const num = typeof v === "number" && !/^(opacity|zIndex)$/i.test(k);
  const val = num ? `${v}px` : String(v);
  (style as unknown as Record<string, string>)[prop] = val;
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
      tpl.innerHTML = sanitizeHTML(htmlOrTag.trim());
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
        ...Array.from(parent.children).filter(
          (x) => x !== el && x.matches(sel),
        ),
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
    return this.each((el) => (el.innerHTML = sanitizeHTML(v ?? "")));
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
  attr(name: string, value?: Maybe<string>): this | string | null;
  attr(map: Record<string, Maybe<string>>): this;
  attr(nameOrMap: any, value?: Maybe<string>): this | string | null {
    if (typeof nameOrMap === "string") {
      const k = nameOrMap;
      if (value === undefined) {
        const el = this.first as Element | undefined;
        return el ? el.getAttribute(k) : null;
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
    if (
      !token ||
      (!token.startsWith("!") && !token.startsWith("?") && token.trim() === "")
    )
      return this;
    const mode =
      token[0] === "!" ? "remove" : token[0] === "?" ? "toggle" : "add";
    const name = token[0] === "!" || token[0] === "?" ? token.slice(1) : token;
    return this.each((el) => el.classList[mode](name.trim()));
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
          (el) => ((el as HTMLElement).hidden = !(el as HTMLElement).hidden),
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
      nodes.forEach((n) => el.insertBefore(n as any, el.firstChild)),
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
      nodes.forEach((n) => el.parentNode?.insertBefore(n as any, el)),
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
        el.parentNode?.insertBefore(n as any, el.nextSibling),
      ),
    );
  }

  wrap(tagName: string): this {
    if (!tagName || tagName.includes("<") || tagName.includes(" "))
      throw new Error(
        "wrap() requires a single tag name (e.g. 'div' or 'span'), not a selector",
      );
    return this.each((el) => {
      const w = Dom.make(tagName).first as Element;
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

  /** Replace each element with the given node(s) */
  replace(node: DomInput | Node): this {
    const nodes =
      node instanceof Dom
        ? node.list
        : isElement(node) || node instanceof Node
          ? [node as any]
          : Dom.make(node as string).list;
    return this.each((el) => {
      const parent = el.parentNode;
      if (!parent) return;
      nodes.forEach((n) => parent.insertBefore(n as any, el));
      el.remove();
    });
  }

  /** Swap each element with the given node(s) — alias for replace() */
  swap(node: DomInput | Node): this {
    return this.replace(node);
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
    opts?: OnOptions,
  ): this {
    this.list.forEach((t) => {
      if (!t || !("addEventListener" in t)) return;
      t.addEventListener(type, handler as EventListener, opts);
      regGetKey(t, type as string).add(handler as EventListener);
    });
    return this;
  }

  off<K extends keyof EventMap>(
    type?: K,
    handler?: (ev: EventMap[K]) => void,
  ): this {
    this.list.forEach((t) => {
      if (!t || !("removeEventListener" in t)) return;

      if (!type) {
        // remove all types
        const m = REG.get(t);
        if (!m) return;
        m.forEach((set, typ) =>
          set.forEach((h) => t.removeEventListener(typ, h as EventListener)),
        );
        REG.delete(t);
        return;
      }

      if (handler) {
        t.removeEventListener(type, handler as EventListener);
        const set = regGetKey(t, type as string);
        set.delete(handler as EventListener);
      } else {
        const set = regGetKey(t, type as string);
        set.forEach((h) => t.removeEventListener(type, h as EventListener));
        set.clear();
      }
    });
    return this;
  }

  once<K extends keyof EventMap>(
    type: K,
    handler: (ev: EventMap[K]) => void,
    opts?: OnOptions,
  ): this {
    const wrap = (ev: Event) => {
      handler(ev as EventMap[K]);
      this.off(type, wrap);
    };
    return this.on(type, wrap, opts);
  }

  /** Delegated listener: onD("click", "button", h) */
  onD<K extends keyof EventMap>(
    type: K,
    sel: string,
    handler: (ev: EventMap[K], match: Element) => void,
    opts?: OnOptions,
  ): this {
    return this.on(
      type,
      (ev: Event) => {
        const t = ev.target as Element | null;
        if (!t) return;
        const host = this.first;
        const root = nn(host) && "contains" in host ? host : document;
        const match = t.closest?.(sel) as Element | null;
        if (match && root.contains(match as Node))
          handler(ev as EventMap[K], match);
      },
      opts,
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
