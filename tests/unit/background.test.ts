// background.ts has side effects at module-load time (registers the
// onInstalled listener), so we use jest.isolateModules + require() to get a
// fresh execution in each test and avoid cross-test contamination.

describe('Background Script', () => {
  function loadBackground(): void {
    jest.isolateModules(() => {
      require('../../src/background/background');
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls chrome.runtime.onInstalled.addListener exactly once on load', () => {
    loadBackground();
    expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalledTimes(1);
  });

  it('registers a callable function as the onInstalled listener', () => {
    loadBackground();
    const listener = (chrome.runtime.onInstalled.addListener as jest.Mock)
      .mock.calls[0][0];
    expect(typeof listener).toBe('function');
  });

  it('logs the installation message when the onInstalled callback fires', () => {
    const consoleSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => {});

    loadBackground();

    const listener = (chrome.runtime.onInstalled.addListener as jest.Mock)
      .mock.calls[0][0] as () => void;
    listener();

    expect(consoleSpy).toHaveBeenCalledWith(
      'WebQualityAnalyzer extension installed'
    );

    consoleSpy.mockRestore();
  });

  it('logs the module-load message when the script is first evaluated', () => {
    const consoleSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => {});

    loadBackground();

    expect(consoleSpy).toHaveBeenCalledWith(
      'WebQualityAnalyzer background script loaded'
    );

    consoleSpy.mockRestore();
  });

  it('does not throw when the onInstalled callback is invoked', () => {
    loadBackground();
    const listener = (chrome.runtime.onInstalled.addListener as jest.Mock)
      .mock.calls[0][0] as () => void;
    expect(() => listener()).not.toThrow();
  });
});
