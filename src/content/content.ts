// Content script for WebQualityAnalyzer extension
import { browser } from '../shared/browser';
import { performQualityAnalysis } from './analyze';
import { AnalyzerSettings, DEFAULT_SETTINGS } from '../shared/settings';

export type { AnalysisResult, CategoryResult, Issue } from './types';
export { performQualityAnalysis } from './analyze';

// Listen for messages from popup
browser.runtime.onMessage.addListener((request: unknown) => {
  const msg = request as { action: string; settings?: AnalyzerSettings };
  if (msg.action === 'analyze') {
    const settings = msg.settings ?? DEFAULT_SETTINGS;
    return Promise.resolve(performQualityAnalysis(settings));
  }
  return undefined;
});
