// Content script for WebQualityAnalyzer extension
import { browser } from '../shared/browser';
import { analyzeAccessibility } from './analyzers/accessibility';
import { analyzeSEO } from './analyzers/seo';
import { analyzePerformance } from './analyzers/performance';
import type { AnalysisResult, CategoryResult } from './types';
import { AnalyzerSettings, DEFAULT_SETTINGS } from '../shared/settings';

export type { AnalysisResult, CategoryResult, Issue } from './types';

const EMPTY_CATEGORY: CategoryResult = { score: 100, issues: [], suggestions: [] };

// Listen for messages from popup
browser.runtime.onMessage.addListener((request: unknown) => {
  const msg = request as { action: string; settings?: AnalyzerSettings };
  if (msg.action === 'analyze') {
    const settings = msg.settings ?? DEFAULT_SETTINGS;
    return Promise.resolve(performQualityAnalysis(settings));
  }
  return undefined;
});

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
