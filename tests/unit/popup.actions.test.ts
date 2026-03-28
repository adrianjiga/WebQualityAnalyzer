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

  beforeEach(() => {
    setupPopupDOM();
    jest.clearAllMocks();
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
      { url: 'https://example.com' },
    ]);

    await runAnalysis();

    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
  });

  it('does not send a message when the tab has no url', async () => {
    (chrome.tabs.query as jest.Mock).mockResolvedValueOnce([
      { id: 1 },
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
