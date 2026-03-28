// Content script for WebQualityAnalyzer extension
import { browser } from '../shared/browser';
import { analyzeAccessibility } from './analyzers/accessibility';
import { analyzeSEO } from './analyzers/seo';
import { analyzePerformance } from './analyzers/performance';
import type { AnalysisResult } from './types';

export type { AnalysisResult, CategoryResult, Issue } from './types';
export { getCssSelector, getHtmlSnippet } from './utils';
export { analyzeAccessibility } from './analyzers/accessibility';
export { analyzeSEO } from './analyzers/seo';
export { analyzePerformance } from './analyzers/performance';

// Listen for messages from popup
browser.runtime.onMessage.addListener((request: unknown) => {
  if ((request as { action: string }).action === 'analyze') {
    return Promise.resolve(performQualityAnalysis());
  }
  return undefined;
});

export function performQualityAnalysis(): AnalysisResult {
  const accessibility = analyzeAccessibility();
  const seo = analyzeSEO();
  const performance = analyzePerformance();

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
