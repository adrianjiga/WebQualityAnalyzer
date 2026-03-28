---
name: gen-test
description: Generate Jest unit tests for a WebQualityAnalyzer source file following project conventions (listener capture, jsdom quirks, isolateModules)
---

Generate Jest tests for the file: $ARGUMENTS

Follow these project-specific conventions from CLAUDE.md:

**Module load-time side effects**
- `background.ts`: use `jest.isolateModules` + `require()` to get a fresh execution per test; capture the registered listener in `beforeAll` before any `jest.clearAllMocks()` in `beforeEach` wipes it. Suppress lint with `// eslint-disable-next-line @typescript-eslint/no-require-imports`.
- `content.ts`: capture the `chrome.runtime.onMessage` listener in `beforeAll` before `beforeEach` clears mocks.

**DOM setup**
- Always use `document.createElement` + `appendChild` — never assign test DOM via `innerHTML` string assignment (blocked by PreToolUse hook).
- After setting `document.head.innerHTML`, always set `document.title` *afterwards* (jsdom removes the `<title>` element on innerHTML reassignment).

**jsdom quirks**
- `img.naturalWidth` / `img.naturalHeight` are always `0` — use `Object.defineProperty` with a getter to simulate large images.
- `Blob.prototype.text()` is not implemented — spy on `JSON.stringify` to inspect data passed to the Blob constructor, or read the blob with `FileReader` in an async test.
- `URL.createObjectURL` / `URL.revokeObjectURL` are not implemented — mock both on `global.URL` before testing `exportResults`.

**"Perfect Score!" condition**
- `displayCategoryContent` shows it only when `issues.length === 0 && suggestions.length === 0`.
- Performance generic suggestions are only emitted when `score < 100`, so all three tabs can reach this state.

**Coverage target**
- After generating, run `npx jest tests/unit/<file>.test.ts --coverage` and verify all metrics are ≥ 80%.
