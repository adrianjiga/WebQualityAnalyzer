var WebQualityAnalyzer;
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   performQualityAnalysis: () => (/* binding */ performQualityAnalysis)
/* harmony export */ });
/* harmony import */ var _analyzers_accessibility__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2);
/* harmony import */ var _analyzers_seo__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(5);
/* harmony import */ var _analyzers_performance__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(6);
/* harmony import */ var _shared_settings__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(4);




const EMPTY_CATEGORY = {
    score: 100,
    issues: [],
    suggestions: [],
};
/**
 * Runs every enabled analyzer against the current `document` and folds the three category
 * results into one overall score.
 *
 * This lives apart from `content.ts` deliberately. `content.ts` registers a
 * `browser.runtime.onMessage` listener at module scope, so importing it outside the extension
 * drags in `webextension-polyfill` and fires that side effect. The analysis itself needs
 * nothing but a DOM — keeping it in its own module is what lets the library entry
 * (`src/index.ts`) expose it to any caller with a page: a test runner, a CI script, a
 * headless browser.
 *
 * A disabled category scores 100 rather than 0 — it is "nothing found wrong", not "perfect",
 * and averaging a 0 for a category the caller switched off would misreport the page.
 */
function performQualityAnalysis(settings = _shared_settings__WEBPACK_IMPORTED_MODULE_3__.DEFAULT_SETTINGS) {
    const accessibility = settings.accessibility.enabled
        ? (0,_analyzers_accessibility__WEBPACK_IMPORTED_MODULE_0__.analyzeAccessibility)(settings.accessibility)
        : EMPTY_CATEGORY;
    const seo = settings.seo.enabled ? (0,_analyzers_seo__WEBPACK_IMPORTED_MODULE_1__.analyzeSEO)(settings.seo) : EMPTY_CATEGORY;
    const performance = settings.performance.enabled
        ? (0,_analyzers_performance__WEBPACK_IMPORTED_MODULE_2__.analyzePerformance)(settings.performance)
        : EMPTY_CATEGORY;
    const overallScore = Math.round((accessibility.score + seo.score + performance.score) / 3);
    return {
        score: overallScore,
        pageInfo: {
            url: window.location.href,
            title: document.title,
            timestamp: new Date().toISOString(),
        },
        categories: { accessibility, seo, performance },
    };
}


/***/ }),
/* 2 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   analyzeAccessibility: () => (/* binding */ analyzeAccessibility)
/* harmony export */ });
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);
/* harmony import */ var _shared_settings__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(4);


