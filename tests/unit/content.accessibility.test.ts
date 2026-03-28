import { analyzeAccessibility } from '../../src/content/analyzers/accessibility';

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

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

    it('sets selector on the Missing Alt Text issue', () => {
      const img = document.createElement('img');
      img.src = 'test.jpg';
      document.body.appendChild(img);
      const issue = analyzeAccessibility().issues.find(
        (i) => i.type === 'Missing Alt Text'
      );
      expect(issue?.selector).toBeDefined();
      expect(typeof issue?.selector).toBe('string');
      expect((issue?.selector ?? '').length).toBeGreaterThan(0);
    });

    it('sets htmlSnippet on the Missing Alt Text issue', () => {
      const img = document.createElement('img');
      img.src = 'test.jpg';
      document.body.appendChild(img);
      const issue = analyzeAccessibility().issues.find(
        (i) => i.type === 'Missing Alt Text'
      );
      expect(issue?.htmlSnippet).toBeDefined();
      expect(issue?.htmlSnippet).toContain('img');
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

    it('sets selector on the Form Accessibility issue', () => {
      const input = document.createElement('input');
      input.type = 'text';
      document.body.appendChild(input);
      const issue = analyzeAccessibility().issues.find(
        (i) => i.type === 'Form Accessibility'
      );
      expect(issue?.selector).toBeDefined();
      expect(typeof issue?.selector).toBe('string');
      expect((issue?.selector ?? '').length).toBeGreaterThan(0);
    });

    it('sets htmlSnippet on the Form Accessibility issue', () => {
      const input = document.createElement('input');
      input.type = 'text';
      document.body.appendChild(input);
      const issue = analyzeAccessibility().issues.find(
        (i) => i.type === 'Form Accessibility'
      );
      expect(issue?.htmlSnippet).toBeDefined();
      expect(issue?.htmlSnippet).toContain('input');
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
