import * as analyzer from 'webqualityanalyzer';

for (const name of [
  'analyzePage',
  'performQualityAnalysis',
  'analyzeAccessibility',
  'analyzeSEO',
  'analyzePerformance',
  'collectIssues',
  'DEFAULT_SETTINGS',
]) {
  if (!(name in analyzer)) {
    throw new Error(`Package runtime is missing export: ${name}`);
  }
}
