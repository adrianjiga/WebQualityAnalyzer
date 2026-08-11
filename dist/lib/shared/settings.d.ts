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
export declare const STORAGE_KEY = "analyzerSettings";
export declare const DEFAULT_SETTINGS: AnalyzerSettings;
