export const CONTENT_SCRIPT_FILE = 'content.bundle.js';
export const ANALYZER_GLOBAL = '__webQualityAnalyzer';

export interface InjectedAnalyzer {
  analyze(settings: unknown): unknown;
}