function analyzeAccessibility(settings = _shared_settings__WEBPACK_IMPORTED_MODULE_1__.DEFAULT_SETTINGS.accessibility) {
    const issues = [];
    const suggestions = [];
    let score = 100;
    // Check for missing alt text on images
    const images = document.querySelectorAll('img');
    const imagesWithoutAlt = Array.from(images).filter((img) => !img.alt || img.alt.trim() === '');
    if (imagesWithoutAlt.length > 0) {
        const firstImg = imagesWithoutAlt[0];
        issues.push({
            type: 'Missing Alt Text',
            message: `${imagesWithoutAlt.length} images missing alt text`,
            severity: 'high',
            selector: firstImg ? (0,_utils__WEBPACK_IMPORTED_MODULE_0__.getCssSelector)(firstImg) : undefined,
            htmlSnippet: firstImg ? (0,_utils__WEBPACK_IMPORTED_MODULE_0__.getHtmlSnippet)(firstImg) : undefined,
        });
        suggestions.push('Add descriptive alt text to all images for screen readers');
        score -= Math.min(settings.missingAltCap, imagesWithoutAlt.length * settings.missingAltDeduction);
    }
    // Check for form labels
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea, select');
    const inputsWithoutLabels = Array.from(inputs).filter((input) => {
        const id = input.getAttribute('id');
        const ariaLabel = input.getAttribute('aria-label');
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        return !label && !ariaLabel;
    });
    if (inputsWithoutLabels.length > 0) {
        const firstInput = inputsWithoutLabels[0];
        issues.push({
            type: 'Form Accessibility',
            message: `${inputsWithoutLabels.length} form inputs without labels`,
            severity: 'high',
            selector: firstInput ? (0,_utils__WEBPACK_IMPORTED_MODULE_0__.getCssSelector)(firstInput) : undefined,
            htmlSnippet: firstInput ? (0,_utils__WEBPACK_IMPORTED_MODULE_0__.getHtmlSnippet)(firstInput) : undefined,
        });
        suggestions.push('Add labels or aria-label attributes to all form inputs');
        score -= Math.min(settings.unlabelledInputCap, inputsWithoutLabels.length * settings.unlabelledInputDeduction);
    }
    // Check for color contrast (basic check)
    const elementsWithColor = document.querySelectorAll('[style*="color"]');
    if (elementsWithColor.length > 0) {
        suggestions.push('Verify color contrast ratios meet WCAG guidelines (4.5:1 for normal text)');
    }
    // Check for focus indicators
    if (document.querySelector('button, a, input, select, textarea') !== null) {
        suggestions.push('Ensure all interactive elements have visible focus indicators');
    }
    // Check for heading hierarchy
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length > 0) {
        const headingLevels = Array.from(headings).map(h => parseInt(h.tagName.charAt(1)));
        let previousLevel = 0;
        let hasSkippedLevel = false;
        let firstSkippedHeading = null;
        headingLevels.forEach((level, i) => {
            if (level > previousLevel + 1 && !firstSkippedHeading) {
                hasSkippedLevel = true;
                firstSkippedHeading = headings[i];
            }
            previousLevel = level;
        });
        if (hasSkippedLevel) {
            issues.push({
                type: 'Heading Hierarchy',
                message: 'Heading levels are not in proper order',
                severity: 'medium',
                selector: firstSkippedHeading ? (0,_utils__WEBPACK_IMPORTED_MODULE_0__.getCssSelector)(firstSkippedHeading) : undefined,
                htmlSnippet: firstSkippedHeading ? (0,_utils__WEBPACK_IMPORTED_MODULE_0__.getHtmlSnippet)(firstSkippedHeading) : undefined,
            });
            suggestions.push('Use heading levels in sequential order (h1, h2, h3, etc.)');
            score -= settings.headingHierarchyDeduction;
        }
    }
    return { score: Math.max(0, score), issues, suggestions };
}


/***/ }),
/* 3 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getCssSelector: () => (/* binding */ getCssSelector),
/* harmony export */   getHtmlSnippet: () => (/* binding */ getHtmlSnippet)
/* harmony export */ });
function getCssSelector(el) {
    const parts = [];
    let current = el;
    while (current && current !== document.documentElement) {
        let segment = current.tagName.toLowerCase();
        if (current.id) {
            segment += `#${current.id}`;
            parts.unshift(segment);
            break;
        }
        if (current.className) {
            const firstClass = current.className.trim().split(/\s+/)[0];
            if (firstClass)
                segment += `.${firstClass}`;
        }
        const parent = current.parentElement;
        if (parent) {
            const siblings = Array.from(parent.children).filter((c) => c.tagName === current.tagName);
            if (siblings.length > 1) {
                const index = siblings.indexOf(current) + 1;
                segment += `:nth-of-type(${index})`;
            }
        }
        parts.unshift(segment);
        current = current.parentElement;
    }
    return parts.join(' > ') || el.tagName.toLowerCase();
}
function getHtmlSnippet(el, maxLength = 120) {
    const raw = el.outerHTML;
    return raw.length > maxLength ? raw.slice(0, maxLength) + '\u2026' : raw;
}


/***/ }),
/* 4 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DEFAULT_SETTINGS: () => (/* binding */ DEFAULT_SETTINGS),
/* harmony export */   STORAGE_KEY: () => (/* binding */ STORAGE_KEY)
/* harmony export */ });
const STORAGE_KEY = 'analyzerSettings';
const DEFAULT_SETTINGS = {
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


/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   analyzeSEO: () => (/* binding */ analyzeSEO)
/* harmony export */ });
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);
/* harmony import */ var _shared_settings__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(4);


