/**
 * Library entry point.
 *
 * The browser extension is one consumer of these analyzers, not their owner. Everything below
 * is pure DOM logic — no `browser.*`, no `chrome.*`, no extension lifecycle — so anything with
 * a live page can run it: a Playwright or Cypress spec, a headless-browser CI script, a
 * scratch console session.
 *
 * Bundled by `npm run build:lib` into `dist/lib/wqa.js` as a self-contained IIFE that assigns
 * `globalThis.WebQualityAnalyzer`. A test runner injects that file into a page and calls
 * `WebQualityAnalyzer.analyzePage()`.
 */

export { performQualityAnalysis } from './content/analyze';
export { analyzeAccessibility } from './content/analyzers/accessibility';
export { analyzeSEO } from './content/analyzers/seo';
export { analyzePerformance } from './content/analyzers/performance';
export { getCssSelector, getHtmlSnippet } from './content/utils';

export type { AnalysisResult, CategoryResult, Issue } from './content/types';
export type {
  AnalyzerSettings,
  AccessibilitySettings,
  SeoSettings,
  PerformanceSettings,
} from './shared/settings';
export { DEFAULT_SETTINGS } from './shared/settings';

import { performQualityAnalysis } from './content/analyze';
import type { AnalysisResult } from './content/types';
import {
  AnalyzerSettings,
  DEFAULT_SETTINGS,
} from './shared/settings';

/** A partial settings override, merged over {@link DEFAULT_SETTINGS} one level deep. */
export type SettingsOverride = {
  [K in keyof AnalyzerSettings]?: Partial<AnalyzerSettings[K]>;
};

/**
 * Analyses the current page.
 *
 * The thresholds every check scores against are data, not constants, so a caller can tighten
 * or relax them without forking the analyzers. Overrides are merged per category over
 * {@link DEFAULT_SETTINGS}, so `{ seo: { enabled: false } }` disables SEO while leaving every
 * accessibility and performance threshold untouched.
 *
 * @example
 * // everything, default thresholds
 * const result = analyzePage();
 *
 * @example
 * // accessibility only
 * const a11y = analyzePage({
 *   seo: { enabled: false },
 *   performance: { enabled: false },
 * });
 */
export function analyzePage(overrides: SettingsOverride = {}): AnalysisResult {
  const settings: AnalyzerSettings = {
    accessibility: {
      ...DEFAULT_SETTINGS.accessibility,
      ...overrides.accessibility,
    },
    seo: { ...DEFAULT_SETTINGS.seo, ...overrides.seo },
    performance: { ...DEFAULT_SETTINGS.performance, ...overrides.performance },
  };
  return performQualityAnalysis(settings);
}

/**
 * Every issue found, flattened across categories and tagged with the category it came from.
 *
 * Assertions usually care about "which problems exist on this page", not the per-category
 * split — this saves every caller writing the same `Object.entries(...).flatMap(...)`.
 */
export function collectIssues(
  result: AnalysisResult
): Array<AnalysisResult['categories'][keyof AnalysisResult['categories']]['issues'][number] & {
  category: keyof AnalysisResult['categories'];
}> {
  return (
    Object.keys(result.categories) as Array<keyof AnalysisResult['categories']>
  ).flatMap((category) =>
    result.categories[category].issues.map((issue) => ({ ...issue, category }))
  );
}
