import { analyzeSEO } from '../../src/content/content';

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
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