function analyzeSEO(settings = _shared_settings__WEBPACK_IMPORTED_MODULE_1__.DEFAULT_SETTINGS.seo) {
    const issues = [];
    const suggestions = [];
    let score = 100;
    // Check for page title
    const title = document.title;
    if (!title || title.trim() === '') {
        issues.push({
            type: 'Page Title',
            message: 'Page has no title',
            severity: 'high'
        });
        suggestions.push('Add a descriptive page title (50-60 characters recommended)');
        score -= 25; // TODO: expose as settings.noTitleDeduction
    }
    else if (title.length < settings.titleMinLength) {
        issues.push({
            type: 'Page Title',
            message: 'Page title is too short',
            severity: 'medium'
        });
        suggestions.push('Make page title more descriptive (50-60 characters recommended)');
        score -= 15;
    }
    else if (title.length > settings.titleMaxLength) {
        issues.push({
            type: 'Page Title',
            message: 'Page title is too long',
            severity: 'low'
        });
        suggestions.push('Shorten page title to 50-60 characters for better search results');
        score -= 5;
    }
    // Check for meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription || !metaDescription.getAttribute('content')) {
        issues.push({
            type: 'Meta Description',
            message: 'Missing meta description',
            severity: 'high'
        });
        suggestions.push('Add a meta description (150-160 characters recommended)');
        score -= 20; // TODO: expose as settings.noMetaDescDeduction
    }
    else {
        const content = metaDescription.getAttribute('content') || '';
        if (content.length < settings.metaDescMinLength) {
            issues.push({
                type: 'Meta Description',
                message: 'Meta description is too short',
                severity: 'medium'
            });
            suggestions.push('Expand meta description to 150-160 characters');
            score -= 10;
        }
        else if (content.length > settings.metaDescMaxLength) {
            issues.push({
                type: 'Meta Description',
                message: 'Meta description is too long',
                severity: 'low'
            });
            suggestions.push('Shorten meta description to 150-160 characters');
            score -= 5;
        }
    }
    // Check for H1 heading
    const h1Elements = document.querySelectorAll('h1');
    const h1Count = h1Elements.length;
    if (h1Count === 0) {
        issues.push({
            type: 'H1 Heading',
            message: 'No H1 heading found',
            severity: 'high'
        });
        suggestions.push('Add a main H1 heading to improve SEO and accessibility');
        score -= settings.noH1Deduction;
    }
    else if (h1Count > 1) {
        const firstH1 = h1Elements[0];
        issues.push({
            type: 'H1 Heading',
            message: `Multiple H1 headings found (${h1Count})`,
            severity: 'medium',
            selector: firstH1 ? (0,_utils__WEBPACK_IMPORTED_MODULE_0__.getCssSelector)(firstH1) : undefined,
            htmlSnippet: firstH1 ? (0,_utils__WEBPACK_IMPORTED_MODULE_0__.getHtmlSnippet)(firstH1) : undefined,
        });
        suggestions.push('Use only one H1 heading per page');
        score -= settings.multipleH1Deduction;
    }
    // Check for canonical URL
    const canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        suggestions.push('Consider adding a canonical URL to prevent duplicate content issues');
    }
    // Check for Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (!ogTitle || !ogDescription) {
        suggestions.push('Add Open Graph meta tags for better social media sharing');
    }
    return { score: Math.max(0, score), issues, suggestions };
}


/***/ }),
/* 6 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   analyzePerformance: () => (/* binding */ analyzePerformance)
/* harmony export */ });
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);
/* harmony import */ var _shared_settings__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(4);


