---
name: gen-test
description: Generate Jest unit tests for a WebQualityAnalyzer source file following project conventions (listener capture, jsdom quirks, isolateModules)
---

Generate Jest tests for the file: $ARGUMENTS

Follow these project-specific conventions from CLAUDE.md:

**Existing test files to follow as reference**
The monolithic `content.test.ts` and `popup.test.ts` have been split into focused modules:
- `tests/unit/content.core.test.ts` — listener capture pattern, `performQualityAnalysis`, utils
- `tests/unit/content.accessibility.test.ts`, `content.seo.test.ts`, `content.performance.test.ts` — one analyzer per file
- `tests/unit/popup.actions.test.ts`, `popup.display.test.ts`, `popup.ui.test.ts` — popup split by concern
- `tests/helpers/popup.ts` — shared DOM setup helpers for popup tests (import these instead of duplicating)

**Module load-time side effects**
- `background.ts`: use `jest.isolateModules` + `require()` to get a fresh execution per test; capture the registered listener in `beforeAll` before any `jest.clearAllMocks()` in `beforeEach` wipes it. Suppress lint with `// eslint-disable-next-line @typescript-eslint/no-require-imports`.
- `content.ts`: capture the `chrome.runtime.onMessage` listener in `beforeAll` before `beforeEach` clears mocks.

**CSS module mock**
- `popup.ts` imports `./popup.css`. Tests rely on `moduleNameMapper` in `jest.config.ts` mapping `\\.css$` to `tests/__mocks__/style.mock.ts`. No extra setup needed, but do not import CSS files in new test files.

**DOM setup**
- Always use `document.createElement` + `appendChild` — never assign test DOM via `innerHTML` string assignment (blocked by PreToolUse hook).
- After setting `document.head.innerHTML`, always set `document.title` *afterwards* (jsdom removes the `<title>` element on innerHTML reassignment).

**jsdom quirks**
- `img.naturalWidth` / `img.naturalHeight` are always `0` — use `Object.defineProperty` with a getter to simulate large images.
- `Blob.prototype.text()` is not implemented — spy on `JSON.stringify` to inspect data passed to the Blob constructor, or read the blob with `FileReader` in an async test.
- `URL.createObjectURL` / `URL.revokeObjectURL` are not implemented — mock both on `global.URL` before testing `exportResults`.
- `element.style.background` is normalized to `rgb()` — use `element.getAttribute('style')` to assert raw hex values set via inline styles.

**"Perfect Score!" condition**
- `displayCategoryContent` shows it only when `issues.length === 0 && suggestions.length === 0`.
- Performance generic suggestions are only emitted when `score < 100`, so all three tabs can reach this state.

**Coverage target**
- After generating, run `npx jest tests/unit/<file>.test.ts --coverage` and verify all metrics are ≥ 80%.
