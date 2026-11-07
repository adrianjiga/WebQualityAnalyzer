import { browser } from '../shared/browser';
import {
  AnalyzerSettings,
  DEFAULT_SETTINGS,
  SETTING_LIMITS,
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
      if (typeof value === 'number') {
        const limits = (SETTING_LIMITS as Record<string, Record<string, readonly [number, number]>>);
        const categoryName = Object.keys(SETTING_LIMITS).find((category) =>
          Object.prototype.hasOwnProperty.call(limits[category], key)
        );
        const range = categoryName ? limits[categoryName][key as string] : undefined;
        (merged as Record<keyof T, unknown>)[key] = range
          ? Math.min(range[1], Math.max(range[0], value))
          : value;
      } else {
        (merged as Record<keyof T, unknown>)[key] = value;
      }
    }
  }
  return merged;
}

function mergeValidatedSettings(stored: Record<string, unknown>): AnalyzerSettings {
  const settings = {
    accessibility: mergeCategory(DEFAULT_SETTINGS.accessibility, stored.accessibility),
    seo: mergeCategory(DEFAULT_SETTINGS.seo, stored.seo),
    performance: mergeCategory(DEFAULT_SETTINGS.performance, stored.performance),
  };
  if (settings.seo.titleMaxLength <= settings.seo.titleMinLength) {
    settings.seo.titleMaxLength = Math.min(200, settings.seo.titleMinLength + 1);
    settings.seo.titleMinLength = Math.min(settings.seo.titleMinLength, settings.seo.titleMaxLength - 1);
  }
  if (settings.seo.metaDescMaxLength <= settings.seo.metaDescMinLength) {
    settings.seo.metaDescMaxLength = Math.min(500, settings.seo.metaDescMinLength + 1);
    settings.seo.metaDescMinLength = Math.min(settings.seo.metaDescMinLength, settings.seo.metaDescMaxLength - 1);
  }
  return settings;
}
