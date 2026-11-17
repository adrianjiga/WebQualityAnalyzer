// Content script for WebQualityAnalyzer extension
import { performQualityAnalysis } from './analyze';
import { AnalyzerSettings, DEFAULT_SETTINGS } from '../shared/settings';
import { ANALYZER_GLOBAL, InjectedAnalyzer } from '../shared/injection';
import type { AnalysisResult } from './types';

export type { AnalysisResult, CategoryResult, Issue } from './types';
export { performQualityAnalysis } from './analyze';

export function analyzeWithSettings(settings: unknown): AnalysisResult {
  return performQualityAnalysis(
    isAnalyzerSettings(settings) ? settings : DEFAULT_SETTINGS
  );
}

const analyzer: InjectedAnalyzer = { analyze: analyzeWithSettings };
(globalThis as Record<string, unknown>)[ANALYZER_GLOBAL] = analyzer;

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
