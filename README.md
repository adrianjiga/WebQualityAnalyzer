# Web Quality Analyzer

Audits web pages for accessibility, SEO, and performance issues and gives an instant quality score.

> **Architecture** — this repository is one of six that behave as a single system.
> The [cross-repo architecture notes](https://adrianjiga.github.io/qa/architecture)
> cover the `data-cy` contract, the coordinated-deploy problem, and the known gaps.

Ships in two forms from one codebase:

- **A Chrome and Firefox Manifest V3 browser extension** — point it at a page, get a scored report in a popup.
- **An injectable library** (`dist/lib/wqa.js`) — the same analyzers, callable from a test runner, a CI script, or a browser console. See [Use as a library](#use-as-a-library).

The analyzers are pure DOM logic with no extension coupling, which is what makes the second form possible.

[![CI](https://github.com/adrianjiga/WebQualityAnalyzer/actions/workflows/ci.yml/badge.svg)](https://github.com/adrianjiga/WebQualityAnalyzer/actions/workflows/ci.yml)
[![Tests](https://github.com/adrianjiga/WebQualityAnalyzer/actions/workflows/tests.yml/badge.svg)](https://github.com/adrianjiga/WebQualityAnalyzer/actions/workflows/tests.yml)

## Features

- **Accessibility** — detects missing alt text, unlabelled form inputs, and broken heading hierarchy
- **SEO** — checks page title length, meta description, H1 presence, canonical URL, and Open Graph tags
- **Performance** — flags oversized images, missing lazy-loading, excessive external resources, and inline styles
- **Overall score** — 0–100 weighted average across all three categories
- **Expandable issue panels** — each issue expands to show the CSS selector and HTML snippet of the offending element
- **Perfect Score** — each category shows a "Perfect Score!" banner when it passes all checks with no suggestions
- **Settings tab** — configure each analyzer: toggle on/off and adjust all scoring thresholds; settings persist via `browser.storage.local`
- **Export** — download the full analysis as a JSON file

## Development setup

**Prerequisites:** Node.js 20 LTS or later, npm

```bash
npm install           # install dependencies
npm run build         # all three bundles: Chrome, Firefox, and the library
npm run build:chrome  # Chrome extension only     → dist/chrome/
npm run build:firefox # Firefox extension only    → dist/firefox/
npm run build:lib     # injectable library only   → dist/lib/ (bundle + .d.ts)
npm run dev           # watch mode (Chrome)
npm run dev:firefox   # watch mode (Firefox)
npm run lint          # ESLint
npm test              # Jest test suite (with coverage)
```

> **After changing anything under `src/content/analyzers/`, `src/content/analyze.ts`, `src/content/utils.ts`, `src/shared/settings.ts`, or `src/index.ts`, run `npm run build:lib` and commit the result.** `dist/lib/` is committed (see [Use as a library](#use-as-a-library)) and CI fails if it is stale.

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

## Use as a library

The analyzers touch nothing but `document` and `window.location` — no `browser.*`, no `chrome.*`, no extension lifecycle. The extension is one consumer of them, not their owner, so anything with a live page can run the same audit.

`npm run build:lib` produces two things in `dist/lib/`:

- `wqa.js` — a self-contained IIFE that assigns `globalThis.WebQualityAnalyzer`
- `*.d.ts` — type declarations, so a TypeScript consumer can type the result without depending on the bundle at runtime

### Install

```bash
npm i -D github:adrianjiga/WebQualityAnalyzer
```

The bundle is **committed to the repository**, so a git dependency works with no build step on install.

### Playwright

```js
await page.addScriptTag({ path: require.resolve('webqualityanalyzer/wqa.js') });

const result = await page.evaluate(() => WebQualityAnalyzer.analyzePage());
expect(result.categories.accessibility.issues).toEqual([]);
```

### Cypress

```js
cy.readFile('node_modules/webqualityanalyzer/dist/lib/wqa.js').then((src) => {
  cy.window().then((win) => {
    win.eval(src);
    const result = win.WebQualityAnalyzer.analyzePage();
    expect(result.categories.accessibility.issues).to.be.empty;
  });
});
```

### API

| Export | Description |
|---|---|
| `analyzePage(overrides?)` | Runs the enabled analyzers against the current page, returns an `AnalysisResult`. |
| `collectIssues(result)` | Flattens issues across all categories, tagging each with the category it came from. |
| `performQualityAnalysis(settings)` | Lower level — takes a complete `AnalyzerSettings` rather than a partial override. |
| `analyzeAccessibility` / `analyzeSEO` / `analyzePerformance` | Individual analyzers, each returning a `CategoryResult`. |
| `getCssSelector(el)` / `getHtmlSnippet(el)` | DOM helpers used to locate offending elements. |
| `DEFAULT_SETTINGS` | Every default threshold. |

Every scoring threshold is data, not a constant, so a caller can tighten or relax the rules without forking the analyzers. Overrides merge **per category** over `DEFAULT_SETTINGS`:

```js
// accessibility only — SEO and performance report a score of 100 and no issues
const a11y = WebQualityAnalyzer.analyzePage({
  seo: { enabled: false },
  performance: { enabled: false },
});

// stricter alt-text penalty; every other accessibility threshold keeps its default
const strict = WebQualityAnalyzer.analyzePage({
  accessibility: { missingAltDeduction: 20 },
});
```

A **disabled category scores 100, not 0** — "nothing found wrong", not "perfect". Averaging a 0 for a category the caller switched off would misreport the page.

### Why the bundle is committed

Consumers depend on this repo as a git dependency, which has no publish step and no build-on-install, so the artifact has to be present in the tree.

A build output in git goes stale the moment someone edits an analyzer and forgets to rebuild — and it fails *silently*, because consumers keep asserting against the old logic. CI therefore rebuilds on every push and fails if anything in `dist/lib/` differs from the commit, including a newly emitted file that was never added.

The bundle is deliberately **not minified**. It is injected into a local page rather than fetched over a network, so bytes are the wrong thing to optimise; a minified bundle is a single line with no newlines, which makes every diff unreviewable and defeats git's delta compression. Readable output also keeps real function names in stack traces.

## Running tests

```bash
npm test                                   # run all tests
npm run test:watch                         # watch mode
npx jest tests/unit/content.core.test.ts  # single file
```

Coverage thresholds (all enforced): **80% statements, branches, functions, and lines**.
Baseline as of 2026-08: 95.83% stmts / 89.24% branches / 83.78% funcs / 96.14% lines.
The threshold is the contract — the baseline is a dated snapshot and will drift; `jest.config.ts` is the source of truth.

## Architecture

Four Webpack bundles from one source tree — three extension contexts plus the library:

| Source | Bundle | Role |
|--------|--------|------|
| `src/background/background.ts` | `background.bundle.js` | Extension lifecycle events |
| `src/content/content.ts` | `content.bundle.js` | Registers the message listener, delegates to `analyze.ts` |
| `src/popup/popup.ts` | `popup.bundle.js` | Popup UI — sends messages to content script, renders results |
| `src/index.ts` | `dist/lib/wqa.js` | Library entry — the same analyzers, no extension dependency |
| `src/shared/browser.ts` | (imported by extension bundles) | Re-exports `webextension-polyfill` for unified `browser.*` API |

**Communication flow:** Popup → `browser.tabs.sendMessage` → Content Script → `AnalysisResult` → Popup renders

`src/content/` is split into focused modules: `analyze.ts` (`performQualityAnalysis`), `types.ts` (interfaces), `utils.ts` (`getCssSelector`, `getHtmlSnippet`), and `analyzers/` (one file per category). `src/popup/` is split into `popup.ts`, `popup.css`, `utils.ts`, and `settings.ts` (storage load/save/reset). `src/shared/` holds `browser.ts` and `settings.ts` (shared types and defaults used by both popup and content bundles).

**`analyze.ts` is separate from `content.ts` on purpose.** `content.ts` registers a `browser.runtime.onMessage` listener at module scope, so importing it drags in `webextension-polyfill` and fires that side effect. Keeping the analysis in its own module is what lets `src/index.ts` expose it to callers that have a DOM but no extension. `content.ts` re-exports `performQualityAnalysis`, so existing importers are unaffected.

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
| CI | push (all branches), PR → main | lint, build, verify the committed library bundle is current |
| Tests | push (all branches), PR → main | Jest with coverage |

The bundle check rebuilds `dist/lib/` and fails if anything differs from the commit — modified files *or* a newly emitted file that was never added — so a committed artifact can never silently drift from the source it was built from.

All GitHub Actions are pinned to commit SHAs. Dependabot keeps them up to date weekly.
