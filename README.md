# marwajs-dom

[![npm version](https://img.shields.io/npm/v/marwajs-dom?color=blue&logo=npm)](https://www.npmjs.com/package/marwajs-dom)
[![npm downloads](https://img.shields.io/npm/dm/marwajs-dom?color=green&logo=npm)](https://www.npmjs.com/package/marwajs-dom)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Fluent, **single-word**, chainable DOM utilities — plus optional add-ons for animations, storage, and networking.

ESM-only, TypeScript, zero deps, tree-shake friendly.

---

## Install

```bash
npm i marwajs-dom
```

## Core API — `import dom, { make } from "marwajs-dom"`

### Selection

```js
dom("#app"); // select by id
dom(".card"); // select by class
dom("button"); // select by tag
dom("ul > li"); // select with CSS selector
dom(null); // empty Dom (no elements)
dom(element); // wrap a DOM element
dom(document); // wrap document
dom([el1, el2]); // wrap element array
dom(NodeList); // wrap NodeList
make("<p>hello</p>"); // create from HTML string
make("div", { id: "x" }); // create tag with attributes
```

### Properties

```js
dom("li").length; // number of elements
dom("li").first; // first Element | Document | Window | undefined
for (const el of dom("li")) {
  /* iterate */
}
```

### Collection helpers

```js
dom("li").at(0); // Dom at index (returns new Dom)
dom("li").at(-1); // last element
dom("li").each((el, i) => console.log(i, el)); // iterate
dom("li").map((el) => el.textContent); // transform → string[]
```

### Query

```js
dom("#app").find("p"); // descendants matching selector
dom("li").up("ul"); // closest ancestor matching selector
dom("#item").near(".sibling"); // siblings matching selector
dom.root(); // returns document
dom.root("article"); // query document for selector
```

### Content

```js
dom("p").text(); // read textContent
dom("p").text("hello"); // set textContent (returns this)
dom("p").html(); // read innerHTML
dom("p").html("<b>hi</b>"); // set innerHTML (script/on* stripped)
dom("input").val(); // read input value
dom("input").val("abc"); // set input value (returns this)
```

### Attributes & Data

```js
dom("a").attr("href"); // read href attribute
dom("a").attr("href", "/page"); // set href attribute
dom("a").attr("href", null); // remove href attribute
dom("a").attr({ title: "tip", rel: "nofollow" }); // set multiple
dom("div").data("userId"); // read data-user-id
dom("div").data("userId", "42"); // set data-user-id
dom("div").data("userId", null); // remove data-user-id attribute
dom("div").data({ id: "1", name: "x" }); // set multiple data attrs
```

### Class

```js
dom("div").class("active"); // add class "active"
dom("div").class("!active"); // remove class "active"
dom("div").class("?active"); // toggle class "active"
```

### Styles

```js
dom("div").css("color"); // read computed style
dom("div").css("fontSize", 14); // set style (numbers → px)
dom("div").css("margin", "8px"); // set style with string
dom("div").css({ padding: 12, color: "red" }); // set multiple
dom("div").css("color", null); // remove style
dom("div").show(); // remove display:none
dom("div").hide(); // set display:none
dom("div").flip(); // toggle hidden attribute
dom("div").flip(true); // show (remove hidden)
dom("div").flip(false); // hide (set display:none)
```

### Tree operations

```js
dom("#parent").add(child); // append child Dom/Element/Node
dom("#parent").pre(child); // prepend child at start
dom("#middle").before("<hr>"); // insert before each element
dom("#middle").after(el); // insert after each element
dom("span").wrap("div"); // wrap each element (single tag only)
dom(".inner").unwrap(); // remove parent of each element
dom("ul").empty(); // clear innerHTML
dom(".card").rm(); // remove each element from DOM
dom("p").clone(); // deep clone each element
dom("p").clone(false); // shallow clone
```

### Geometry

```js
dom("#box").box(); // getBoundingClientRect() → DOMRect | null
dom("#box").pos(); // { x, y } — current offset position
dom("#box").pos(100, 200); // set left/top (sets position:relative)
```

### Events

```js
dom("button").on("click", handler); // attach event listener
dom("button").on("keydown", handler, { passive: true });
dom("button").off(); // remove all listeners
dom("button").off("click"); // remove all click listeners
dom("button").off("click", handler); // remove specific listener
dom("button").once("click", handler); // fire once then remove
dom("#list").onD("click", "li", (e, el) => {
  /* delegated */
});
```

### Scroll

```js
dom("#scroller").top(); // read scrollTop (falls back to window.scrollY)
dom("#scroller").top(100); // set scrollTop
dom(window).top(0); // scroll window to top
dom("#scroller").left(); // read scrollLeft
dom("#scroller").left(50); // set scrollLeft
```

### Utilities

```js
dom("li").pipe((d) => d.class("active")); // run fn, return this
dom("li").pipe((d) => console.log(d.length));
```

---

## Add-on: `fx` — Micro animations

**Install:** `import { enableFx } from "marwajs-dom/fx"` — call once before use.

```js
enableFx(); // patches Dom.prototype — call once

dom("#box").fade(300); // fade in/out (auto-detects)
dom("#box").fade(300, true); // fade in
dom("#box").fade(300, false); // fade out

dom("#box").move(50, 100); // translate to x, y (px)
dom("#box").move(50, 100, 500); // with duration (ms)
dom("#box").move(50, 100, 500, ease.out);

dom("#box").scale(1.2); // scale (default: 1)
dom("#box").scale(1.2, 300); // with duration
dom("#box").scale(0); // scale to 0

dom("#box").rotate(45); // rotate degrees
dom("#box").rotate(360, 600, ease.inout);

dom("#box").stop(); // cancel active animation

dom("#box").to({ opacity: 0.5, scale: 1.1 }, 400);
dom("#box").to({ x: 20, y: -10, opacity: 0.8 }, 300);
dom("#box").to({ "--my-var": 50 }, 200); // CSS custom properties
```

**Easing:**

```js
ease.linear;
ease.in; // ease-in
ease.out; // ease-out
ease.inout; // ease-in-out
```

---

## Add-on: `store` — local/session storage

**Install:** `import { store } from "marwajs-dom/store"`

```js
const s = store(); // localStorage, no namespace
const s = store("local", "app:"); // localStorage with namespace
const s = store("session"); // sessionStorage, no namespace
const s = store("session", "app:"); // sessionStorage with namespace

s.set("name", "Alice"); // store string
s.set("user", { id: 1 }); // store object (auto JSON.stringify)
s.set("count", 42); // store number
s.set("enabled", true); // store boolean

s.get("name"); // "Alice" (T = string by default)
s.get("name", "fallback"); // with fallback
s.get("user"); // { id: 1 }
s.get("missing"); // null
s.get("missing", "default"); // "default"

s.has("name"); // true
s.has("missing"); // false

s.all(); // { name: "Alice", user: { id: 1 }, ... }
s.all(); // typed: s.all<User>()

s.rm("name"); // remove key
s.clear(); // clear all namespaced keys (or all if no ns)
```

All methods return `this` for chaining.

---

## Add-on: `net` — fetch wrapper

**Install:** `import { net } from "marwajs-dom/net"`

```js
const api = net("https://api.example.com", { timeout: 8000 })

// HTTP methods
const { data } = await api.get("/users/1").json()
const { data } = await api.post("/users", { name: "Alice" }).json()
const { data } = await api.put("/users/1", { name: "Bob" }).json()
const { data } = await api.patch("/users/1", { name: "Carol" }).json()
await api.del("/users/1")
const { data } = await api.head("/users").json()

// Query string
api.get("/users", { page: 1, limit: 10, active: true })
// → GET /users?page=1&limit=10&active=true
// null/undefined values are omitted

// Response readers
const { data } = await api.get("/users").json<User[]>()
const { data } = await api.get("/raw").text()
const { data } = await api.get("/file").blob()
const { data } = await api.get("/bytes").bytes()

// ok() — throws if non-2xx
await api.get("/posts/1").ok()  // throws on 404

// Interceptors
api.use(({ url, init }) => {           // before fetch — modify req
  (init.headers as any)["Authorization"] = "Bearer token"
})
api.after((res) => {                  // after fetch — inspect res
  if (res.status === 401) redirect("/login")
})
api.trap((err) => {                   // on error — handle/filter
  console.error("net error:", err)
})

// Client utilities
api.header("X-Request-ID", crypto.randomUUID())
api.base("https://other.com")           // change base URL
api.timeout(5000)                       // change timeout (ms)
api.abort()                             // abort all pending requests
```

---

## Tests

```bash
npm test        # run tests (vitest + happy-dom)
npm run test:watch  # watch mode
```

---

## Build

```bash
npm run build   # TypeScript → dist/ (ESM + .d.ts)
```

---

MIT © Mohammad Emran
