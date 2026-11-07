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
  noTitleDeduction: number;
  noMetaDescDeduction: number;
  noH1Deduction: number;
  multipleH1Deduction: number;
}

export interface PerformanceSettings {
  enabled: boolean;
  imageMaxWidth: number;
  imageMaxHeight: number;
  lazyLoadThreshold: number;
  externalResourcesThreshold: number;
  externalResourcesDeductionPerResource: number;
  externalResourcesDeductionCap: number;
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
    noTitleDeduction: 25,
    noMetaDescDeduction: 20,
    noH1Deduction: 20,
    multipleH1Deduction: 15,
  },
  performance: {
    enabled: true,
    imageMaxWidth: 1920,
    imageMaxHeight: 1080,
    lazyLoadThreshold: 3,
    externalResourcesThreshold: 10,
    externalResourcesDeductionPerResource: 2,
    externalResourcesDeductionCap: 15,
    inlineStylesThreshold: 20,
    externalLinksDeductionCap: 10,
  },
};

export const SETTING_LIMITS = {
  accessibility: {
    missingAltDeduction: [0, 25],
    missingAltCap: [0, 100],
    unlabelledInputDeduction: [0, 25],
    unlabelledInputCap: [0, 100],
    headingHierarchyDeduction: [0, 50],
  },
  seo: {
    titleMinLength: [1, 100],
    titleMaxLength: [1, 200],
    metaDescMinLength: [1, 300],
    metaDescMaxLength: [1, 500],
    noTitleDeduction: [0, 100],
    noMetaDescDeduction: [0, 100],
    noH1Deduction: [0, 50],
    multipleH1Deduction: [0, 50],
  },
  performance: {
    imageMaxWidth: [1, 9999],
    imageMaxHeight: [1, 9999],
    lazyLoadThreshold: [0, 50],
    externalResourcesThreshold: [0, 100],
    externalResourcesDeductionPerResource: [0, 100],
    externalResourcesDeductionCap: [0, 100],
    inlineStylesThreshold: [0, 200],
    externalLinksDeductionCap: [0, 50],
  },
} as const;

Object.freeze(DEFAULT_SETTINGS.accessibility);
Object.freeze(DEFAULT_SETTINGS.seo);
Object.freeze(DEFAULT_SETTINGS.performance);
Object.freeze(DEFAULT_SETTINGS);
