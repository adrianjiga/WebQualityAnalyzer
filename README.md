# Web Quality Analyzer

A Chrome and Firefox Manifest V3 browser extension that audits web pages for accessibility, SEO, and performance issues and gives an instant quality score.

[![CI](https://github.com/adrianjiga/WebQualityAnalyzer/actions/workflows/ci.yml/badge.svg)](https://github.com/adrianjiga/WebQualityAnalyzer/actions/workflows/ci.yml)
[![Tests](https://github.com/adrianjiga/WebQualityAnalyzer/actions/workflows/tests.yml/badge.svg)](https://github.com/adrianjiga/WebQualityAnalyzer/actions/workflows/tests.yml)

## Features

- **Accessibility** — detects missing alt text, unlabelled form inputs, and broken heading hierarchy
- **SEO** — checks page title length, meta description, H1 presence, canonical URL, and Open Graph tags
- **Performance** — flags oversized images, missing lazy-loading, excessive external resources, and inline styles
- **Overall score** — 0–100 weighted average across all three categories
- **Expandable issue panels** — each issue expands to show the CSS selector and HTML snippet of the offending element
- **Perfect Score** — each category shows a "Perfect Score!" banner when it passes all checks with no suggestions
- **Settings tab** — placeholder for future configuration options
- **Export** — download the full analysis as a JSON file

## Development setup

**Prerequisites:** Node.js 20 LTS or later, npm

```bash
npm install          # install dependencies
npm run build        # compile + bundle for both Chrome and Firefox → dist/chrome/ and dist/firefox/
npm run build:chrome # build Chrome only
npm run build:firefox # build Firefox only
npm run dev          # watch mode (Chrome)
npm run dev:firefox  # watch mode (Firefox)
npm run lint         # ESLint
npm test             # Jest test suite (with coverage)
```

## Loading the extension

### Chrome

1. Run `npm run build:chrome`
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select `dist/chrome/`

### Firefox

1. Run `npm run build:firefox`
2. Open `about:debugging` → **This Firefox**
3. Click **Load Temporary Add-on...**
4. Select `dist/firefox/manifest.json`

## Running tests

```bash
npm test                                   # run all tests
npm run test:watch                         # watch mode
npx jest tests/unit/content.core.test.ts  # single file
```

Coverage thresholds (all enforced): **80% statements, branches, functions, and lines**.
Current baseline: 95.72% stmts / 89.43% branches / 87.80% funcs / 95.62% lines.

## Architecture

The extension has three isolated execution contexts, each compiled to a separate Webpack bundle, plus a shared browser API abstraction:

| Source | Bundle | Role |
|--------|--------|------|
| `src/background/background.ts` | `background.bundle.js` | Extension lifecycle events |
| `src/content/content.ts` | `content.bundle.js` | Orchestrates analysis, registers message listener |
| `src/popup/popup.ts` | `popup.bundle.js` | Popup UI — sends messages to content script, renders results |
| `src/shared/browser.ts` | (imported by all) | Re-exports `webextension-polyfill` for unified `browser.*` API |

**Communication flow:** Popup → `browser.tabs.sendMessage` → Content Script → `AnalysisResult` → Popup renders

`src/content/` is split into focused modules: `types.ts` (interfaces), `utils.ts` (`getCssSelector`, `getHtmlSnippet`), and `analyzers/` (one file per category). `src/popup/` is split into `popup.ts`, `popup.css`, and `utils.ts`.

Shared types (`AnalysisResult`, `CategoryResult`, `Issue`) are defined in `src/content/types.ts`, re-exported from `content.ts`, and consumed via `import type` in `popup.ts` — erased before bundling, zero runtime overhead.

### Browser manifests

| File | Target | Notes |
|------|--------|-------|
| `src/manifest.chrome.json` | Chrome | MV3, `background.service_worker` |
| `src/manifest.firefox.json` | Firefox | MV3, `background.scripts`, `browser_specific_settings.gecko` (min Firefox 109) |

Webpack selects the correct manifest via `--env browser=chrome|firefox` and writes the build to `dist/chrome/` or `dist/firefox/`.

## CI

| Workflow | Triggers | Steps |
|----------|----------|-------|
| CI | push (all branches), PR → main | lint, build |
| Tests | push (all branches), PR → main | Jest with coverage |

All GitHub Actions are pinned to commit SHAs. Dependabot keeps them up to date weekly.
