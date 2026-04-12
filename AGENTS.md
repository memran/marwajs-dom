# AGENTS.md — marwajs-dom

## Commands

```bash
npm run build   # TypeScript compile → dist/ (ESM + .d.ts)
npm run clean   # rimraf dist
npm run dev     # tsc -w (watch mode)
npm run lint    # eslint src/**/*.{ts,tsx}
npm run format  # prettier -w "src/**/*.{ts,tsx,md}"
npm test        # vitest run (happy-dom environment)
npm run test:watch  # vitest (watch mode)
```

## Architecture

- **Single package**: `src/` has 4 modules — `index.ts` (core Dom class), `fx.ts` (animations), `store.ts` (localStorage), `net.ts` (fetch)
- **Entry points**: `dom()` function + `make()` factory in index.ts
- **fx addon**: Import `enableFx()` from `./fx` and call it once to patch `Dom.prototype`
- **tsconfig exclude**: `**/__tests__/**` — no test directory exists yet

## Build quirks

- `tsconfig.json` sets `"noEmitOnError": true` — build fails on type errors
- All subpaths exported in `package.json` (`./fx`, `./store`, `./net`) must have corresponding files in `src/` and output to `dist/`
- `prepare` script runs `npm run build` on `npm install`

## Style

- Prettier enforces single-quotes, LF line endings
- ESLint for TypeScript linting
