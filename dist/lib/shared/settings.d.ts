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
export declare const STORAGE_KEY = "analyzerSettings";
export declare const DEFAULT_SETTINGS: AnalyzerSettings;
export declare const SETTING_LIMITS: {
    readonly accessibility: {
        readonly missingAltDeduction: readonly [0, 25];
        readonly missingAltCap: readonly [0, 100];
        readonly unlabelledInputDeduction: readonly [0, 25];
        readonly unlabelledInputCap: readonly [0, 100];
        readonly headingHierarchyDeduction: readonly [0, 50];
    };
    readonly seo: {
        readonly titleMinLength: readonly [1, 100];
        readonly titleMaxLength: readonly [1, 200];
        readonly metaDescMinLength: readonly [1, 300];
        readonly metaDescMaxLength: readonly [1, 500];
        readonly noTitleDeduction: readonly [0, 100];
        readonly noMetaDescDeduction: readonly [0, 100];
        readonly noH1Deduction: readonly [0, 50];
        readonly multipleH1Deduction: readonly [0, 50];
    };
    readonly performance: {
        readonly imageMaxWidth: readonly [1, 9999];
        readonly imageMaxHeight: readonly [1, 9999];
        readonly lazyLoadThreshold: readonly [0, 50];
        readonly externalResourcesThreshold: readonly [0, 100];
        readonly externalResourcesDeductionPerResource: readonly [0, 100];
        readonly externalResourcesDeductionCap: readonly [0, 100];
        readonly inlineStylesThreshold: readonly [0, 200];
        readonly externalLinksDeductionCap: readonly [0, 50];
    };
};
