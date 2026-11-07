import { loadSettings, saveSettings, resetSettings } from '../../src/popup/settings';
import { DEFAULT_SETTINGS, STORAGE_KEY } from '../../src/shared/settings';

const storageGet = chrome.storage.local.get as jest.Mock;
const storageSet = chrome.storage.local.set as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('loadSettings', () => {
  it('returns DEFAULT_SETTINGS when storage is empty', async () => {
    storageGet.mockResolvedValue({});
    const result = await loadSettings();
    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  it('returns stored settings when present', async () => {
    storageGet.mockResolvedValue({ [STORAGE_KEY]: DEFAULT_SETTINGS });
    const result = await loadSettings();
    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  it('deep-merges partial stored settings with defaults', async () => {
    storageGet.mockResolvedValue({
      [STORAGE_KEY]: {
        accessibility: { enabled: false },
        seo: { titleMinLength: 20 },
      },
    });
    const result = await loadSettings();
    expect(result.accessibility.enabled).toBe(false);
    expect(result.accessibility.missingAltDeduction).toBe(
      DEFAULT_SETTINGS.accessibility.missingAltDeduction
    );
    expect(result.seo.titleMinLength).toBe(20);
    expect(result.seo.titleMaxLength).toBe(DEFAULT_SETTINGS.seo.titleMaxLength);
    expect(result.performance).toEqual(DEFAULT_SETTINGS.performance);
  });

  it('returns defaults when stored value is not an object', async () => {
    storageGet.mockResolvedValue({ [STORAGE_KEY]: 'invalid' });
    const result = await loadSettings();
    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  it('falls back to per-field defaults for malformed stored values', async () => {
    storageGet.mockResolvedValue({
      [STORAGE_KEY]: {
        accessibility: {
          enabled: 'false',
          missingAltDeduction: null,
          missingAltCap: -5,
          unlabelledInputDeduction: Number.NaN,
          headingHierarchyDeduction: 12,
        },
        seo: null,
        performance: [],
      },
    });

    const result = await loadSettings();

    expect(result.accessibility.enabled).toBe(DEFAULT_SETTINGS.accessibility.enabled);
    expect(result.accessibility.missingAltDeduction).toBe(DEFAULT_SETTINGS.accessibility.missingAltDeduction);
    expect(result.accessibility.missingAltCap).toBe(-5);
    expect(result.accessibility.unlabelledInputDeduction).toBe(DEFAULT_SETTINGS.accessibility.unlabelledInputDeduction);
    expect(result.accessibility.headingHierarchyDeduction).toBe(12);
    expect(result.seo).toEqual(DEFAULT_SETTINGS.seo);
    expect(result.performance).toEqual(DEFAULT_SETTINGS.performance);
  });
});

describe('saveSettings', () => {
  it('calls browser.storage.local.set with the correct key and value', async () => {
    storageSet.mockResolvedValue(undefined);
    await saveSettings(DEFAULT_SETTINGS);
    expect(storageSet).toHaveBeenCalledWith({
      [STORAGE_KEY]: DEFAULT_SETTINGS,
    });
  });
});

describe('resetSettings', () => {
  it('saves DEFAULT_SETTINGS and returns them', async () => {
    storageSet.mockResolvedValue(undefined);
    const result = await resetSettings();
    expect(storageSet).toHaveBeenCalledWith({
      [STORAGE_KEY]: DEFAULT_SETTINGS,
    });
    expect(result).toEqual(DEFAULT_SETTINGS);
  });
});
