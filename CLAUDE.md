# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build        # Compile TypeScript and bundle via Webpack → dist/
npm run dev          # Watch mode — rebuilds on file changes
npm test             # Run Jest test suite
npm run test:watch   # Jest in watch mode
npm run lint         # ESLint on src/ and tests/
```

To run a single test file:
```bash
npx jest tests/unit/content.test.ts
```

## Architecture

WebQualityAnalyzer is a **Chrome Manifest V3 browser extension** with three isolated execution contexts, each compiled to a separate Webpack bundle:

| Script | Bundle | Role |
|--------|--------|------|
| `src/background/background.ts` | `background.bundle.js` | Service worker — extension lifecycle events |
| `src/content/content.ts` | `content.bundle.js` | Content script — runs analysis directly on page DOM |
| `src/popup/popup.ts` | `popup.bundle.js` | Popup UI — sends messages to content script, renders results |

### Communication Flow

Popup → (Chrome message API) → Content Script → returns `AnalysisResult` → Popup renders

The content script exposes three analysis functions (`analyzeAccessibility`, `analyzeSEO`, `analyzePerformance`) that return `CategoryResult` objects with a numeric score (0–100) and arrays of `Issue` items.

### Key Interfaces (defined in `src/content/content.ts`)

```typescript
interface AnalysisResult {
  score: number;        // 0–100 overall (mean of three categories)
  pageInfo: {
    url: string;
    title: string;
    timestamp: string;  // ISO 8601
  };
  categories: {
    accessibility: CategoryResult;
    seo: CategoryResult;
    performance: CategoryResult;
  };
}

interface CategoryResult {
  score: number;        // 0–100
  issues: Issue[];
  suggestions: string[];
}

interface Issue {
  type: string;         // e.g. 'Missing Alt Text', 'Page Title'
  message: string;
  severity: 'high' | 'medium' | 'low';
  element?: string;     // CSS selector or src of the offending element
}
```

### Build Output

Webpack copies `src/manifest.json` and `src/popup.html` into `dist/` alongside the bundles. The `dist/` directory is what gets loaded as the unpacked extension in Chrome.

## Code Quality

- **TypeScript strict mode** is on — `noImplicitReturns`, `noUnusedLocals`, explicit return types preferred
- **ESLint rules**: `prefer-const`, `no-var`, `@typescript-eslint/no-unused-vars` all set to `error`
- **Prettier**: single quotes, 2-space indent, trailing commas (ES5), 80-char print width
- **Jest coverage threshold**: 80% across branches, functions, lines, and statements

## CI

| Workflow | File | Triggers | Steps |
|----------|------|----------|-------|
| CI | `.github/workflows/ci.yml` | push (all branches), PR → main | lint, build |
| Tests | `.github/workflows/tests.yml` | push (all branches), PR → main | test with coverage |

Actions are pinned to commit SHAs for supply-chain security. Dependabot is configured to keep them up to date weekly.

## Testing

### Test files

| File | What it covers |
|------|----------------|
| `tests/unit/content.test.ts` | `analyzeAccessibility`, `analyzeSEO`, `analyzePerformance`, `performQualityAnalysis`, `chrome.runtime.onMessage` listener |
| `tests/unit/popup.test.ts` | All exported popup UI functions: `switchTab`, `updatePageInfo`, `showLoadingState`, `showError`, `displayResults`, `displayCategoryContent`, `getScoreColor`, `exportResults`, `runAnalysis` |
| `tests/unit/background.test.ts` | `chrome.runtime.onInstalled` registration and callback |

Coverage baseline (2026-03): **94.69% stmts / 90.81% branches / 86.48% funcs / 94.58% lines** — all above the 80% global threshold.

### Setup

Chrome extension APIs (`chrome.*`) are mocked globally in `tests/setup.ts` (loaded via `setupFilesAfterEnv`). All `chrome.runtime` and `chrome.tabs` methods are `jest.fn()` so any module that calls them at import time won't throw in jsdom.

### Key patterns

- **Module load-time side effects** (background.ts, content.ts): capture the registered listener in `beforeAll` before any `jest.clearAllMocks()` in `beforeEach` wipes it. For background.ts use `jest.isolateModules` + `require()` to get a fresh execution per test — suppress the lint rule with `// eslint-disable-next-line @typescript-eslint/no-require-imports` on that line.
- **jsdom quirks**:
  - `document.head.innerHTML = '...'` removes any existing `<title>` — always set `document.title` *after* assigning `head.innerHTML`.
  - `img.naturalWidth` / `img.naturalHeight` are always `0` — use `Object.defineProperty` with a getter to simulate large images.
  - `Blob.prototype.text()` is not implemented — spy on `JSON.stringify` to inspect data passed to the Blob constructor.
  - `URL.createObjectURL` / `URL.revokeObjectURL` are not implemented — mock both on `global.URL` before testing `exportResults`.
