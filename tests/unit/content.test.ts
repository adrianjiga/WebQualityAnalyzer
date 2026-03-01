import {
  analyzeAccessibility,
  analyzeSEO,
  analyzePerformance,
  performQualityAnalysis,
} from '../../src/content/content';

// ─── Message-listener capture ─────────────────────────────────────────────────
type MessageListener = (
  request: { action: string },
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
) => void;

let capturedMessageListener: MessageListener;

beforeAll(() => {
  capturedMessageListener = (
    chrome.runtime.onMessage.addListener as jest.Mock
  ).mock.calls[0][0] as MessageListener;
});

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

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

// ══════════════════════════════════════════════════════════════════════════════
// analyzeAccessibility
// ══════════════════════════════════════════════════════════════════════════════
describe('analyzeAccessibility', () => {
  it('returns score 100 and no issues for an empty page', () => {
    const result = analyzeAccessibility();
    expect(result.score).toBe(100);
    expect(result.issues).toHaveLength(0);
  });

  // ── Image alt text ──────────────────────────────────────────────────────────
  describe('image alt text', () => {
    it('flags an image with no alt attribute', () => {
      document.body.innerHTML = '<img src="test.jpg">';
      const result = analyzeAccessibility();
      const issue = result.issues.find((i) => i.type === 'Missing Alt Text');
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe('high');
      expect(issue?.message).toContain('1 images missing alt text');
    });

    it('flags an image with an empty alt attribute', () => {
      document.body.innerHTML = '<img src="test.jpg" alt="">';
      expect(
        analyzeAccessibility().issues.some((i) => i.type === 'Missing Alt Text')
      ).toBe(true);
    });

    it('flags an image with a whitespace-only alt attribute', () => {
      document.body.innerHTML = '<img src="test.jpg" alt="   ">';
      expect(
        analyzeAccessibility().issues.some((i) => i.type === 'Missing Alt Text')
      ).toBe(true);
    });

    it('does not flag an image with a descriptive alt attribute', () => {
      document.body.innerHTML = '<img src="test.jpg" alt="A dog playing">';
      expect(
        analyzeAccessibility().issues.some((i) => i.type === 'Missing Alt Text')
      ).toBe(false);
    });

    it('deducts 3 points per image without alt text', () => {
      document.body.innerHTML = '<img src="a.jpg"><img src="b.jpg">';
      expect(analyzeAccessibility().score).toBe(100 - 2 * 3);
    });

    it('caps the alt-text deduction at 25 points', () => {
      // 10 images x 3 = 30, capped at 25 -> score 75
      document.body.innerHTML = Array(10).fill('<img src="x.jpg">').join('');
      expect(analyzeAccessibility().score).toBe(75);
    });

    it('adds a suggestion to include alt text', () => {
      document.body.innerHTML = '<img src="test.jpg">';
      expect(analyzeAccessibility().suggestions).toContain(
        'Add descriptive alt text to all images for screen readers'
      );
    });

    it('includes the image src in the issue element field', () => {
      document.body.innerHTML = '<img src="http://example.com/photo.jpg">';
      const issue = analyzeAccessibility().issues.find(
        (i) => i.type === 'Missing Alt Text'
      );
      expect(issue?.element).toBe('http://example.com/photo.jpg');
    });

    it('reports the correct count when multiple images lack alt text', () => {
      document.body.innerHTML = Array(3).fill('<img src="x.jpg">').join('');
      const issue = analyzeAccessibility().issues.find(
        (i) => i.type === 'Missing Alt Text'
      );
      expect(issue?.message).toContain('3 images missing alt text');
    });
  });

  // ── Form labels ─────────────────────────────────────────────────────────────
  describe('form labels', () => {
    it('flags a text input with no label or aria-label', () => {
      document.body.innerHTML = '<input type="text">';
      const result = analyzeAccessibility();
      const issue = result.issues.find((i) => i.type === 'Form Accessibility');
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe('high');
    });

    it('flags an email input without a label', () => {
      document.body.innerHTML = '<input type="email">';
      expect(
        analyzeAccessibility().issues.some((i) => i.type === 'Form Accessibility')
      ).toBe(true);
    });

    it('flags a password input without a label', () => {
      document.body.innerHTML = '<input type="password">';
      expect(
        analyzeAccessibility().issues.some((i) => i.type === 'Form Accessibility')
      ).toBe(true);
    });

    it('flags a textarea without a label', () => {
      document.body.innerHTML = '<textarea></textarea>';
      expect(
        analyzeAccessibility().issues.some((i) => i.type === 'Form Accessibility')
      ).toBe(true);
    });

    it('flags a select without a label', () => {
      document.body.innerHTML = '<select><option>One</option></select>';
      expect(
        analyzeAccessibility().issues.some((i) => i.type === 'Form Accessibility')
      ).toBe(true);
    });

    it('does not flag an input that has a matching label[for]', () => {
      document.body.innerHTML =
        '<label for="name">Name</label><input type="text" id="name">';
      expect(
        analyzeAccessibility().issues.some((i) => i.type === 'Form Accessibility')
      ).toBe(false);
    });

    it('does not flag an input that has an aria-label attribute', () => {
      document.body.innerHTML = '<input type="text" aria-label="Search terms">';
      expect(
        analyzeAccessibility().issues.some((i) => i.type === 'Form Accessibility')
      ).toBe(false);
    });

    it('flags an input that has an id but no matching label element', () => {
      document.body.innerHTML = '<input type="text" id="orphan">';
      expect(
        analyzeAccessibility().issues.some((i) => i.type === 'Form Accessibility')
      ).toBe(true);
    });

    it('deducts 4 points per unlabelled input', () => {
      document.body.innerHTML = '<input type="text"><input type="text">';
      expect(analyzeAccessibility().score).toBe(100 - 2 * 4);
    });

    it('caps the label penalty at 20 points', () => {
      // 6 inputs x 4 = 24, capped at 20 -> score 80
      document.body.innerHTML = Array(6).fill('<input type="text">').join('');
      expect(analyzeAccessibility().score).toBe(80);
    });

    it('adds a suggestion to add form labels', () => {
      document.body.innerHTML = '<input type="text">';
      expect(analyzeAccessibility().suggestions).toContain(
        'Add labels or aria-label attributes to all form inputs'
      );
    });

    it('includes the tag name in the issue element field', () => {
      document.body.innerHTML = '<input type="text">';
      const issue = analyzeAccessibility().issues.find(
        (i) => i.type === 'Form Accessibility'
      );
      expect(issue?.element).toContain('INPUT');
    });
  });

  // ── Heading hierarchy ───────────────────────────────────────────────────────
  describe('heading hierarchy', () => {
    it('does not flag a sequential heading structure (h1 -> h2 -> h3)', () => {
      document.body.innerHTML =
        '<h1>Title</h1><h2>Section</h2><h3>Sub</h3>';
      expect(
        analyzeAccessibility().issues.some(
          (i) => i.type === 'Heading Hierarchy'
        )
      ).toBe(false);
    });

    it('flags headings that skip a level (h1 -> h3)', () => {
      document.body.innerHTML = '<h1>Title</h1><h3>Skipped</h3>';
      const issue = analyzeAccessibility().issues.find(
        (i) => i.type === 'Heading Hierarchy'
      );
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe('medium');
      expect(issue?.message).toBe('Heading levels are not in proper order');
    });

    it('flags headings that skip multiple levels (h1 -> h4)', () => {
      document.body.innerHTML = '<h1>Title</h1><h4>Deep</h4>';
      expect(
        analyzeAccessibility().issues.some(
          (i) => i.type === 'Heading Hierarchy'
        )
      ).toBe(true);
    });

    it('deducts 10 points for heading hierarchy issues', () => {
      document.body.innerHTML = '<h1>Title</h1><h3>Skip</h3>';
      expect(analyzeAccessibility().score).toBe(90);
    });

    it('adds a suggestion for correct heading order', () => {
      document.body.innerHTML = '<h1>Title</h1><h3>Skip</h3>';
      expect(analyzeAccessibility().suggestions).toContain(
        'Use heading levels in sequential order (h1, h2, h3, etc.)'
      );
    });

    it('does not flag a page with no headings', () => {
      document.body.innerHTML = '<p>Just a paragraph</p>';
      expect(
        analyzeAccessibility().issues.some(
          (i) => i.type === 'Heading Hierarchy'
        )
      ).toBe(false);
    });

    it('does not flag a lone h1 heading', () => {
      document.body.innerHTML = '<h1>Only Heading</h1>';
      expect(
        analyzeAccessibility().issues.some(
          (i) => i.type === 'Heading Hierarchy'
        )
      ).toBe(false);
    });

    it('does not flag sibling headings at the same level (h2 -> h2)', () => {
      document.body.innerHTML =
        '<h1>Title</h1><h2>First</h2><h2>Second</h2>';
      expect(
        analyzeAccessibility().issues.some(
          (i) => i.type === 'Heading Hierarchy'
        )
      ).toBe(false);
    });
  });

  // ── Colour-contrast and focus suggestions ───────────────────────────────────
  describe('colour-contrast and focus-indicator suggestions', () => {
    it('adds colour-contrast suggestion when inline colour styles exist', () => {
      document.body.innerHTML = '<span style="color: red">Coloured</span>';
      expect(analyzeAccessibility().suggestions).toContain(
        'Verify color contrast ratios meet WCAG guidelines (4.5:1 for normal text)'
      );
    });

    it('does not add colour-contrast suggestion without inline colour styles', () => {
      document.body.innerHTML = '<p>Plain text</p>';
      expect(analyzeAccessibility().suggestions).not.toContain(
        'Verify color contrast ratios meet WCAG guidelines (4.5:1 for normal text)'
      );
    });

    it('adds focus-indicator suggestion when interactive elements are present', () => {
      document.body.innerHTML = '<button>Click me</button>';
      expect(analyzeAccessibility().suggestions).toContain(
        'Ensure all interactive elements have visible focus indicators'
      );
    });

    it('adds focus-indicator suggestion for anchor elements', () => {
      document.body.innerHTML = '<a href="#">Link</a>';
      expect(analyzeAccessibility().suggestions).toContain(
        'Ensure all interactive elements have visible focus indicators'
      );
    });

    it('does not add focus-indicator suggestion on a page with no interactive elements', () => {
      document.body.innerHTML = '<p>No buttons here</p>';
      expect(analyzeAccessibility().suggestions).not.toContain(
        'Ensure all interactive elements have visible focus indicators'
      );
    });
  });

  // ── Score floor ─────────────────────────────────────────────────────────────
  it('never returns a score below 0', () => {
    document.body.innerHTML =
      Array(20).fill('<img src="x.jpg">').join('') +
      Array(10).fill('<input type="text">').join('') +
      '<h1>A</h1><h4>B</h4>';
    expect(analyzeAccessibility().score).toBeGreaterThanOrEqual(0);
  });

  it('accumulates penalties from multiple issue types', () => {
    // 1 image without alt (-3) + 1 input without label (-4) = score 93
    document.body.innerHTML = '<img src="x.jpg"><input type="text">';
    expect(analyzeAccessibility().score).toBe(93);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// analyzeSEO
// ══════════════════════════════════════════════════════════════════════════════
describe('analyzeSEO', () => {
  // NOTE: Always set document.title AFTER document.head.innerHTML, because
  // assigning to head.innerHTML removes any existing <title> element, which
  // makes document.title return '' regardless of the earlier assignment.
  const GOOD_TITLE = 'A Good Page Title Here'; // 22 chars (within 10-60)
  const GOOD_META = 'A'.repeat(130);            // 130 chars (within 120-160)

  function setupIdealSEOPage(): void {
    document.head.innerHTML =
      '<meta name="description" content="' + GOOD_META + '">' +
      '<link rel="canonical" href="https://example.com/">' +
      '<meta property="og:title" content="Title">' +
      '<meta property="og:description" content="Description">';
    document.title = GOOD_TITLE; // must be set AFTER head.innerHTML
    document.body.innerHTML = '<h1>Main Heading</h1>';
  }

  it('returns score 100 and no issues for a fully-optimised page', () => {
    setupIdealSEOPage();
    const result = analyzeSEO();
    expect(result.score).toBe(100);
    expect(result.issues).toHaveLength(0);
  });

  // ── Page title ──────────────────────────────────────────────────────────────
  describe('page title', () => {
    it('deducts 25 points for a missing title', () => {
      document.head.innerHTML =
        '<meta name="description" content="' + GOOD_META + '">';
      // title remains '' (no document.title assignment)
      document.body.innerHTML = '<h1>Main Heading</h1>';
      const result = analyzeSEO();
      const issue = result.issues.find((i) => i.type === 'Page Title');
      expect(issue?.message).toBe('Page has no title');
      expect(issue?.severity).toBe('high');
      expect(result.score).toBe(75);
    });

    it('deducts 15 points for a title shorter than 10 characters', () => {
      document.head.innerHTML =
        '<meta name="description" content="' + GOOD_META + '">';
      document.title = 'Short'; // 5 chars - set AFTER head.innerHTML
      document.body.innerHTML = '<h1>Main Heading</h1>';
      const result = analyzeSEO();
      const issue = result.issues.find((i) => i.type === 'Page Title');
      expect(issue?.message).toBe('Page title is too short');
      expect(issue?.severity).toBe('medium');
      expect(result.score).toBe(85);
    });

    it('deducts 5 points for a title longer than 60 characters', () => {
      document.head.innerHTML =
        '<meta name="description" content="' + GOOD_META + '">';
      document.title = 'A'.repeat(61); // set AFTER head.innerHTML
      document.body.innerHTML = '<h1>Main Heading</h1>';
      const result = analyzeSEO();
      const issue = result.issues.find((i) => i.type === 'Page Title');
      expect(issue?.message).toBe('Page title is too long');
      expect(issue?.severity).toBe('low');
      expect(result.score).toBe(95);
    });

    it('does not flag a title of exactly 10 characters', () => {
      document.head.innerHTML =
        '<meta name="description" content="' + GOOD_META + '">';
      document.title = 'A'.repeat(10); // set AFTER head.innerHTML
      document.body.innerHTML = '<h1>Main Heading</h1>';
      expect(analyzeSEO().issues.some((i) => i.type === 'Page Title')).toBe(false);
    });

    it('does not flag a title of exactly 60 characters', () => {
      document.head.innerHTML =
        '<meta name="description" content="' + GOOD_META + '">';
      document.title = 'A'.repeat(60); // set AFTER head.innerHTML
      document.body.innerHTML = '<h1>Main Heading</h1>';
      expect(analyzeSEO().issues.some((i) => i.type === 'Page Title')).toBe(false);
    });
  });

  // ── Meta description ────────────────────────────────────────────────────────
  describe('meta description', () => {
    it('deducts 20 points for a missing meta description', () => {
      document.title = GOOD_TITLE; // no head.innerHTML override follows
      document.body.innerHTML = '<h1>Main Heading</h1>';
      const result = analyzeSEO();
      const issue = result.issues.find((i) => i.type === 'Meta Description');
      expect(issue?.message).toBe('Missing meta description');
      expect(issue?.severity).toBe('high');
    });

    it('deducts 20 points when the meta description has no content attribute', () => {
      document.head.innerHTML = '<meta name="description">';
      document.title = GOOD_TITLE; // set AFTER head.innerHTML
      document.body.innerHTML = '<h1>Main Heading</h1>';
      expect(
        analyzeSEO().issues.some(
          (i) =>
            i.type === 'Meta Description' &&
            i.message === 'Missing meta description'
        )
      ).toBe(true);
    });

    it('deducts 10 points for a meta description shorter than 120 characters', () => {
      document.head.innerHTML =
        '<meta name="description" content="' + 'A'.repeat(50) + '">';
      document.title = GOOD_TITLE; // set AFTER head.innerHTML
      document.body.innerHTML = '<h1>Main Heading</h1>';
      const result = analyzeSEO();
      const issue = result.issues.find((i) => i.type === 'Meta Description');
      expect(issue?.message).toBe('Meta description is too short');
      expect(issue?.severity).toBe('medium');
      expect(result.score).toBe(90);
    });

    it('deducts 5 points for a meta description longer than 160 characters', () => {
      document.head.innerHTML =
        '<meta name="description" content="' + 'A'.repeat(170) + '">';
      document.title = GOOD_TITLE; // set AFTER head.innerHTML
      document.body.innerHTML = '<h1>Main Heading</h1>';
      const result = analyzeSEO();
      const issue = result.issues.find((i) => i.type === 'Meta Description');
      expect(issue?.message).toBe('Meta description is too long');
      expect(issue?.severity).toBe('low');
      expect(result.score).toBe(95);
    });

    it('does not flag a meta description of exactly 120 characters', () => {
      document.head.innerHTML =
        '<meta name="description" content="' + 'A'.repeat(120) + '">';
      document.title = GOOD_TITLE;
      document.body.innerHTML = '<h1>Main Heading</h1>';
      expect(analyzeSEO().issues.some((i) => i.type === 'Meta Description')).toBe(false);
    });

    it('does not flag a meta description of exactly 160 characters', () => {
      document.head.innerHTML =
        '<meta name="description" content="' + 'A'.repeat(160) + '">';
      document.title = GOOD_TITLE;
      document.body.innerHTML = '<h1>Main Heading</h1>';
      expect(analyzeSEO().issues.some((i) => i.type === 'Meta Description')).toBe(false);
    });
  });

  // ── H1 heading ──────────────────────────────────────────────────────────────
  describe('H1 heading', () => {
    it('deducts 20 points when there is no H1', () => {
      document.head.innerHTML =
        '<meta name="description" content="' + GOOD_META + '">';
      document.title = GOOD_TITLE; // set AFTER head.innerHTML
      const result = analyzeSEO();
      const issue = result.issues.find((i) => i.type === 'H1 Heading');
      expect(issue?.message).toBe('No H1 heading found');
      expect(issue?.severity).toBe('high');
      expect(result.score).toBe(80);
    });

    it('deducts 15 points for multiple H1 headings', () => {
      document.head.innerHTML =
        '<meta name="description" content="' + GOOD_META + '">';
      document.title = GOOD_TITLE; // set AFTER head.innerHTML
      document.body.innerHTML = '<h1>First</h1><h1>Second</h1>';
      const result = analyzeSEO();
      const issue = result.issues.find((i) => i.type === 'H1 Heading');
      expect(issue?.message).toContain('Multiple H1 headings found (2)');
      expect(issue?.severity).toBe('medium');
      expect(result.score).toBe(85);
    });

    it('does not flag exactly one H1 heading', () => {
      document.head.innerHTML =
        '<meta name="description" content="' + GOOD_META + '">';
      document.title = GOOD_TITLE;
      document.body.innerHTML = '<h1>Just One</h1>';
      expect(analyzeSEO().issues.some((i) => i.type === 'H1 Heading')).toBe(false);
    });
  });

  // ── Canonical and Open Graph suggestions ────────────────────────────────────
  describe('canonical and Open Graph suggestions', () => {
    it('suggests adding a canonical URL when none exists', () => {
      setupIdealSEOPage();
      document.querySelector('link[rel="canonical"]')?.remove();
      expect(analyzeSEO().suggestions).toContain(
        'Consider adding a canonical URL to prevent duplicate content issues'
      );
    });

    it('does not suggest canonical when a canonical link is present', () => {
      setupIdealSEOPage();
      expect(analyzeSEO().suggestions).not.toContain(
        'Consider adding a canonical URL to prevent duplicate content issues'
      );
    });

    it('suggests Open Graph tags when og:title is missing', () => {
      setupIdealSEOPage();
      document.querySelector('meta[property="og:title"]')?.remove();
      expect(analyzeSEO().suggestions).toContain(
        'Add Open Graph meta tags for better social media sharing'
      );
    });

    it('suggests Open Graph tags when og:description is missing', () => {
      setupIdealSEOPage();
      document.querySelector('meta[property="og:description"]')?.remove();
      expect(analyzeSEO().suggestions).toContain(
        'Add Open Graph meta tags for better social media sharing'
      );
    });

    it('does not suggest Open Graph when both og tags are present', () => {
      setupIdealSEOPage();
      expect(analyzeSEO().suggestions).not.toContain(
        'Add Open Graph meta tags for better social media sharing'
      );
    });
  });

  it('never returns a score below 0', () => {
    // Missing title (-25) + missing meta (-20) + no H1 (-20) = -65; capped at 0
    expect(analyzeSEO().score).toBeGreaterThanOrEqual(0);
  });
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

  it('always includes three generic performance suggestions', () => {
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

// ══════════════════════════════════════════════════════════════════════════════
// performQualityAnalysis
// ══════════════════════════════════════════════════════════════════════════════
describe('performQualityAnalysis', () => {
  it('overall score equals the rounded average of the three category scores', () => {
    document.head.innerHTML =
      '<meta name="description" content="' + 'A'.repeat(130) + '">';
    document.title = 'A Good Title Here';
    document.body.innerHTML = '<h1>Main</h1>';

    const result = performQualityAnalysis();
    const expected = Math.round(
      (result.categories.accessibility.score +
        result.categories.seo.score +
        result.categories.performance.score) /
        3
    );
    expect(result.score).toBe(expected);
  });

  it('pageInfo.url matches window.location.href', () => {
    const result = performQualityAnalysis();
    expect(result.pageInfo.url).toBe(window.location.href);
  });

  it('pageInfo.title matches document.title', () => {
    document.title = 'Test Page Title';
    expect(performQualityAnalysis().pageInfo.title).toBe('Test Page Title');
  });

  it('pageInfo.timestamp is a valid ISO 8601 string', () => {
    const result = performQualityAnalysis();
    expect(new Date(result.pageInfo.timestamp).toISOString()).toBe(
      result.pageInfo.timestamp
    );
  });

  it('returns all three category results', () => {
    const result = performQualityAnalysis();
    expect(result.categories.accessibility).toBeDefined();
    expect(result.categories.seo).toBeDefined();
    expect(result.categories.performance).toBeDefined();
  });

  it('returns a score in the 0-100 range', () => {
    const result = performQualityAnalysis();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('each category has a numeric score, issues array, and suggestions array', () => {
    const result = performQualityAnalysis();
    for (const key of ['accessibility', 'seo', 'performance'] as const) {
      const cat = result.categories[key];
      expect(typeof cat.score).toBe('number');
      expect(Array.isArray(cat.issues)).toBe(true);
      expect(Array.isArray(cat.suggestions)).toBe(true);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Chrome message listener
// ══════════════════════════════════════════════════════════════════════════════
describe('Chrome message listener', () => {
  it('is registered on module load (captured listener is a function)', () => {
    expect(typeof capturedMessageListener).toBe('function');
  });

  it('calls sendResponse with a full AnalysisResult when action is "analyze"', () => {
    const sendResponse = jest.fn();
    capturedMessageListener(
      { action: 'analyze' },
      {} as chrome.runtime.MessageSender,
      sendResponse
    );
    expect(sendResponse).toHaveBeenCalledTimes(1);
    const response = sendResponse.mock.calls[0][0] as ReturnType<
      typeof performQualityAnalysis
    >;
    expect(response).toHaveProperty('score');
    expect(response).toHaveProperty('pageInfo');
    expect(response).toHaveProperty('categories');
  });

  it('does not call sendResponse for unknown action types', () => {
    const sendResponse = jest.fn();
    capturedMessageListener(
      { action: 'unknown-action' },
      {} as chrome.runtime.MessageSender,
      sendResponse
    );
    expect(sendResponse).not.toHaveBeenCalled();
  });
});
