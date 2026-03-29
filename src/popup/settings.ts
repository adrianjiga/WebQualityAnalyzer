import { browser } from '../shared/browser';
import {
  AnalyzerSettings,
  DEFAULT_SETTINGS,
  STORAGE_KEY,
} from '../shared/settings';

export async function loadSettings(): Promise<AnalyzerSettings> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  const stored = (result as Record<string, unknown>)[STORAGE_KEY];
  if (!stored || typeof stored !== 'object') {
    return DEFAULT_SETTINGS;
  }
  return deepMerge(DEFAULT_SETTINGS, stored as Partial<AnalyzerSettings>);
}

export async function saveSettings(settings: AnalyzerSettings): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: settings });
}

export async function resetSettings(): Promise<AnalyzerSettings> {
  await saveSettings(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

function deepMerge(
  defaults: AnalyzerSettings,
  stored: Partial<AnalyzerSettings>
): AnalyzerSettings {
  return {
    accessibility: { ...defaults.accessibility, ...stored.accessibility },
    seo: { ...defaults.seo, ...stored.seo },
    performance: { ...defaults.performance, ...stored.performance },
  };
}
