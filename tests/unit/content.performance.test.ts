import { analyzePerformance } from '../../src/content/analyzers/performance';
import {
  addImageWithDimensions,
  appendImgs,
  appendSpansWithStyle,
  appendExternalScripts,
  appendExternalLinks,
  appendExternalAnchors,
} from '../helpers/helpers';

beforeEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
});

// ══════════════════════════════════════════════════════════════════════════════
// analyzePerformance
// ══════════════════════════════════════════════════════════════════════════════
describe('analyzePerformance', () => {
  it('returns score 100 and no issues for a clean page', () => {
    const result = analyzePerformance();
    expect(result.score).toBe(100);
    expect(result.issues).toHaveLength(0);
  });

  it('returns no suggestions for a perfectly clean page (score 100)', () => {
    const result = analyzePerformance();
    expect(result.suggestions).not.toContain(
      'Consider using a Content Delivery Network (CDN) for static assets'
    );
    expect(result.suggestions).not.toContain('Enable gzip compression on your server');
    expect(result.suggestions).not.toContain('Minify CSS and JavaScript files');
  });

  it('includes three generic performance suggestions when the page has issues', () => {
    // 4 images without a loading attribute trigger the Lazy Loading issue (score < 100)
    appendImgs(4);
    const result = analyzePerformance();
    expect(result.suggestions).toContain(
      'Consider using a Content Delivery Network (CDN) for static assets'
    );
    expect(result.suggestions).toContain('Enable gzip compression on your server');
    expect(result.suggestions).toContain('Minify CSS and JavaScript files');
  });

  // ── Large images ────────────────────────────────────────────────────────────
  describe('large images', () => {
    it('flags images wider than 1920 pixels', () => {
      addImageWithDimensions(2000, 500);
      const issue = analyzePerformance().issues.find(
        (i) => i.type === 'Image Optimization'
      );
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe('medium');
    });

    it('flags images taller than 1080 pixels', () => {
      addImageWithDimensions(800, 1200);
      expect(
        analyzePerformance().issues.some((i) => i.type === 'Image Optimization')
      ).toBe(true);
    });

    it('does not flag images at exactly 1920 x 1080', () => {
      addImageWithDimensions(1920, 1080);
      expect(
        analyzePerformance().issues.some((i) => i.type === 'Image Optimization')
      ).toBe(false);
    });

    it('deducts 3 points per large image', () => {
      addImageWithDimensions(2000, 1200);
      addImageWithDimensions(3000, 2000);
      expect(analyzePerformance().score).toBe(100 - 2 * 3);
    });

    it('caps the large-image deduction at 20 points', () => {
      // 8 images x 3 = 24, capped at 20 -> score 80
      // (images carry loading="lazy" so the lazy-loading check does not fire)
      for (let i = 0; i < 8; i++) addImageWithDimensions(2000, 1200);
      expect(analyzePerformance().score).toBe(80);
    });

    it('sets selector on the Image Optimization issue', () => {
      addImageWithDimensions(2000, 1200);
      const issue = analyzePerformance().issues.find(
        (i) => i.type === 'Image Optimization'
      );
      expect(issue?.selector).toBeDefined();
      expect(typeof issue?.selector).toBe('string');
      expect((issue?.selector ?? '').length).toBeGreaterThan(0);
    });

    it('sets htmlSnippet on the Image Optimization issue', () => {
      addImageWithDimensions(2000, 1200);
      const issue = analyzePerformance().issues.find(
        (i) => i.type === 'Image Optimization'
      );
      expect(issue?.htmlSnippet).toBeDefined();
      expect(issue?.htmlSnippet).toContain('img');
    });

    it('adds a suggestion to optimise large images', () => {
      addImageWithDimensions(2000, 1200);
      expect(analyzePerformance().suggestions).toContain(
        'Optimize large images and use appropriate formats (WebP, AVIF)'
      );
    });

    it('reports the correct count of large images in the issue message', () => {
      addImageWithDimensions(2000, 1200);
      addImageWithDimensions(2500, 1500);
      const issue = analyzePerformance().issues.find(
        (i) => i.type === 'Image Optimization'
      );
      expect(issue?.message).toContain('2 images larger than 1920x1080');
    });
  });

  // ── Lazy loading ────────────────────────────────────────────────────────────
  describe('lazy loading', () => {
    it('does not flag 3 or fewer images without a loading attribute', () => {
      appendImgs(3);
      expect(
        analyzePerformance().issues.some((i) => i.type === 'Lazy Loading')
      ).toBe(false);
    });

    it('flags when more than 3 images lack the loading attribute', () => {
      appendImgs(4);
      const issue = analyzePerformance().issues.find(
        (i) => i.type === 'Lazy Loading'
      );
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe('low');
    });

    it('deducts 10 points when more than 3 images lack lazy loading', () => {
      appendImgs(5);
      expect(analyzePerformance().score).toBe(90);
    });

    it('does not flag images that already have a loading attribute', () => {
      for (let i = 0; i < 5; i++) {
        const img = document.createElement('img');
        img.src = 'x.jpg';
        img.setAttribute('loading', 'lazy');
        document.body.appendChild(img);
      }
      expect(
        analyzePerformance().issues.some((i) => i.type === 'Lazy Loading')
      ).toBe(false);
    });

    it('adds a suggestion to use lazy loading', () => {
      appendImgs(4);
      expect(analyzePerformance().suggestions).toContain(
        'Add loading="lazy" to images below the fold'
      );
    });
  });

  // ── External resources ──────────────────────────────────────────────────────
  describe('external resources', () => {
    it('does not flag 10 or fewer external scripts', () => {
      appendExternalScripts(10);
      expect(
        analyzePerformance().issues.some((i) => i.type === 'External Resources')
      ).toBe(false);
    });

    it('flags more than 10 external resources', () => {
      appendExternalScripts(11);
      const issue = analyzePerformance().issues.find(
        (i) => i.type === 'External Resources'
      );
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe('medium');
    });

    it('deducts 2 points per resource above 10', () => {
      // 12 scripts -> 2 above limit -> 2 x 2 = 4 deducted -> score 96
      appendExternalScripts(12);
      expect(analyzePerformance().score).toBe(96);
    });

    it('caps the external-resources deduction at 15 points', () => {
      // 20 scripts -> 10 above limit -> 10 x 2 = 20, capped at 15 -> score 85
      appendExternalScripts(20);
      expect(analyzePerformance().score).toBe(85);
    });

    it('counts external link elements as external resources', () => {
      appendExternalLinks(11);
      expect(
        analyzePerformance().issues.some((i) => i.type === 'External Resources')
      ).toBe(true);
    });

    it('includes the total count in the issue message', () => {
      appendExternalScripts(11);
      const issue = analyzePerformance().issues.find(
        (i) => i.type === 'External Resources'
      );
      expect(issue?.message).toContain('11 external resources');
    });
  });

  // ── Inline styles ───────────────────────────────────────────────────────────
  describe('inline styles', () => {
    it('does not flag 20 or fewer elements with inline styles', () => {
      appendSpansWithStyle(20);
      expect(
        analyzePerformance().issues.some((i) => i.type === 'Inline Styles')
      ).toBe(false);
    });

    it('flags more than 20 elements with inline styles', () => {
      appendSpansWithStyle(21);
      const issue = analyzePerformance().issues.find(
        (i) => i.type === 'Inline Styles'
      );
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe('low');
    });

    it('deducts 5 points for excessive inline styles', () => {
      appendSpansWithStyle(21);
      expect(analyzePerformance().score).toBe(95);
    });

    it('adds a suggestion to move inline styles to CSS', () => {
      appendSpansWithStyle(21);
      expect(analyzePerformance().suggestions).toContain(
        'Move inline styles to CSS files for better caching'
      );
    });
  });

  // ── External links ──────────────────────────────────────────────────────────
  describe('external links', () => {
    it('does not flag external links that have a rel attribute', () => {
      appendExternalAnchors(1, true);
      expect(
        analyzePerformance().issues.some((i) => i.type === 'External Links')
      ).toBe(false);
    });

    it('flags external links without a rel attribute', () => {
      appendExternalAnchors(1);
      const issue = analyzePerformance().issues.find(
        (i) => i.type === 'External Links'
      );
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe('low');
    });

    it('deducts 1 point per external link without rel', () => {
      appendExternalAnchors(2);
      expect(analyzePerformance().score).toBe(98);
    });

    it('caps the external-links deduction at 10 points', () => {
      appendExternalAnchors(11);
      expect(analyzePerformance().score).toBe(90);
    });

    it('does not count links to localhost as external (jsdom default hostname)', () => {
      const a = document.createElement('a');
      a.href = 'http://localhost/about';
      a.textContent = 'Internal';
      document.body.appendChild(a);
      expect(
        analyzePerformance().issues.some((i) => i.type === 'External Links')
      ).toBe(false);
    });

    it('adds a suggestion for security rel attributes', () => {
      appendExternalAnchors(1);
      expect(analyzePerformance().suggestions).toContain(
        'Add rel="noopener noreferrer" to external links for security and performance'
      );
    });

    it('reports the correct count in the issue message', () => {
      appendExternalAnchors(3);
      const issue = analyzePerformance().issues.find(
        (i) => i.type === 'External Links'
      );
      expect(issue?.message).toContain('3 external links');
    });
  });

  it('never returns a score below 0 with many simultaneous issues', () => {
    appendExternalScripts(20);
    appendImgs(5);
    appendSpansWithStyle(21);
    appendExternalAnchors(11);
    for (let i = 0; i < 8; i++) addImageWithDimensions(2000, 1200);
    expect(analyzePerformance().score).toBeGreaterThanOrEqual(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// analyzePerformance — custom settings
// ══════════════════════════════════════════════════════════════════════════════
import { DEFAULT_SETTINGS } from '../../src/shared/settings';

describe('analyzePerformance with custom settings', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('uses custom imageMaxWidth/imageMaxHeight', () => {
    addImageWithDimensions(800, 600);
    const result = analyzePerformance({
      ...DEFAULT_SETTINGS.performance,
      imageMaxWidth: 500,
      imageMaxHeight: 400,
    });
    const issue = result.issues.find((i) => i.type === 'Image Optimization');
    expect(issue).toBeDefined();
    expect(issue?.message).toContain('500x400');
  });

  it('does not flag image within custom threshold', () => {
    addImageWithDimensions(800, 600);
    const result = analyzePerformance({
      ...DEFAULT_SETTINGS.performance,
      imageMaxWidth: 1920,
      imageMaxHeight: 1080,
    });
    const issue = result.issues.find((i) => i.type === 'Image Optimization');
    expect(issue).toBeUndefined();
  });

  it('uses custom lazyLoadThreshold', () => {
    appendImgs(2);
    const result = analyzePerformance({
      ...DEFAULT_SETTINGS.performance,
      lazyLoadThreshold: 1,
    });
    const issue = result.issues.find((i) => i.type === 'Lazy Loading');
    expect(issue).toBeDefined();
  });

  it('does not flag lazy loading within custom threshold', () => {
    appendImgs(2);
    const result = analyzePerformance({
      ...DEFAULT_SETTINGS.performance,
      lazyLoadThreshold: 10,
    });
    const issue = result.issues.find((i) => i.type === 'Lazy Loading');
    expect(issue).toBeUndefined();
  });

  it('uses custom externalResourcesThreshold', () => {
    appendExternalScripts(5);
    const result = analyzePerformance({
      ...DEFAULT_SETTINGS.performance,
      externalResourcesThreshold: 3,
    });
    const issue = result.issues.find((i) => i.type === 'External Resources');
    expect(issue).toBeDefined();
  });

  it('uses custom inlineStylesThreshold', () => {
    appendSpansWithStyle(5);
    const result = analyzePerformance({
      ...DEFAULT_SETTINGS.performance,
      inlineStylesThreshold: 3,
    });
    const issue = result.issues.find((i) => i.type === 'Inline Styles');
    expect(issue).toBeDefined();
  });

  it('uses custom externalLinksDeductionCap', () => {
    appendExternalAnchors(20);
    const resultDefault = analyzePerformance(DEFAULT_SETTINGS.performance);
    const resultCapped = analyzePerformance({
      ...DEFAULT_SETTINGS.performance,
      externalLinksDeductionCap: 3,
    });
    // With cap=3 the deduction is smaller so score is higher
    expect(resultCapped.score).toBeGreaterThan(resultDefault.score);
  });
});
