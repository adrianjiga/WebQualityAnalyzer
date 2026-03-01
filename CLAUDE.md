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
npx jest tests/unit/example.test.ts
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
  accessibility: CategoryResult;
  seo: CategoryResult;
  performance: CategoryResult;
  url: string;
  timestamp: string;
}

interface CategoryResult {
  score: number;        // 0–100
  issues: Issue[];
  suggestions: string[];
}

interface Issue {
  type: 'error' | 'warning' | 'info';
  message: string;
  element?: string;
}
```

### Build Output

Webpack copies `src/manifest.json` and `src/popup.html` into `dist/` alongside the bundles. The `dist/` directory is what gets loaded as the unpacked extension in Chrome.

## Code Quality

- **TypeScript strict mode** is on — `noImplicitReturns`, `noUnusedLocals`, explicit return types preferred
- **ESLint rules**: `prefer-const`, `no-var`, `@typescript-eslint/no-unused-vars` all set to `error`
- **Prettier**: single quotes, 2-space indent, trailing commas (ES5), 80-char print width
- **Jest coverage threshold**: 80% across branches, functions, lines, and statements

## Testing

Tests use `jest-dom` (jsdom environment). Chrome extension APIs (`chrome.*`) are not available in the test environment and must be mocked when writing unit tests for content/popup scripts.
