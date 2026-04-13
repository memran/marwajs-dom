# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm run build   # TypeScript → dist/ (ESM + .d.ts)
npm run clean   # rimraf dist
npm run dev     # tsc -w (watch mode)
npm run lint    # eslint src/**/*.{ts,tsx}
npm run format  # prettier -w "src/**/*.{ts,tsx,md}"
npm test        # vitest run (happy-dom environment)
npm run test:watch  # vitest (watch mode)
```

Run a single test file: `npx vitest run src/__tests__/index.test.ts`

## Architecture

### Package Structure

`src/` contains 4 independent modules:

- **`index.ts`** — Core `Dom` class + `dom()` function + `make()` factory. The `Dom` class wraps element sets and provides chainable DOM operations (selection, content, attrs, class, style, tree ops, events, scroll, geometry).
- **`fx.ts`** — Animation add-on. Import `enableFx()` and call it **once** to patch `Dom.prototype` with `.fade()`, `.move()`, `.scale()`, `.rotate()`, `.to()`, `.stop()`. Uses `requestAnimationFrame` and CSS transforms internally. Exports `ease` object with `linear`, `in`, `out`, `inout`.
- **`store.ts`** — localStorage/sessionStorage wrapper. `store("local", "ns:")` or `store("session")`. Auto JSON-serializes objects. Safe (swallows errors).
- **`net.ts`** — Minimal fetch client. `net("https://api.example.com")` returns a client with `.get()`, `.post()`, `.put()`, `.patch()`, `.del()`, `.head()`, plus `.use()`, `.after()`, `.trap()` interceptors and `.header()`, `.base()`, `.timeout()`, `.abort()` utilities.

### Entry Points (package.json exports)

All subpaths (`./fx`, `./store`, `./net`) must have corresponding source files in `src/` and output to `dist/`. When adding a new submodule, add the export entry to `package.json`.

### fx Enable Pattern

`enableFx()` does a dynamic `import("./index.js")` to get `Dom.prototype`. It sets `__fxPatched` flag and returns a `Promise<void>` if not yet patched, or `void` if already patched. This means the first call is async.

### TypeScript Config

`tsconfig.json` has `noEmitOnError: true` — the build will fail on type errors. `rootDir: "src"`, `outDir: "dist"`. Test files under `src/__tests__/` are excluded from tsconfig.

## Code Style

- Prettier enforces single-quotes, LF line endings
- ESLint for TypeScript linting
- No `console.log` in source code