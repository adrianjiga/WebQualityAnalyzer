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
  document.body.replaceChildren();

  const analyzeBtn = document.createElement('button');
  analyzeBtn.id = 'analyze-btn';
  analyzeBtn.textContent = 'Analyze Page';

  const exportBtn = document.createElement('button');
  exportBtn.id = 'export-btn';
  exportBtn.disabled = true;
  exportBtn.textContent = 'Export';

  const pageUrl = document.createElement('div');
  pageUrl.id = 'page-url';

  const pageInfo = document.createElement('div');
  pageInfo.id = 'page-info';
  pageInfo.style.display = 'none';
  pageInfo.appendChild(pageUrl);

  const tabs = [
    { name: 'Overview', tab: 'overview', active: true },
    { name: 'A11y', tab: 'accessibility', active: false },
    { name: 'SEO', tab: 'seo', active: false },
    { name: 'Perf', tab: 'performance', active: false },
    { name: 'Settings', tab: 'settings', active: false },
  ];

  const tabButtons = tabs.map(({ name, tab, active }) => {
    const btn = document.createElement('div');
    btn.className = active ? 'tab active' : 'tab';
    btn.dataset.tab = tab;
    btn.textContent = name;
    return btn;
  });

  const tabPanels = tabs.map(({ tab, active }) => {
    const panel = document.createElement('div');
    panel.id = `${tab}-tab`;
    panel.className = active ? 'tab-content active' : 'tab-content';
    return panel;
  });

  document.body.appendChild(analyzeBtn);
  document.body.appendChild(exportBtn);
  document.body.appendChild(pageInfo);
  tabButtons.forEach(btn => document.body.appendChild(btn));
  tabPanels.forEach(panel => document.body.appendChild(panel));
}
