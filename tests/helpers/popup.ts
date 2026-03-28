import type { AnalysisResult, CategoryResult, Issue } from '../../src/content/content';

export function buildCategory(
  score: number,
  issues: Issue[] = [],
  suggestions: string[] = []
): CategoryResult {
  return { score, issues, suggestions };
}

export function buildResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    score: 85,
    pageInfo: {
      url: 'https://example.com',
      title: 'Example Page',
      timestamp: new Date().toISOString(),
    },
    categories: {
      accessibility: buildCategory(90, [], ['Check focus styles']),
      seo: buildCategory(80, [
        { type: 'Page Title', message: 'Title too short', severity: 'medium' },
      ]),
      performance: buildCategory(85, [], ['Use a CDN']),
    },
    ...overrides,
  };
}

export function setupPopupDOM(): void {
  document.body.innerHTML =
    '<button id="analyze-btn">Analyze Page</button>' +
    '<button id="export-btn" disabled>Export</button>' +
    '<div id="page-info" style="display:none"><div id="page-url"></div></div>' +
    '<div class="tab active" data-tab="overview">Overview</div>' +
    '<div class="tab" data-tab="accessibility">A11y</div>' +
    '<div class="tab" data-tab="seo">SEO</div>' +
    '<div class="tab" data-tab="performance">Perf</div>' +
    '<div class="tab" data-tab="settings">Settings</div>' +
    '<div id="overview-tab" class="tab-content active"></div>' +
    '<div id="accessibility-tab" class="tab-content"></div>' +
    '<div id="seo-tab" class="tab-content"></div>' +
    '<div id="performance-tab" class="tab-content"></div>' +
    '<div id="settings-tab" class="tab-content"></div>';
}
