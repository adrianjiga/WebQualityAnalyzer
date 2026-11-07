// Content script for WebQualityAnalyzer extension
import { browser } from '../shared/browser';
import { performQualityAnalysis } from './analyze';
import { AnalyzerSettings, DEFAULT_SETTINGS } from '../shared/settings';

export type { AnalysisResult, CategoryResult, Issue } from './types';
export { performQualityAnalysis } from './analyze';

// Listen for messages from popup
browser.runtime.onMessage.addListener((request: unknown) => {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    return undefined;
  }

  const msg = request as Record<string, unknown>;
  if (msg.action === 'analyze') {
    const settings = isAnalyzerSettings(msg.settings)
      ? msg.settings
      : DEFAULT_SETTINGS;
    return Promise.resolve(performQualityAnalysis(settings));
  }
  return undefined;
});

function isAnalyzerSettings(value: unknown): value is AnalyzerSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const settings = value as Record<string, unknown>;

  return (
    isSettingsCategory(settings.accessibility, DEFAULT_SETTINGS.accessibility) &&
    isSettingsCategory(settings.seo, DEFAULT_SETTINGS.seo) &&
    isSettingsCategory(settings.performance, DEFAULT_SETTINGS.performance)
  );
}

function isSettingsCategory<T extends object>(value: unknown, defaults: T): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const category = value as Record<string, unknown>;

  return Object.keys(defaults).every((key) => {
    const defaultValue = (defaults as Record<string, unknown>)[key];
    const setting = category[key];
    return typeof defaultValue === 'boolean'
      ? typeof setting === 'boolean'
      : typeof setting === 'number' && Number.isFinite(setting);
  });
}
