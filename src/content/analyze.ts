import { analyzeAccessibility } from './analyzers/accessibility';
import { analyzeSEO } from './analyzers/seo';
import { analyzePerformance } from './analyzers/performance';
import type { AnalysisResult, CategoryResult } from './types';
import { AnalyzerSettings, DEFAULT_SETTINGS } from '../shared/settings';

const EMPTY_CATEGORY: CategoryResult = {
  score: 100,
  issues: [],
  suggestions: [],
};

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
export function performQualityAnalysis(
  settings: AnalyzerSettings = DEFAULT_SETTINGS
): AnalysisResult {
  const accessibility = settings.accessibility.enabled
    ? analyzeAccessibility(settings.accessibility)
    : EMPTY_CATEGORY;
  const seo = settings.seo.enabled ? analyzeSEO(settings.seo) : EMPTY_CATEGORY;
  const performance = settings.performance.enabled
    ? analyzePerformance(settings.performance)
    : EMPTY_CATEGORY;

  const overallScore = Math.round(
    (accessibility.score + seo.score + performance.score) / 3
  );

  return {
    score: overallScore,
    pageInfo: {
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
    },
    categories: { accessibility, seo, performance },
  };
}