function analyzePerformance(settings = _shared_settings__WEBPACK_IMPORTED_MODULE_1__.DEFAULT_SETTINGS.performance) {
    const issues = [];
    const suggestions = [];
    let score = 100;
    // Check for large images
    const images = document.querySelectorAll('img');
    const largeImages = Array.from(images).filter((img) => {
        return img.naturalWidth > settings.imageMaxWidth || img.naturalHeight > settings.imageMaxHeight;
    });
    if (largeImages.length > 0) {
        const firstLarge = largeImages[0];
        issues.push({
            type: 'Image Optimization',
            message: `${largeImages.length} images larger than ${settings.imageMaxWidth}x${settings.imageMaxHeight}`,
            severity: 'medium',
            selector: firstLarge ? (0,_utils__WEBPACK_IMPORTED_MODULE_0__.getCssSelector)(firstLarge) : undefined,
            htmlSnippet: firstLarge ? (0,_utils__WEBPACK_IMPORTED_MODULE_0__.getHtmlSnippet)(firstLarge) : undefined,
        });
        suggestions.push('Optimize large images and use appropriate formats (WebP, AVIF)');
        score -= Math.min(20, largeImages.length * 3);
    }
    // Check for images without loading attribute
    const imagesWithoutLoading = Array.from(images).filter(img => !img.getAttribute('loading'));
    if (imagesWithoutLoading.length > settings.lazyLoadThreshold) {
        issues.push({
            type: 'Lazy Loading',
            message: `${imagesWithoutLoading.length} images without lazy loading`,
            severity: 'low'
        });
        suggestions.push('Add loading="lazy" to images below the fold');
        score -= 10;
    }
    // Check for external resources
    const externalScripts = document.querySelectorAll('script[src^="http"]');
    const externalStyles = document.querySelectorAll('link[href^="http"]');
    const totalExternal = externalScripts.length + externalStyles.length;
    if (totalExternal > settings.externalResourcesThreshold) {
        issues.push({
            type: 'External Resources',
            message: `${totalExternal} external resources detected`,
            severity: 'medium'
        });
        suggestions.push('Consider bundling or reducing external resources to improve load times');
        score -= Math.min(15, (totalExternal - settings.externalResourcesThreshold) * 2); // TODO: expose cap (15) and per-resource deduction (2) as settings
    }
    // Check for inline styles
    const elementsWithInlineStyles = document.querySelectorAll('[style]');
    if (elementsWithInlineStyles.length > settings.inlineStylesThreshold) {
        issues.push({
            type: 'Inline Styles',
            message: `${elementsWithInlineStyles.length} elements with inline styles`,
            severity: 'low'
        });
        suggestions.push('Move inline styles to CSS files for better caching');
        score -= 5;
    }
    // Check for external links without proper attributes
    const externalLinks = Array.from(document.querySelectorAll('a[href^="http"]')).filter((link) => {
        const href = link.getAttribute('href');
        return href && !href.includes(window.location.hostname);
    });
    const externalLinksWithoutRel = externalLinks.filter((link) => !link.getAttribute('rel'));
    if (externalLinksWithoutRel.length > 0) {
        issues.push({
            type: 'External Links',
            message: `${externalLinksWithoutRel.length} external links without rel attributes`,
            severity: 'low'
        });
        suggestions.push('Add rel="noopener noreferrer" to external links for security and performance');
        score -= Math.min(settings.externalLinksDeductionCap, externalLinksWithoutRel.length);
    }
    if (score < 100) {
        suggestions.push('Consider using a Content Delivery Network (CDN) for static assets');
        suggestions.push('Enable gzip compression on your server');
        suggestions.push('Minify CSS and JavaScript files');
    }
    return { score: Math.max(0, score), issues, suggestions };
}


