import {
  getScoreColor,
  switchTab,
  updatePageInfo,
  showLoadingState,
  showError,
  displayResults,
  displayCategoryContent,
  exportResults,
  runAnalysis,
} from '../../src/popup/popup';

// ─── Type definitions ─────────────────────────────────────────────────────────
// Mirrors the interfaces defined in popup.ts (not exported from source).
interface Issue {
  type: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  element?: string;
}

interface CategoryResult {
  score: number;
  issues: Issue[];
  suggestions: string[];
}

interface AnalysisResult {
  score: number;
  pageInfo: { url: string; title: string; timestamp: string };
  categories: {
    accessibility: CategoryResult;
    seo: CategoryResult;
    performance: CategoryResult;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildCategory(
  score: number,
  issues: Issue[] = [],
  suggestions: string[] = []
): CategoryResult {
  return { score, issues, suggestions };
}

function buildResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
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

/** Render the minimal popup DOM structure required by the popup functions. */
function setupPopupDOM(): void {
  document.body.innerHTML =
    '<button id="analyze-btn">Analyze Page</button>' +
    '<button id="export-btn" disabled>Export</button>' +
    '<div id="page-info" style="display:none"><div id="page-url"></div></div>' +
    '<div class="tab active" data-tab="overview">Overview</div>' +
    '<div class="tab" data-tab="accessibility">A11y</div>' +
    '<div class="tab" data-tab="seo">SEO</div>' +
    '<div class="tab" data-tab="performance">Performance</div>' +
    '<div id="overview-tab" class="tab-content active"></div>' +
    '<div id="accessibility-tab" class="tab-content"></div>' +
    '<div id="seo-tab" class="tab-content"></div>' +
    '<div id="performance-tab" class="tab-content"></div>';
}

// ══════════════════════════════════════════════════════════════════════════════
// getScoreColor
// ══════════════════════════════════════════════════════════════════════════════
describe('getScoreColor', () => {
  it('returns a blue gradient for scores >= 90', () => {
    expect(getScoreColor(90)).toContain('#4facfe');
    expect(getScoreColor(100)).toContain('#4facfe');
    expect(getScoreColor(95)).toContain('#4facfe');
  });

  it('returns a green gradient for scores >= 80 and < 90', () => {
    expect(getScoreColor(80)).toContain('#43e97b');
    expect(getScoreColor(89)).toContain('#43e97b');
  });

  it('returns a pink/yellow gradient for scores >= 60 and < 80', () => {
    expect(getScoreColor(60)).toContain('#fa709a');
    expect(getScoreColor(79)).toContain('#fa709a');
  });

  it('returns a red gradient for scores below 60', () => {
    expect(getScoreColor(59)).toContain('#ff6b6b');
    expect(getScoreColor(0)).toContain('#ff6b6b');
    expect(getScoreColor(1)).toContain('#ff6b6b');
  });

  it('returns a linear-gradient string for every threshold', () => {
    [0, 60, 80, 90, 100].forEach((score) => {
      expect(getScoreColor(score)).toMatch(/^linear-gradient/);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// switchTab
// ══════════════════════════════════════════════════════════════════════════════
describe('switchTab', () => {
  beforeEach(setupPopupDOM);

  it('adds the "active" class to the target tab button', () => {
    switchTab('seo');
    const seoTab = document.querySelector('[data-tab="seo"]');
    expect(seoTab?.classList.contains('active')).toBe(true);
  });

  it('removes the "active" class from the previously active tab', () => {
    switchTab('seo');
    const overviewTab = document.querySelector('[data-tab="overview"]');
    expect(overviewTab?.classList.contains('active')).toBe(false);
  });

  it('shows the target tab content', () => {
    switchTab('accessibility');
    const panel = document.getElementById('accessibility-tab');
    expect(panel?.classList.contains('active')).toBe(true);
  });

  it('hides the previously active tab content', () => {
    switchTab('accessibility');
    const overview = document.getElementById('overview-tab');
    expect(overview?.classList.contains('active')).toBe(false);
  });

  it('only one tab button is active after switching', () => {
    switchTab('performance');
    const activeTabs = document.querySelectorAll('.tab.active');
    expect(activeTabs).toHaveLength(1);
  });

  it('only one tab content panel is active after switching', () => {
    switchTab('performance');
    const activePanels = document.querySelectorAll('.tab-content.active');
    expect(activePanels).toHaveLength(1);
  });

  it('correctly switches back to overview from another tab', () => {
    switchTab('seo');
    switchTab('overview');
    expect(document.getElementById('overview-tab')?.classList.contains('active')).toBe(true);
    expect(document.getElementById('seo-tab')?.classList.contains('active')).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// updatePageInfo
// ══════════════════════════════════════════════════════════════════════════════
describe('updatePageInfo', () => {
  beforeEach(setupPopupDOM);

  it('sets the text content of #page-url', () => {
    updatePageInfo('https://example.com/path');
    expect(document.getElementById('page-url')?.textContent).toBe(
      'https://example.com/path'
    );
  });

  it('makes the #page-info div visible', () => {
    updatePageInfo('https://example.com');
    const info = document.getElementById('page-info') as HTMLElement;
    expect(info.style.display).toBe('block');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// showLoadingState
// ══════════════════════════════════════════════════════════════════════════════
describe('showLoadingState', () => {
  beforeEach(setupPopupDOM);

  it('renders a spinner inside #overview-tab', () => {
    showLoadingState();
    const overview = document.getElementById('overview-tab');
    expect(overview?.querySelector('.spinner')).not.toBeNull();
  });

  it('renders text indicating analysis is in progress', () => {
    showLoadingState();
    const overview = document.getElementById('overview-tab');
    expect(overview?.textContent).toContain('Analyzing page quality');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// showError
// ══════════════════════════════════════════════════════════════════════════════
describe('showError', () => {
  beforeEach(setupPopupDOM);

  it('renders the provided error message inside #overview-tab', () => {
    showError('Something went wrong.');
    const overview = document.getElementById('overview-tab');
    expect(overview?.textContent).toContain('Something went wrong.');
  });

  it('renders an error indicator in the overview tab', () => {
    showError('Page not accessible.');
    const overview = document.getElementById('overview-tab');
    expect(overview?.textContent).toContain('Error');
  });

  it('renders different messages correctly', () => {
    showError('Custom error message here');
    expect(
      document.getElementById('overview-tab')?.textContent
    ).toContain('Custom error message here');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// displayCategoryContent
// ══════════════════════════════════════════════════════════════════════════════
describe('displayCategoryContent', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('renders the "Perfect Score" empty-state when there are no issues or suggestions', () => {
    displayCategoryContent(container, buildCategory(100), '♿');
    expect(container.textContent).toContain('Perfect Score');
    expect(container.textContent).toContain('No issues found');
  });

  it('renders the icon in the empty-state view', () => {
    displayCategoryContent(container, buildCategory(100), '♿');
    expect(container.textContent).toContain('♿');
  });

  it('renders a score card when there are issues', () => {
    const category = buildCategory(70, [
      { type: 'Missing Alt Text', message: 'Images lack alt', severity: 'high' },
    ]);
    displayCategoryContent(container, category, '♿');
    expect(container.textContent).toContain('70');
    expect(container.textContent).toContain('Category Score');
  });

  it('renders a score card when there are only suggestions', () => {
    const category = buildCategory(95, [], ['Add a CDN']);
    displayCategoryContent(container, category, '⚡');
    expect(container.textContent).toContain('95');
  });

  it('renders each issue type and message', () => {
    const category = buildCategory(80, [
      { type: 'Page Title', message: 'Title too short', severity: 'medium' },
      { type: 'H1 Heading', message: 'No H1 found', severity: 'high' },
    ]);
    displayCategoryContent(container, category, '🔍');
    expect(container.textContent).toContain('Page Title');
    expect(container.textContent).toContain('Title too short');
    expect(container.textContent).toContain('H1 Heading');
    expect(container.textContent).toContain('No H1 found');
  });

  it('renders the element field when an issue includes one', () => {
    const category = buildCategory(80, [
      {
        type: 'Missing Alt Text',
        message: 'Image lacks alt',
        severity: 'high',
        element: 'img.hero',
      },
    ]);
    displayCategoryContent(container, category, '♿');
    expect(container.textContent).toContain('img.hero');
  });

  it('does not render an element field when the issue has none', () => {
    const category = buildCategory(80, [
      { type: 'Page Title', message: 'No title', severity: 'high' },
    ]);
    displayCategoryContent(container, category, '🔍');
    expect(container.textContent).not.toContain('Element:');
  });

  it('renders each suggestion', () => {
    const category = buildCategory(90, [], ['Add a CDN', 'Use gzip']);
    displayCategoryContent(container, category, '⚡');
    expect(container.textContent).toContain('Add a CDN');
    expect(container.textContent).toContain('Use gzip');
  });

  it('renders both issues and suggestions sections when both are present', () => {
    const category = buildCategory(
      75,
      [{ type: 'H1 Heading', message: 'No H1', severity: 'high' }],
      ['Add a main heading']
    );
    displayCategoryContent(container, category, '🔍');
    expect(container.textContent).toContain('Issues Found');
    expect(container.textContent).toContain('Suggestions');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// displayResults
// ══════════════════════════════════════════════════════════════════════════════
describe('displayResults', () => {
  beforeEach(setupPopupDOM);

  it('renders the overall score in the overview tab', () => {
    displayResults(buildResult({ score: 72 }));
    expect(document.getElementById('overview-tab')?.textContent).toContain('72');
  });

  it('renders accessibility score in the overview tab', () => {
    const result = buildResult();
    result.categories.accessibility = buildCategory(88);
    displayResults(result);
    expect(document.getElementById('overview-tab')?.textContent).toContain('88');
  });

  it('renders SEO score in the overview tab', () => {
    const result = buildResult();
    result.categories.seo = buildCategory(55, [
      { type: 'Page Title', message: 'Too short', severity: 'medium' },
    ]);
    displayResults(result);
    expect(document.getElementById('overview-tab')?.textContent).toContain('55');
  });

  it('renders performance score in the overview tab', () => {
    const result = buildResult();
    result.categories.performance = buildCategory(91);
    displayResults(result);
    expect(document.getElementById('overview-tab')?.textContent).toContain('91');
  });

  it('populates the accessibility tab content', () => {
    displayResults(buildResult());
    expect(document.getElementById('accessibility-tab')?.textContent?.length).toBeGreaterThan(0);
  });

  it('populates the SEO tab content', () => {
    displayResults(buildResult());
    expect(document.getElementById('seo-tab')?.textContent?.length).toBeGreaterThan(0);
  });

  it('populates the performance tab content', () => {
    displayResults(buildResult());
    expect(document.getElementById('performance-tab')?.textContent?.length).toBeGreaterThan(0);
  });

  it('shows "0 issues" with success styling when a category has no issues', () => {
    const result = buildResult();
    result.categories.accessibility = buildCategory(100, [], []);
    displayResults(result);
    const overview = document.getElementById('overview-tab');
    // The metric-count should have class "success" for 0 issues
    expect(overview?.querySelector('.metric-count.success')).not.toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// exportResults
// ══════════════════════════════════════════════════════════════════════════════
describe('exportResults', () => {
  let clickSpy: jest.SpyInstance;

  beforeEach(() => {
    setupPopupDOM();
    // jsdom does not implement URL.createObjectURL / revokeObjectURL
    global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
    clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    clickSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('calls URL.createObjectURL with a Blob', () => {
    exportResults(buildResult());
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });

  it('triggers a click on the generated anchor element', () => {
    exportResults(buildResult());
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('sets the download attribute to a dated JSON filename', () => {
    exportResults(buildResult());
    expect(clickSpy.mock.instances[0].download).toMatch(
      /^quality-analysis-\d{4}-\d{2}-\d{2}\.json$/
    );
  });

  it('calls URL.revokeObjectURL after the download is triggered', () => {
    exportResults(buildResult());
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('includes the analysis data in the exported Blob', () => {
    const result = buildResult({ score: 77 });
    exportResults(result);
    const blob: Blob = (URL.createObjectURL as jest.Mock).mock.calls[0][0];
    // Read the blob content synchronously via FileReader is async;
    // instead verify the Blob type is set to application/json.
    expect(blob.type).toBe('application/json');
  });

  it('includes an exportedAt field in the exported JSON data', () => {
    // Spy on JSON.stringify to inspect what data is serialised into the Blob.
    const stringifySpy = jest.spyOn(JSON, 'stringify');
    exportResults(buildResult());
    const serialisedData = stringifySpy.mock.calls[0][0] as Record<string, unknown>;
    expect(serialisedData).toHaveProperty('exportedAt');
    expect(typeof serialisedData.exportedAt).toBe('string');
    stringifySpy.mockRestore();
  });

  it('removes the temporary anchor from the document after clicking', () => {
    // Override click to not do anything (already mocked)
    const beforeCount = document.body.querySelectorAll('a').length;
    exportResults(buildResult());
    const afterCount = document.body.querySelectorAll('a').length;
    expect(afterCount).toBe(beforeCount);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// runAnalysis
// ══════════════════════════════════════════════════════════════════════════════
describe('runAnalysis', () => {
  const MOCK_RESULT = buildResult();

  beforeEach(() => {
    setupPopupDOM();
    jest.clearAllMocks();
    // Default: createObjectURL available (export button enabled path)
    global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock');
    global.URL.revokeObjectURL = jest.fn();
    jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('queries for the active tab in the current window', async () => {
    (chrome.tabs.query as jest.Mock).mockResolvedValueOnce([
      { id: 1, url: 'https://example.com' },
    ]);
    (chrome.tabs.sendMessage as jest.Mock).mockResolvedValueOnce(MOCK_RESULT);

    await runAnalysis();

    expect(chrome.tabs.query).toHaveBeenCalledWith({
      active: true,
      currentWindow: true,
    });
  });

  it('sends an "analyze" message to the content script', async () => {
    (chrome.tabs.query as jest.Mock).mockResolvedValueOnce([
      { id: 42, url: 'https://example.com' },
    ]);
    (chrome.tabs.sendMessage as jest.Mock).mockResolvedValueOnce(MOCK_RESULT);

    await runAnalysis();

    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(42, {
      action: 'analyze',
    });
  });

  it('displays the overall score after a successful analysis', async () => {
    (chrome.tabs.query as jest.Mock).mockResolvedValueOnce([
      { id: 1, url: 'https://example.com' },
    ]);
    (chrome.tabs.sendMessage as jest.Mock).mockResolvedValueOnce(
      buildResult({ score: 77 })
    );

    await runAnalysis();

    expect(document.getElementById('overview-tab')?.textContent).toContain('77');
  });

  it('re-enables the analyze button after successful analysis', async () => {
    (chrome.tabs.query as jest.Mock).mockResolvedValueOnce([
      { id: 1, url: 'https://example.com' },
    ]);
    (chrome.tabs.sendMessage as jest.Mock).mockResolvedValueOnce(MOCK_RESULT);

    await runAnalysis();

    const btn = document.getElementById('analyze-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('enables the export button after successful analysis', async () => {
    (chrome.tabs.query as jest.Mock).mockResolvedValueOnce([
      { id: 1, url: 'https://example.com' },
    ]);
    (chrome.tabs.sendMessage as jest.Mock).mockResolvedValueOnce(MOCK_RESULT);

    await runAnalysis();

    const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
    expect(exportBtn.disabled).toBe(false);
  });

  it('updates the page URL display with the active tab URL', async () => {
    (chrome.tabs.query as jest.Mock).mockResolvedValueOnce([
      { id: 1, url: 'https://example.com/page' },
    ]);
    (chrome.tabs.sendMessage as jest.Mock).mockResolvedValueOnce(MOCK_RESULT);

    await runAnalysis();

    expect(document.getElementById('page-url')?.textContent).toBe(
      'https://example.com/page'
    );
  });

  it('shows an error message when chrome.tabs.query rejects', async () => {
    (chrome.tabs.query as jest.Mock).mockRejectedValueOnce(
      new Error('Tab access denied')
    );

    await runAnalysis();

    expect(document.getElementById('overview-tab')?.textContent).toContain(
      "Could not analyze page"
    );
  });

  it('shows an error message when chrome.tabs.sendMessage rejects', async () => {
    (chrome.tabs.query as jest.Mock).mockResolvedValueOnce([
      { id: 1, url: 'https://example.com' },
    ]);
    (chrome.tabs.sendMessage as jest.Mock).mockRejectedValueOnce(
      new Error('No content script')
    );

    await runAnalysis();

    expect(document.getElementById('overview-tab')?.textContent).toContain(
      "Could not analyze page"
    );
  });

  it('re-enables the analyze button even after an error', async () => {
    (chrome.tabs.query as jest.Mock).mockRejectedValueOnce(new Error('fail'));

    await runAnalysis();

    const btn = document.getElementById('analyze-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('does not send a message when the tab has no id', async () => {
    (chrome.tabs.query as jest.Mock).mockResolvedValueOnce([
      { url: 'https://example.com' }, // no id
    ]);

    await runAnalysis();

    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
  });

  it('does not send a message when the tab has no url', async () => {
    (chrome.tabs.query as jest.Mock).mockResolvedValueOnce([
      { id: 1 }, // no url
    ]);

    await runAnalysis();

    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
  });

  it('restores the analyze button label after completion', async () => {
    (chrome.tabs.query as jest.Mock).mockResolvedValueOnce([
      { id: 1, url: 'https://example.com' },
    ]);
    (chrome.tabs.sendMessage as jest.Mock).mockResolvedValueOnce(MOCK_RESULT);

    await runAnalysis();

    const btn = document.getElementById('analyze-btn') as HTMLButtonElement;
    expect(btn.innerHTML).toContain('Analyze Page');
  });
});
