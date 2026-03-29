import {
  populateSettingsUI,
  collectSettings,
  attachSettingsListeners,
  initSettings,
} from '../../src/popup/popup';
import { DEFAULT_SETTINGS } from '../../src/shared/settings';
import { setupPopupDOM } from '../helpers/popup';

const storageSet = chrome.storage.local.set as jest.Mock;
const storageGet = chrome.storage.local.get as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  storageGet.mockResolvedValue({});
  storageSet.mockResolvedValue(undefined);
  setupPopupDOM();
});

// ══════════════════════════════════════════════════════════════════════════════
// initSettings
// ══════════════════════════════════════════════════════════════════════════════
describe('initSettings', () => {
  it('falls back to DEFAULT_SETTINGS and still attaches listeners when storage rejects', async () => {
    storageGet.mockRejectedValue(new Error('storage unavailable'));
    initSettings();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const el = document.getElementById('settings-a11y-missingAltDeduction') as HTMLInputElement;
    expect(el.value).toBe(String(DEFAULT_SETTINGS.accessibility.missingAltDeduction));
    // Listener is attached — a number input change should trigger saveSettings
    storageSet.mockResolvedValue(undefined);
    el.value = '9';
    el.dispatchEvent(new Event('change'));
    expect(storageSet).toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// populateSettingsUI
// ══════════════════════════════════════════════════════════════════════════════
describe('populateSettingsUI', () => {
  it('sets accessibility checkbox checked state', () => {
    populateSettingsUI({ ...DEFAULT_SETTINGS, accessibility: { ...DEFAULT_SETTINGS.accessibility, enabled: false } });
    const el = document.getElementById('settings-a11y-enabled') as HTMLInputElement;
    expect(el.checked).toBe(false);
  });

  it('sets accessibility number input values', () => {
    populateSettingsUI(DEFAULT_SETTINGS);
    expect((document.getElementById('settings-a11y-missingAltDeduction') as HTMLInputElement).value)
      .toBe(String(DEFAULT_SETTINGS.accessibility.missingAltDeduction));
    expect((document.getElementById('settings-a11y-missingAltCap') as HTMLInputElement).value)
      .toBe(String(DEFAULT_SETTINGS.accessibility.missingAltCap));
  });

  it('sets SEO checkbox and input values', () => {
    populateSettingsUI(DEFAULT_SETTINGS);
    expect((document.getElementById('settings-seo-enabled') as HTMLInputElement).checked).toBe(true);
    expect((document.getElementById('settings-seo-titleMinLength') as HTMLInputElement).value)
      .toBe(String(DEFAULT_SETTINGS.seo.titleMinLength));
    expect((document.getElementById('settings-seo-titleMaxLength') as HTMLInputElement).value)
      .toBe(String(DEFAULT_SETTINGS.seo.titleMaxLength));
  });

  it('sets performance checkbox and input values', () => {
    populateSettingsUI(DEFAULT_SETTINGS);
    expect((document.getElementById('settings-perf-enabled') as HTMLInputElement).checked).toBe(true);
    expect((document.getElementById('settings-perf-imageMaxWidth') as HTMLInputElement).value)
      .toBe(String(DEFAULT_SETTINGS.performance.imageMaxWidth));
    expect((document.getElementById('settings-perf-lazyLoadThreshold') as HTMLInputElement).value)
      .toBe(String(DEFAULT_SETTINGS.performance.lazyLoadThreshold));
  });

  it('adds .disabled class to section body when analyzer is disabled', () => {
    populateSettingsUI({ ...DEFAULT_SETTINGS, seo: { ...DEFAULT_SETTINGS.seo, enabled: false } });
    expect(document.getElementById('settings-seo-body')?.classList.contains('disabled')).toBe(true);
  });

  it('removes .disabled class from section body when analyzer is enabled', () => {
    const body = document.getElementById('settings-a11y-body')!;
    body.classList.add('disabled');
    populateSettingsUI(DEFAULT_SETTINGS);
    expect(body.classList.contains('disabled')).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// collectSettings
// ══════════════════════════════════════════════════════════════════════════════
describe('collectSettings', () => {
  it('reads DOM inputs and returns a valid AnalyzerSettings object', () => {
    populateSettingsUI(DEFAULT_SETTINGS);
    const result = collectSettings();
    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  it('reflects custom input values', () => {
    populateSettingsUI(DEFAULT_SETTINGS);
    (document.getElementById('settings-seo-titleMinLength') as HTMLInputElement).value = '20';
    const result = collectSettings();
    expect(result.seo.titleMinLength).toBe(20);
  });

  it('reads enabled checkboxes correctly', () => {
    populateSettingsUI(DEFAULT_SETTINGS);
    (document.getElementById('settings-perf-enabled') as HTMLInputElement).checked = false;
    const result = collectSettings();
    expect(result.performance.enabled).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// attachSettingsListeners
// ══════════════════════════════════════════════════════════════════════════════
describe('attachSettingsListeners', () => {
  beforeEach(() => {
    populateSettingsUI(DEFAULT_SETTINGS);
    attachSettingsListeners();
  });

  it('saves settings when a number input changes', () => {
    const input = document.getElementById('settings-a11y-missingAltDeduction') as HTMLInputElement;
    input.value = '7';
    input.dispatchEvent(new Event('change'));
    expect(storageSet).toHaveBeenCalledWith(
      expect.objectContaining({ analyzerSettings: expect.any(Object) })
    );
  });

  it('toggles .disabled on a11y body when a11y toggle changes', () => {
    const toggle = document.getElementById('settings-a11y-enabled') as HTMLInputElement;
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
    expect(document.getElementById('settings-a11y-body')?.classList.contains('disabled')).toBe(true);
  });

  it('toggles .disabled on seo body when seo toggle changes', () => {
    const toggle = document.getElementById('settings-seo-enabled') as HTMLInputElement;
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
    expect(document.getElementById('settings-seo-body')?.classList.contains('disabled')).toBe(true);
  });

  it('toggles .disabled on perf body when perf toggle changes', () => {
    const toggle = document.getElementById('settings-perf-enabled') as HTMLInputElement;
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
    expect(document.getElementById('settings-perf-body')?.classList.contains('disabled')).toBe(true);
  });

  it('toggle click stops propagation', () => {
    const toggle = document.getElementById('settings-a11y-enabled') as HTMLInputElement;
    const propagationSpy = jest.fn();
    const parent = toggle.parentElement!;
    parent.addEventListener('click', propagationSpy);

    const clickEvent = new MouseEvent('click', { bubbles: true });
    toggle.dispatchEvent(clickEvent);

    expect(propagationSpy).not.toHaveBeenCalled();
  });

  it('reset button calls resetSettings and repopulates the UI', async () => {
    storageSet.mockResolvedValue(undefined);
    // Change a value so we can tell if it gets reset
    (document.getElementById('settings-seo-titleMinLength') as HTMLInputElement).value = '99';

    const resetBtn = document.getElementById('settings-reset-btn') as HTMLButtonElement;
    resetBtn.click();

    // Flush all pending microtasks from the async reset chain
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(storageSet).toHaveBeenCalledWith(
      expect.objectContaining({ analyzerSettings: DEFAULT_SETTINGS })
    );
    expect((document.getElementById('settings-seo-titleMinLength') as HTMLInputElement).value)
      .toBe(String(DEFAULT_SETTINGS.seo.titleMinLength));
  });
});
