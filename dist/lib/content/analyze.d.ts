import type { AnalysisResult } from './types';
import { AnalyzerSettings } from '../shared/settings';
/**
 * Runs every enabled analyzer against the current `document` and folds the three category
 * results into one overall score.
 *
 * This lives apart from `content.ts` deliberately. `content.ts` registers a
 * `browser.runtime.onMessage` listener at module scope, so importing it outside the extension
 * drags in `webextension-polyfill` and fires that side effect. The analysis itself needs
 * nothing but a DOM — keeping it in its own module is what lets the library entry
 * (`src/index.ts`) expose it to any caller with a page: a test runner, a CI script, a
 * headless browser.
 *
 * A disabled category scores 100 rather than 0 — it is "nothing found wrong", not "perfect",
 * and averaging a 0 for a category the caller switched off would misreport the page.
 */
export declare function performQualityAnalysis(settings?: AnalyzerSettings): AnalysisResult;
