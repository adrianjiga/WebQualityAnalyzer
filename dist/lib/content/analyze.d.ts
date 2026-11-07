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
 * Disabled categories are reported with a score of 100 but are excluded from the overall
 * average. If every category is disabled, the overall score is 100 because no checks ran.
 */
export declare function performQualityAnalysis(settings?: AnalyzerSettings): AnalysisResult;
