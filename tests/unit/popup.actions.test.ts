import { runAnalysis } from '../../src/popup/popup';
import { exportResults } from '../../src/popup/utils';
import { buildResult, setupPopupDOM } from '../helpers/popup';

// ══════════════════════════════════════════════════════════════════════════════
// exportResults
// ══════════════════════════════════════════════════════════════════════════════
describe('exportResults', () => {
  let clickSpy: jest.SpyInstance;

  beforeEach(() => {
    setupPopupDOM();
    jest.useFakeTimers();
    global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
    clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    clickSpy.mockRestore();
    jest.restoreAllMocks();
    jest.useRealTimers();
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

  it('revokes the object URL after the download has had time to start', () => {
    exportResults(buildResult());
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('removes the temporary anchor and schedules URL cleanup when clicking fails', () => {
    clickSpy.mockImplementationOnce(() => {
      throw new Error('download click failed');
    });

    expect(() => exportResults(buildResult())).toThrow('download click failed');
    expect(document.body.querySelectorAll('a')).toHaveLength(0);
    jest.advanceTimersByTime(1000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('includes the analysis data in the exported Blob', () => {
    const result = buildResult({ score: 77 });
    exportResults(result);
    const blob: Blob = (URL.createObjectURL as jest.Mock).mock.calls[0][0];
    expect(blob.type).toBe('application/json');
  });

  it('includes an exportedAt field in the exported JSON data', () => {
    const stringifySpy = jest.spyOn(JSON, 'stringify');
    exportResults(buildResult());
    const serialisedData = stringifySpy.mock.calls[0][0] as Record<string, unknown>;
    expect(serialisedData).toHaveProperty('exportedAt');
    expect(typeof serialisedData.exportedAt).toBe('string');
    stringifySpy.mockRestore();
  });

  it('removes the temporary anchor from the document after clicking', () => {
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
  const analyzerOutcomes: Array<() => Promise<unknown>> = [];

  const mockAnalysisResponse = (value: unknown): void => {
    analyzerOutcomes.push(() => Promise.resolve([{ result: value }]));
  };
  const mockAnalysisRejection = (error: Error): void => {
    analyzerOutcomes.push(() => Promise.reject(error));
  };
  const analyzerCalls = (): unknown[][] =>
    (chrome.scripting.executeScript as jest.Mock).mock.calls.filter(
      ([details]) => 'func' in details
    );

  beforeEach(() => {
    setupPopupDOM();
    jest.clearAllMocks();
    (chrome.storage.local.get as jest.Mock).mockResolvedValue({});
    analyzerOutcomes.length = 0;
    (chrome.scripting.executeScript as jest.Mock).mockImplementation(
      (details: { files?: string[] }) => {
        if (details.files) return Promise.resolve([]);
        const outcome = analyzerOutcomes.shift();
        return outcome ? outcome() : Promise.resolve([]);
      }
    );
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
    mockAnalysisResponse(MOCK_RESULT);

    await runAnalysis();

    expect(chrome.tabs.query).toHaveBeenCalledWith({
      active: true,
      currentWindow: true,
    });
  });

  it('runs the injected analyzer in the active tab with the stored settings', async () => {
    (chrome.tabs.query as jest.Mock).mockResolvedValueOnce([
      { id: 42, url: 'https://example.com' },
    ]);
    mockAnalysisResponse(MOCK_RESULT);

    await runAnalysis();

    expect(chrome.scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: 42 },
      func: expect.any(Function),
      args: ['__webQualityAnalyzer', expect.any(Object)],
    });
  });

  it('injects the content script before running the analyzer', async () => {
    (chrome.tabs.query as jest.Mock).mockResolvedValueOnce([
      { id: 42, url: 'https://example.com' },
    ]);
    mockAnalysisResponse(MOCK_RESULT);

    await runAnalysis();

    const calls = (chrome.scripting.executeScript as jest.Mock).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][0]).toEqual({
      target: { tabId: 42 },
      files: ['content.bundle.js'],
    });
    expect(calls[1][0]).toHaveProperty('func');
  });

  it('calls the analyzer exposed under the given global name', async () => {
    (chrome.tabs.query as jest.Mock).mockResolvedValueOnce([
      { id: 42, url: 'https://example.com' },
    ]);
    mockAnalysisResponse(MOCK_RESULT);
    await runAnalysis();

    const [details] = analyzerCalls()[0] as [
      { func: (name: string, settings: unknown) => unknown },
    ];
    const analyze = jest.fn().mockReturnValue('analyzed');
    const scope = globalThis as Record<string, unknown>;
    scope.__testAnalyzer = { analyze };

    try {
      expect(details.func('__testAnalyzer', { seo: {} })).toBe('analyzed');
      expect(analyze).toHaveBeenCalledWith({ seo: {} });
    } finally {
      delete scope.__testAnalyzer;
    }
  });

  it.each([
    ['no injection result', []],
    ['an undefined result', [{ result: undefined }]],
    ['an error raised in the page', [{ error: new Error('Analyzer threw') }]],
  ])('shows the generic page error for %s', async (_label, injectionResults) => {
    (chrome.tabs.query as jest.Mock).mockResolvedValueOnce([
      { id: 1, url: 'https://example.com' },
    ]);
    analyzerOutcomes.push(() => Promise.resolve(injectionResults));

    await runAnalysis();

    const text = document.getElementById('overview-tab')?.textContent;
    expect(text).toContain('Could not analyze page');
    expect(text).not.toContain('Reload the extension');
    expect(document.getElementById('export-btn')?.hasAttribute('disabled')).toBe(true);
  });

  it('shows an error without analyzing when the page cannot be injected', async () => {
    (chrome.tabs.query as jest.Mock).mockResolvedValueOnce([
      { id: 1, url: 'chrome://extensions' },
    ]);
    (chrome.scripting.executeScript as jest.Mock).mockRejectedValueOnce(
      new Error('Cannot access a chrome:// URL')
    );

    await runAnalysis();

    expect(analyzerCalls()).toHaveLength(0);
    expect(document.getElementById('overview-tab')?.textContent).toContain(
      'Could not analyze page'
    );
  });

  it('displays the overall score after a successful analysis', async () => {
    (chrome.tabs.query as jest.Mock).mockResolvedValueOnce([
      { id: 1, url: 'https://example.com' },
    ]);
    mockAnalysisResponse(
      buildResult({ score: 77 })
    );

    await runAnalysis();

    expect(document.getElementById('overview-tab')?.textContent).toContain('77');
  });

  it('re-enables the analyze button after successful analysis', async () => {
    (chrome.tabs.query as jest.Mock).mockResolvedValueOnce([
      { id: 1, url: 'https://example.com' },
    ]);
    mockAnalysisResponse(MOCK_RESULT);

    await runAnalysis();

    const btn = document.getElementById('analyze-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('enables the export button after successful analysis', async () => {
    (chrome.tabs.query as jest.Mock).mockResolvedValueOnce([
      { id: 1, url: 'https://example.com' },
    ]);
    mockAnalysisResponse(MOCK_RESULT);

    await runAnalysis();

    const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
    expect(exportBtn.disabled).toBe(false);
  });

  it('updates the page URL display with the active tab URL', async () => {
    (chrome.tabs.query as jest.Mock).mockResolvedValueOnce([
      { id: 1, url: 'https://example.com/page' },
    ]);
    mockAnalysisResponse(MOCK_RESULT);

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

  it('shows an error message when the injected analyzer fails', async () => {
    (chrome.tabs.query as jest.Mock).mockResolvedValueOnce([
      { id: 1, url: 'https://example.com' },
    ]);
    mockAnalysisRejection(new Error('Analyzer failed'));

    await runAnalysis();

    expect(document.getElementById('overview-tab')?.textContent).toContain(
      "Could not analyze page"
    );
  });

  it('shows a compatibility error for a malformed analysis response', async () => {
    (chrome.tabs.query as jest.Mock).mockResolvedValueOnce([
      { id: 1, url: 'https://example.com' },
    ]);
    mockAnalysisResponse({ score: 'bad' });

    await runAnalysis();

    expect(document.getElementById('overview-tab')?.textContent).toContain(
      'analysis response was invalid'
    );
    expect(document.getElementById('export-btn')?.hasAttribute('disabled')).toBe(true);
  });

  it('does not retain or export a previous result after a later failure', async () => {
    (chrome.tabs.query as jest.Mock)
      .mockResolvedValueOnce([{ id: 1, url: 'https://example.com/first' }])
      .mockResolvedValueOnce([{ id: 2, url: 'https://example.com/second' }]);
    mockAnalysisResponse(MOCK_RESULT);
    mockAnalysisRejection(new Error('Analyzer failed'));

    await runAnalysis();
    await runAnalysis();

    document.getElementById('export-btn')?.dispatchEvent(new MouseEvent('click'));

    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(document.getElementById('overview-tab')?.textContent).toContain(
      'Could not analyze page'
    );
  });

  it('re-enables the analyze button even after an error', async () => {
    (chrome.tabs.query as jest.Mock).mockRejectedValueOnce(new Error('fail'));

    await runAnalysis();

    const btn = document.getElementById('analyze-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('does not inject when the tab has no id', async () => {
    (chrome.tabs.query as jest.Mock).mockResolvedValueOnce([
      { url: 'https://example.com' },
    ]);

    await runAnalysis();

    expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
    expect(document.getElementById('overview-tab')?.textContent).toContain(
      'Could not analyze page'
    );
  });

  it('does not inject when the tab has no url', async () => {
    (chrome.tabs.query as jest.Mock).mockResolvedValueOnce([
      { id: 1 },
    ]);

    await runAnalysis();

    expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
    expect(document.getElementById('overview-tab')?.textContent).toContain(
      'Could not analyze page'
    );
  });

  it('clears previous page metadata when the next tab is unavailable', async () => {
    (chrome.tabs.query as jest.Mock)
      .mockResolvedValueOnce([{ id: 1, url: 'https://example.com/first' }])
      .mockResolvedValueOnce([{ id: 2 }]);
    mockAnalysisResponse(MOCK_RESULT);

    await runAnalysis();
    await runAnalysis();

    expect(document.getElementById('page-url')?.textContent).toBe('');
    expect((document.getElementById('page-info') as HTMLElement).style.display).toBe('none');
    expect(document.getElementById('overview-tab')?.textContent).toContain(
      'Could not analyze page'
    );
  });

  it('restores the analyze button label after completion', async () => {
    (chrome.tabs.query as jest.Mock).mockResolvedValueOnce([
      { id: 1, url: 'https://example.com' },
    ]);
    mockAnalysisResponse(MOCK_RESULT);

    await runAnalysis();

    const btn = document.getElementById('analyze-btn') as HTMLButtonElement;
    expect(btn.innerHTML).toContain('Analyze Page');
  });
});
