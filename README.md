# WebQualityAnalyzer

A Chrome Manifest V3 browser extension that audits web pages for accessibility, SEO, and performance issues and gives an instant quality score.

[![CI](https://github.com/adrianjiga/WebQualityAnalyzer/actions/workflows/ci.yml/badge.svg)](https://github.com/adrianjiga/WebQualityAnalyzer/actions/workflows/ci.yml)
[![Tests](https://github.com/adrianjiga/WebQualityAnalyzer/actions/workflows/tests.yml/badge.svg)](https://github.com/adrianjiga/WebQualityAnalyzer/actions/workflows/tests.yml)

## Features

- **Accessibility** — detects missing alt text, unlabelled form inputs, and broken heading hierarchy
- **SEO** — checks page title length, meta description, H1 presence, canonical URL, and Open Graph tags
- **Performance** — flags oversized images, missing lazy-loading, excessive external resources, and inline styles
- **Overall score** — 0–100 weighted average across all three categories
- **Export** — download the full analysis as a JSON file

## Development setup

**Prerequisites:** Node.js 20 LTS or later, npm

```bash
npm install       # install dependencies
npm run build     # compile TypeScript + bundle via Webpack → dist/
npm run dev       # watch mode — rebuilds on file changes
npm run lint      # ESLint
npm test          # Jest test suite (with coverage)
```

## Loading the extension in Chrome

1. Run `npm run build` to populate `dist/`
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the `dist/` directory

## Running tests

```bash
npm test                              # run all tests
npm run test:watch                    # watch mode
npx jest tests/unit/content.test.ts  # single file
```

Coverage thresholds (all enforced): **80% statements, branches, functions, and lines**.  
Current baseline: 94.69% stmts / 90.81% branches / 86.48% funcs / 94.58% lines.

## Architecture

The extension has three isolated execution contexts, each compiled to a separate Webpack bundle:

| Script | Bundle | Role |
|--------|--------|------|
| `src/background/background.ts` | `background.bundle.js` | Service worker — extension lifecycle |
| `src/content/content.ts` | `content.bundle.js` | Runs analysis directly on the page DOM |
| `src/popup/popup.ts` | `popup.bundle.js` | Popup UI — sends messages to content script, renders results |

**Communication flow:** Popup → Chrome message API → Content Script → `AnalysisResult` → Popup renders

## CI

| Workflow | Triggers | Steps |
|----------|----------|-------|
| CI | push (all branches), PR → main | lint, build |
| Tests | push (all branches), PR → main | Jest with coverage |

All GitHub Actions are pinned to commit SHAs. Dependabot keeps them up to date weekly.
