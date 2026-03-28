import { analyzePerformance } from '../../src/content/analyzers/performance';

// ─── Helper ───────────────────────────────────────────────────────────────────
// jsdom always reports naturalWidth/naturalHeight as 0; override per element.
// loading="lazy" prevents the unrelated lazy-loading check from firing when
// many of these images are added in the same test.
function addImageWithDimensions(
  naturalWidth: number,
  naturalHeight: number,
  src = 'http://example.com/image.jpg'
): HTMLImageElement {
  const img = document.createElement('img');
  img.src = src;
  img.setAttribute('loading', 'lazy');
  Object.defineProperty(img, 'naturalWidth', {
    get: () => naturalWidth,
    configurable: true,
  });
  Object.defineProperty(img, 'naturalHeight', {
    get: () => naturalHeight,
    configurable: true,
  });
  document.body.appendChild(img);
  return img;
}

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
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
    for (let i = 0; i < 4; i++) {
      const img = document.createElement('img');
      img.src = 'x.jpg';
      document.body.appendChild(img);
    }
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

    it('includes the image src in the issue element field', () => {
      addImageWithDimensions(2000, 1200, 'http://example.com/big.jpg');
      const issue = analyzePerformance().issues.find(
        (i) => i.type === 'Image Optimization'
      );
      expect(issue?.element).toBe('http://example.com/big.jpg');
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
      document.body.innerHTML = Array(3).fill('<img src="x.jpg">').join('');
      expect(
        analyzePerformance().issues.some((i) => i.type === 'Lazy Loading')
      ).toBe(false);
    });

    it('flags when more than 3 images lack the loading attribute', () => {
      document.body.innerHTML = Array(4).fill('<img src="x.jpg">').join('');
      const issue = analyzePerformance().issues.find(
        (i) => i.type === 'Lazy Loading'
      );
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe('low');
    });

    it('deducts 10 points when more than 3 images lack lazy loading', () => {
      document.body.innerHTML = Array(5).fill('<img src="x.jpg">').join('');
      expect(analyzePerformance().score).toBe(90);
    });

    it('does not flag images that already have a loading attribute', () => {
      document.body.innerHTML = Array(5)
        .fill('<img src="x.jpg" loading="lazy">')
        .join('');
      expect(
        analyzePerformance().issues.some((i) => i.type === 'Lazy Loading')
      ).toBe(false);
    });

    it('adds a suggestion to use lazy loading', () => {
      document.body.innerHTML = Array(4).fill('<img src="x.jpg">').join('');
      expect(analyzePerformance().suggestions).toContain(
        'Add loading="lazy" to images below the fold'
      );
    });
  });

  // ── External resources ──────────────────────────────────────────────────────
  describe('external resources', () => {
    it('does not flag 10 or fewer external scripts', () => {
      document.head.innerHTML = Array(10)
        .fill('<script src="http://cdn.example.com/lib.js"></script>')
        .join('');
      expect(
        analyzePerformance().issues.some((i) => i.type === 'External Resources')
      ).toBe(false);
    });

    it('flags more than 10 external resources', () => {
      document.head.innerHTML = Array(11)
        .fill('<script src="http://cdn.example.com/lib.js"></script>')
        .join('');
      const issue = analyzePerformance().issues.find(
        (i) => i.type === 'External Resources'
      );
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe('medium');
    });

    it('deducts 2 points per resource above 10', () => {
      // 12 scripts -> 2 above limit -> 2 x 2 = 4 deducted -> score 96
      document.head.innerHTML = Array(12)
        .fill('<script src="http://cdn.example.com/lib.js"></script>')
        .join('');
      expect(analyzePerformance().score).toBe(96);
    });

    it('caps the external-resources deduction at 15 points', () => {
      // 20 scripts -> 10 above limit -> 10 x 2 = 20, capped at 15 -> score 85
      document.head.innerHTML = Array(20)
        .fill('<script src="http://cdn.example.com/lib.js"></script>')
        .join('');
      expect(analyzePerformance().score).toBe(85);
    });

    it('counts external link elements as external resources', () => {
      document.head.innerHTML = Array(11)
        .fill('<link href="http://cdn.example.com/style.css">')
        .join('');
      expect(
        analyzePerformance().issues.some((i) => i.type === 'External Resources')
      ).toBe(true);
    });

    it('includes the total count in the issue message', () => {
      document.head.innerHTML = Array(11)
        .fill('<script src="http://cdn.example.com/lib.js"></script>')
        .join('');
      const issue = analyzePerformance().issues.find(
        (i) => i.type === 'External Resources'
      );
      expect(issue?.message).toContain('11 external resources');
    });
  });

  // ── Inline styles ───────────────────────────────────────────────────────────
  describe('inline styles', () => {
    it('does not flag 20 or fewer elements with inline styles', () => {
      document.body.innerHTML = Array(20)
        .fill('<span style="color:red"></span>')
        .join('');
      expect(
        analyzePerformance().issues.some((i) => i.type === 'Inline Styles')
      ).toBe(false);
    });

    it('flags more than 20 elements with inline styles', () => {
      document.body.innerHTML = Array(21)
        .fill('<span style="color:red"></span>')
        .join('');
      const issue = analyzePerformance().issues.find(
        (i) => i.type === 'Inline Styles'
      );
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe('low');
    });

    it('deducts 5 points for excessive inline styles', () => {
      document.body.innerHTML = Array(21)
        .fill('<span style="color:red"></span>')
        .join('');
      expect(analyzePerformance().score).toBe(95);
    });

    it('adds a suggestion to move inline styles to CSS', () => {
      document.body.innerHTML = Array(21)
        .fill('<span style="color:red"></span>')
        .join('');
      expect(analyzePerformance().suggestions).toContain(
        'Move inline styles to CSS files for better caching'
      );
    });
  });

  // ── External links ──────────────────────────────────────────────────────────
  describe('external links', () => {
    it('does not flag external links that have a rel attribute', () => {
      document.body.innerHTML =
        '<a href="http://example.com" rel="noopener noreferrer">link</a>';
      expect(
        analyzePerformance().issues.some((i) => i.type === 'External Links')
      ).toBe(false);
    });

    it('flags external links without a rel attribute', () => {
      document.body.innerHTML = '<a href="http://example.com">link</a>';
      const issue = analyzePerformance().issues.find(
        (i) => i.type === 'External Links'
      );
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe('low');
    });

    it('deducts 1 point per external link without rel', () => {
      document.body.innerHTML =
        '<a href="http://example.com">one</a>' +
        '<a href="http://other.com">two</a>';
      expect(analyzePerformance().score).toBe(98);
    });

    it('caps the external-links deduction at 10 points', () => {
      document.body.innerHTML = Array(11)
        .fill('<a href="http://example.com">link</a>')
        .join('');
      expect(analyzePerformance().score).toBe(90);
    });

    it('does not count links to localhost as external (jsdom default hostname)', () => {
      document.body.innerHTML =
        '<a href="http://localhost/about">Internal</a>';
      expect(
        analyzePerformance().issues.some((i) => i.type === 'External Links')
      ).toBe(false);
    });

    it('adds a suggestion for security rel attributes', () => {
      document.body.innerHTML = '<a href="http://example.com">unsafe</a>';
      expect(analyzePerformance().suggestions).toContain(
        'Add rel="noopener noreferrer" to external links for security and performance'
      );
    });

    it('reports the correct count in the issue message', () => {
      document.body.innerHTML =
        '<a href="http://a.com">one</a>' +
        '<a href="http://b.com">two</a>' +
        '<a href="http://c.com">three</a>';
      const issue = analyzePerformance().issues.find(
        (i) => i.type === 'External Links'
      );
      expect(issue?.message).toContain('3 external links');
    });
  });

  it('never returns a score below 0 with many simultaneous issues', () => {
    document.head.innerHTML = Array(20)
      .fill('<script src="http://cdn.example.com/lib.js"></script>')
      .join('');
    document.body.innerHTML =
      Array(5).fill('<img src="x.jpg">').join('') +
      Array(21).fill('<span style="color:red"></span>').join('') +
      Array(11).fill('<a href="http://example.com">link</a>').join('');
    for (let i = 0; i < 8; i++) addImageWithDimensions(2000, 1200);
    expect(analyzePerformance().score).toBeGreaterThanOrEqual(0);
  });
});
