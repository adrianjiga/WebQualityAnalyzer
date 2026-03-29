export interface AccessibilitySettings {
  enabled: boolean;
  missingAltDeduction: number;
  missingAltCap: number;
  unlabelledInputDeduction: number;
  unlabelledInputCap: number;
  headingHierarchyDeduction: number;
}

export interface SeoSettings {
  enabled: boolean;
  titleMinLength: number;
  titleMaxLength: number;
  metaDescMinLength: number;
  metaDescMaxLength: number;
  noH1Deduction: number;
  multipleH1Deduction: number;
}

export interface PerformanceSettings {
  enabled: boolean;
  imageMaxWidth: number;
  imageMaxHeight: number;
  lazyLoadThreshold: number;
  externalResourcesThreshold: number;
  inlineStylesThreshold: number;
  externalLinksDeductionCap: number;
}

export interface AnalyzerSettings {
  accessibility: AccessibilitySettings;
  seo: SeoSettings;
  performance: PerformanceSettings;
}

export const STORAGE_KEY = 'analyzerSettings';

export const DEFAULT_SETTINGS: AnalyzerSettings = {
  accessibility: {
    enabled: true,
    missingAltDeduction: 3,
    missingAltCap: 25,
    unlabelledInputDeduction: 4,
    unlabelledInputCap: 20,
    headingHierarchyDeduction: 10,
  },
  seo: {
    enabled: true,
    titleMinLength: 10,
    titleMaxLength: 60,
    metaDescMinLength: 120,
    metaDescMaxLength: 160,
    noH1Deduction: 20,
    multipleH1Deduction: 15,
  },
  performance: {
    enabled: true,
    imageMaxWidth: 1920,
    imageMaxHeight: 1080,
    lazyLoadThreshold: 3,
    externalResourcesThreshold: 10,
    inlineStylesThreshold: 20,
    externalLinksDeductionCap: 10,
  },
};
