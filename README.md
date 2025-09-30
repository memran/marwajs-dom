# @marwajs/dom

[![npm version](https://img.shields.io/npm/v/@marwajs/dom?color=blue&logo=npm)](https://www.npmjs.com/package/@marwajs/dom)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@marwajs/dom?color=purple)](https://bundlephobia.com/package/@marwajs/dom)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Fluent, **single-word**, chainable DOM utilities with first-class DX — plus optional add-ons:

- **Core**: selection, traversal, content, attrs/data, class/style, tree ops, geometry, scroll, events (incl. delegation).
- **fx**: micro animations via `requestAnimationFrame`.
- **store**: tiny local/session storage helpers.
- **net**: fetch wrapper with abort, timeout, JSON helpers, and mini-interceptors.

ESM-only, TypeScript, zero deps, tree-shake friendly.

---

## Install

```bash
npm i @marwajs/dom
# pnpm add @marwajs/dom
# yarn add @marwajs/dom
```

## Quick Start
```sh
import dom, { make } from "@marwajs/dom";

const $app = dom("#app");

const card = make("<div class='card'><h3></h3><p></p></div>");
card.find("h3").text("Hello");
card.find("p").text("Fluent DOM, less code.");

$app.add(card).find("h3").class("?active").css({ marginTop: 16 });
```

### Single-word API highlights
    - Tree: add, pre, before, after, wrap, unwrap, rm, empty
    - Query: find, up, near
    - Content: text, html, val
    - Attrs/Data: attr, data
    - Class/Style: class("active" | "!active" | "?active"), css, show, hide, flip
    - Events: on, off, once, onD("click", "button", ...) (delegation)
    - Geometry/Scroll: box, pos, top, left
    - Utils: each, map, pipe
    - class("?open") toggles; class("!open") removes; class("open") adds.

## Add-ons
### fx — micro animations
```sh
import dom from "@marwajs/dom";
import { enableFx, ease } from "@marwajs/dom/fx";

enableFx(); // one-time: patches Dom.prototype

dom("#hero")
  .fade(300, true)
  .move(0, 24, 300, ease.out)
  .scale(1.05, 200);
```
Added methods (operate on the first element in the set): to, fade, move, scale, rotate, stop.

### store — tiny storage helper

```sh
import { store } from "@marwajs/dom/store";

const s = store("local", "app:");
s.set("token", "abc123").set("user", { id: 7 });

s.get<string>("token");   // "abc123"
s.has("user");            // true
s.all();                  // { token: "abc123", user: { id: 7 } }
s.rm("token");
```
API: get, set, rm, has, all, clear. Scopes: "local" or "session". Namespacing via prefix.

### net — fetch wrapper (abort, timeout, JSON, interceptors)
```sh
import { net } from "@marwajs/dom/net";

const api = net("https://api.example.com", { timeout: 8000 });

api.use(({ init }) => { (init.headers as any) = { ...(init.headers || {}), "X-App": "marwa" }; });
api.after((res) => { if (res.status === 401) console.warn("unauthorized"); });
api.trap((err) => { console.error("network error:", err); });

const { data: me } = await api.get("/me").json<{ id: number; name: string }>();
await api.post("/posts", { title: "Hi" }).ok(); // throws on non-2xx
```
Client methods: get, post, put, patch, del, head, plus utilities use, after, trap, abort, header, base, timeout.
Reply readers: ok(), json(), text(), blob(), bytes().

### Build
```sh
npm run build
```
Outputs ESM + .d.ts to dist/.

## TypeScript & ESM
exports map exposes subpaths: ".", "./fx", "./store", "./net".
Strong typings for events and helpers. Works great with Vite/Rollup.

## Basic usage

```sh
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>@marwajs/dom demo</title>
    <style>
      .card { border: 1px solid #ddd; margin: 12px; }
      .active { outline: 2px solid #09f; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <button class="btn">Toggle</button>

    <script type="module">
      import dom, { make } from './index.js';

      const $app = dom('#app');
      const card = make('<div class="card"><h3></h3><p></p></div>');
      card.find('h3').text('Hello');
      card.find('p').text('Fluent DOM, less code.');
      $app.add(card);

      card.on('click', () => card.class('?active'));
      dom(document).onD('click', '.btn', (_e, btn) => dom(btn).class('?active'));
    </script>
  </body>
</html>

```

```sh
import dom, { make, Dom } from "@marwajs/dom";

// select
const $app = dom("#app");

// create & add
const card = make("<div class='card'><h3></h3><p></p></div>");
card.find("h3").text("Hello");
card.find("p").text("Fluent DOM, less code.");

$app.add(card);

// style + class
card.css({ padding: 16, borderRadius: 8 }).class("active");

// events
card.on("click", () => card.class("?active")); // toggle active on click
dom(document).onD("click", ".btn", (\_e, btn) => dom(btn).class("?on"));

// insert before/after
make("<hr>").before(card);

// scroll helpers
dom(window).top(0);

// remove
card.rm();
```

## Wiring it Up

```sh
// fx
import dom from "@marwajs/dom";
import { enableFx, ease } from "@marwajs/dom/fx";

enableFx();

dom("#hero").fade(300, true).move(0, 24, 300, ease.out).scale(1.05, 250);

// store
import { store } from "@marwajs/dom/store";

const s = store("local", "app:");
s.set("token", "abc123").set("user", { id: 7 });
console.log(s.get<string>("token"));
console.log(s.has("user"), s.all());

// net
import { net } from "@marwajs/dom/net";
const api = net("https://api.example.com", { timeout: 8000 });

api.use(({ init }) => { (init.headers as any) = { ...(init.headers || {}), "X-App": "marwa" }; });
api.after((res) => { if (res.status === 401) console.warn("unauthorized"); });
api.trap((err) => { console.error("network error:", err); });

const { data: me } = await api.get("/me").json<{ id: number; name: string }>();
await api.post("/posts", { title: "Hi" }).ok(); // throw if non-2xx
```
License

MIT © Mohammad Emran