/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	const __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		const cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		const module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter/value functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			if(Array.isArray(definition)) {
/******/ 				var i = 0;
/******/ 				while(i < definition.length) {
/******/ 					var key = definition[i++];
/******/ 					var binding = definition[i++];
/******/ 					if(!__webpack_require__.o(exports, key)) {
/******/ 						if(binding === 0) {
/******/ 							Object.defineProperty(exports, key, { enumerable: true, value: definition[i++] });
/******/ 						} else {
/******/ 							Object.defineProperty(exports, key, { enumerable: true, get: binding });
/******/ 						}
/******/ 					} else if(binding === 0) { i++; }
/******/ 				}
/******/ 			} else {
/******/ 				for(var key in definition) {
/******/ 					if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 						Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 					}
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
let __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DEFAULT_SETTINGS: () => (/* reexport safe */ _shared_settings__WEBPACK_IMPORTED_MODULE_5__.DEFAULT_SETTINGS),
/* harmony export */   analyzeAccessibility: () => (/* reexport safe */ _content_analyzers_accessibility__WEBPACK_IMPORTED_MODULE_1__.analyzeAccessibility),
/* harmony export */   analyzePage: () => (/* binding */ analyzePage),
/* harmony export */   analyzePerformance: () => (/* reexport safe */ _content_analyzers_performance__WEBPACK_IMPORTED_MODULE_3__.analyzePerformance),
/* harmony export */   analyzeSEO: () => (/* reexport safe */ _content_analyzers_seo__WEBPACK_IMPORTED_MODULE_2__.analyzeSEO),
/* harmony export */   collectIssues: () => (/* binding */ collectIssues),
/* harmony export */   getCssSelector: () => (/* reexport safe */ _content_utils__WEBPACK_IMPORTED_MODULE_4__.getCssSelector),
/* harmony export */   getHtmlSnippet: () => (/* reexport safe */ _content_utils__WEBPACK_IMPORTED_MODULE_4__.getHtmlSnippet),
/* harmony export */   performQualityAnalysis: () => (/* reexport safe */ _content_analyze__WEBPACK_IMPORTED_MODULE_0__.performQualityAnalysis)
/* harmony export */ });
/* harmony import */ var _content_analyze__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var _content_analyzers_accessibility__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2);
/* harmony import */ var _content_analyzers_seo__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(5);
/* harmony import */ var _content_analyzers_performance__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(6);
/* harmony import */ var _content_utils__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(3);
/* harmony import */ var _shared_settings__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(4);
/**
 * Library entry point.
 *
 * The browser extension is one consumer of these analyzers, not their owner. Everything below
 * is pure DOM logic — no `browser.*`, no `chrome.*`, no extension lifecycle — so anything with
 * a live page can run it: a Playwright or Cypress spec, a headless-browser CI script, a
 * scratch console session.
 *
 * Bundled by `npm run build:lib` into `dist/lib/wqa.js` as a self-contained IIFE that assigns
 * `globalThis.WebQualityAnalyzer`. A test runner injects that file into a page and calls
 * `WebQualityAnalyzer.analyzePage()`.
 */








/**
 * Analyses the current page.
 *
 * The thresholds every check scores against are data, not constants, so a caller can tighten
 * or relax them without forking the analyzers. Overrides are merged per category over
 * {@link DEFAULT_SETTINGS}, so `{ seo: { enabled: false } }` disables SEO while leaving every
 * accessibility and performance threshold untouched.
 *
 * @example
 * // everything, default thresholds
 * const result = analyzePage();
 *
 * @example
 * // accessibility only
 * const a11y = analyzePage({
 *   seo: { enabled: false },
 *   performance: { enabled: false },
 * });
 */
function analyzePage(overrides = {}) {
    const settings = {
        accessibility: {
            ..._shared_settings__WEBPACK_IMPORTED_MODULE_5__.DEFAULT_SETTINGS.accessibility,
            ...overrides.accessibility,
        },
        seo: { ..._shared_settings__WEBPACK_IMPORTED_MODULE_5__.DEFAULT_SETTINGS.seo, ...overrides.seo },
        performance: { ..._shared_settings__WEBPACK_IMPORTED_MODULE_5__.DEFAULT_SETTINGS.performance, ...overrides.performance },
    };
    return (0,_content_analyze__WEBPACK_IMPORTED_MODULE_0__.performQualityAnalysis)(settings);
}
/**
 * Every issue found, flattened across categories and tagged with the category it came from.
 *
 * Assertions usually care about "which problems exist on this page", not the per-category
 * split — this saves every caller writing the same `Object.entries(...).flatMap(...)`.
 */
function collectIssues(result) {
    return Object.keys(result.categories).flatMap((category) => result.categories[category].issues.map((issue) => ({ ...issue, category })));
}

})();

WebQualityAnalyzer = __webpack_exports__;
/******/ })()
;