import { browser } from '../shared/browser';
import {
  AnalyzerSettings,
  DEFAULT_SETTINGS,
  STORAGE_KEY,
} from '../shared/settings';

export async function loadSettings(): Promise<AnalyzerSettings> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  const stored = (result as Record<string, unknown>)[STORAGE_KEY];
  if (!isRecord(stored)) {
    return cloneDefaults();
  }
  return mergeValidatedSettings(stored);
}

export async function saveSettings(settings: AnalyzerSettings): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: settings });
}

export async function resetSettings(): Promise<AnalyzerSettings> {
  const defaults = cloneDefaults();
  await saveSettings(defaults);
  return cloneDefaults();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneDefaults(): AnalyzerSettings {
  return {
    accessibility: { ...DEFAULT_SETTINGS.accessibility },
    seo: { ...DEFAULT_SETTINGS.seo },
    performance: { ...DEFAULT_SETTINGS.performance },
  };
}

function mergeCategory<T extends object>(
  defaults: T,
  stored: unknown
): T {
  const candidate = isRecord(stored) ? stored : {};
  const merged = { ...defaults } as T;

  for (const key of Object.keys(defaults) as Array<keyof T>) {
    const value = candidate[key as string];
    const defaultValue: unknown = defaults[key];
    if (
      (typeof defaultValue === 'boolean' && typeof value === 'boolean') ||
      (typeof defaultValue === 'number' &&
        typeof value === 'number' &&
        Number.isFinite(value))
    ) {
      (merged as Record<keyof T, unknown>)[key] = value;
    }
  }
  return merged;
}

function mergeValidatedSettings(stored: Record<string, unknown>): AnalyzerSettings {
  return {
    accessibility: mergeCategory(DEFAULT_SETTINGS.accessibility, stored.accessibility),
    seo: mergeCategory(DEFAULT_SETTINGS.seo, stored.seo),
    performance: mergeCategory(DEFAULT_SETTINGS.performance, stored.performance),
  };
}
