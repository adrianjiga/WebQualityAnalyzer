import { analyzeAccessibility } from '../../src/content/analyzers/accessibility';
import { appendImg, appendInput, appendHeading } from '../helpers/helpers';

beforeEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
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
      appendImg('test.jpg');
      const result = analyzeAccessibility();
      const issue = result.issues.find((i) => i.type === 'Missing Alt Text');
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe('high');
      expect(issue?.message).toContain('1 images missing alt text');
    });

    it('flags an image with an empty alt attribute', () => {
      appendImg('test.jpg', '');
      expect(
        analyzeAccessibility().issues.some((i) => i.type === 'Missing Alt Text')
      ).toBe(true);
    });

    it('flags an image with a whitespace-only alt attribute', () => {
      appendImg('test.jpg', '   ');
      expect(
        analyzeAccessibility().issues.some((i) => i.type === 'Missing Alt Text')
      ).toBe(true);
    });

    it('does not flag an image with a descriptive alt attribute', () => {
      appendImg('test.jpg', 'A dog playing');
      expect(
        analyzeAccessibility().issues.some((i) => i.type === 'Missing Alt Text')
      ).toBe(false);
    });

    it('deducts 3 points per image without alt text', () => {
      appendImg('a.jpg');
      appendImg('b.jpg');
      expect(analyzeAccessibility().score).toBe(100 - 2 * 3);
    });

    it('caps the alt-text deduction at 25 points', () => {
      // 10 images x 3 = 30, capped at 25 -> score 75
      for (let i = 0; i < 10; i++) appendImg('x.jpg');
      expect(analyzeAccessibility().score).toBe(75);
    });

    it('adds a suggestion to include alt text', () => {
      appendImg('test.jpg');
      expect(analyzeAccessibility().suggestions).toContain(
        'Add descriptive alt text to all images for screen readers'
      );
    });

    it('sets selector on the Missing Alt Text issue', () => {
      appendImg('test.jpg');
      const issue = analyzeAccessibility().issues.find(
        (i) => i.type === 'Missing Alt Text'
      );
      expect(issue?.selector).toBeDefined();
      expect(typeof issue?.selector).toBe('string');
      expect((issue?.selector ?? '').length).toBeGreaterThan(0);
    });

    it('sets htmlSnippet on the Missing Alt Text issue', () => {
      appendImg('test.jpg');
      const issue = analyzeAccessibility().issues.find(
        (i) => i.type === 'Missing Alt Text'
      );
      expect(issue?.htmlSnippet).toBeDefined();
      expect(issue?.htmlSnippet).toContain('img');
    });

    it('reports the correct count when multiple images lack alt text', () => {
      for (let i = 0; i < 3; i++) appendImg('x.jpg');
      const issue = analyzeAccessibility().issues.find(
        (i) => i.type === 'Missing Alt Text'
      );
      expect(issue?.message).toContain('3 images missing alt text');
    });
  });

  // ── Form labels ─────────────────────────────────────────────────────────────
  describe('form labels', () => {
    it('flags a text input with no label or aria-label', () => {
      appendInput('text');
      const result = analyzeAccessibility();
      const issue = result.issues.find((i) => i.type === 'Form Accessibility');
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe('high');
    });

    it('flags an email input without a label', () => {
      appendInput('email');
      expect(
        analyzeAccessibility().issues.some((i) => i.type === 'Form Accessibility')
      ).toBe(true);
    });

    it('flags a password input without a label', () => {
      appendInput('password');
      expect(
        analyzeAccessibility().issues.some((i) => i.type === 'Form Accessibility')
      ).toBe(true);
    });

    it('flags a textarea without a label', () => {
      const ta = document.createElement('textarea');
      document.body.appendChild(ta);
      expect(
        analyzeAccessibility().issues.some((i) => i.type === 'Form Accessibility')
      ).toBe(true);
    });

    it('flags a select without a label', () => {
      const sel = document.createElement('select');
      const opt = document.createElement('option');
      opt.textContent = 'One';
      sel.appendChild(opt);
      document.body.appendChild(sel);
      expect(
        analyzeAccessibility().issues.some((i) => i.type === 'Form Accessibility')
      ).toBe(true);
    });

    it('does not flag an input that has a matching label[for]', () => {
      const label = document.createElement('label');
      label.setAttribute('for', 'name');
      label.textContent = 'Name';
      document.body.appendChild(label);
      appendInput('text', { id: 'name' });
      expect(
        analyzeAccessibility().issues.some((i) => i.type === 'Form Accessibility')
      ).toBe(false);
    });

    it('does not flag an input that has an aria-label attribute', () => {
      appendInput('text', { ariaLabel: 'Search terms' });
      expect(
        analyzeAccessibility().issues.some((i) => i.type === 'Form Accessibility')
      ).toBe(false);
    });

    it('flags an input that has an id but no matching label element', () => {
      appendInput('text', { id: 'orphan' });
      expect(
        analyzeAccessibility().issues.some((i) => i.type === 'Form Accessibility')
      ).toBe(true);
    });

    it('deducts 4 points per unlabelled input', () => {
      appendInput('text');
      appendInput('text');
      expect(analyzeAccessibility().score).toBe(100 - 2 * 4);
    });

    it('caps the label penalty at 20 points', () => {
      // 6 inputs x 4 = 24, capped at 20 -> score 80
      for (let i = 0; i < 6; i++) appendInput('text');
      expect(analyzeAccessibility().score).toBe(80);
    });

    it('adds a suggestion to add form labels', () => {
      appendInput('text');
      expect(analyzeAccessibility().suggestions).toContain(
        'Add labels or aria-label attributes to all form inputs'
      );
    });

    it('sets selector on the Form Accessibility issue', () => {
      appendInput('text');
      const issue = analyzeAccessibility().issues.find(
        (i) => i.type === 'Form Accessibility'
      );
      expect(issue?.selector).toBeDefined();
      expect(typeof issue?.selector).toBe('string');
      expect((issue?.selector ?? '').length).toBeGreaterThan(0);
    });

    it('sets htmlSnippet on the Form Accessibility issue', () => {
      appendInput('text');
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
      appendHeading(1, 'Title');
      appendHeading(2, 'Section');
      appendHeading(3, 'Sub');
      expect(
        analyzeAccessibility().issues.some(
          (i) => i.type === 'Heading Hierarchy'
        )
      ).toBe(false);
    });

    it('flags headings that skip a level (h1 -> h3)', () => {
      appendHeading(1, 'Title');
      appendHeading(3, 'Skipped');
      const issue = analyzeAccessibility().issues.find(
        (i) => i.type === 'Heading Hierarchy'
      );
      expect(issue).toBeDefined();
      expect(issue?.severity).toBe('medium');
      expect(issue?.message).toBe('Heading levels are not in proper order');
    });

    it('flags headings that skip multiple levels (h1 -> h4)', () => {
      appendHeading(1, 'Title');
      appendHeading(4, 'Deep');
      expect(
        analyzeAccessibility().issues.some(
          (i) => i.type === 'Heading Hierarchy'
        )
      ).toBe(true);
    });

    it('deducts 10 points for heading hierarchy issues', () => {
      appendHeading(1, 'Title');
      appendHeading(3, 'Skip');
      expect(analyzeAccessibility().score).toBe(90);
    });

    it('adds a suggestion for correct heading order', () => {
      appendHeading(1, 'Title');
      appendHeading(3, 'Skip');
      expect(analyzeAccessibility().suggestions).toContain(
        'Use heading levels in sequential order (h1, h2, h3, etc.)'
      );
    });

    it('does not flag a page with no headings', () => {
      const p = document.createElement('p');
      p.textContent = 'Just a paragraph';
      document.body.appendChild(p);
      expect(
        analyzeAccessibility().issues.some(
          (i) => i.type === 'Heading Hierarchy'
        )
      ).toBe(false);
    });

    it('does not flag a lone h1 heading', () => {
      appendHeading(1, 'Only Heading');
      expect(
        analyzeAccessibility().issues.some(
          (i) => i.type === 'Heading Hierarchy'
        )
      ).toBe(false);
    });

    it('does not flag sibling headings at the same level (h2 -> h2)', () => {
      appendHeading(1, 'Title');
      appendHeading(2, 'First');
      appendHeading(2, 'Second');
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
      const span = document.createElement('span');
      span.style.color = 'red';
      document.body.appendChild(span);
      expect(analyzeAccessibility().suggestions).toContain(
        'Verify color contrast ratios meet WCAG guidelines (4.5:1 for normal text)'
      );
    });

    it('does not add colour-contrast suggestion without inline colour styles', () => {
      const p = document.createElement('p');
      p.textContent = 'Plain text';
      document.body.appendChild(p);
      expect(analyzeAccessibility().suggestions).not.toContain(
        'Verify color contrast ratios meet WCAG guidelines (4.5:1 for normal text)'
      );
    });

    it('adds focus-indicator suggestion when interactive elements are present', () => {
      const btn = document.createElement('button');
      btn.textContent = 'Click me';
      document.body.appendChild(btn);
      expect(analyzeAccessibility().suggestions).toContain(
        'Ensure all interactive elements have visible focus indicators'
      );
    });

    it('adds focus-indicator suggestion for anchor elements', () => {
      const a = document.createElement('a');
      a.href = '#';
      document.body.appendChild(a);
      expect(analyzeAccessibility().suggestions).toContain(
        'Ensure all interactive elements have visible focus indicators'
      );
    });

    it('does not add focus-indicator suggestion on a page with no interactive elements', () => {
      const p = document.createElement('p');
      p.textContent = 'No buttons here';
      document.body.appendChild(p);
      expect(analyzeAccessibility().suggestions).not.toContain(
        'Ensure all interactive elements have visible focus indicators'
      );
    });
  });

  // ── Score floor ─────────────────────────────────────────────────────────────
  it('never returns a score below 0', () => {
    for (let i = 0; i < 20; i++) appendImg('x.jpg');
    for (let i = 0; i < 10; i++) appendInput('text');
    appendHeading(1, 'A');
    appendHeading(4, 'B');
    expect(analyzeAccessibility().score).toBeGreaterThanOrEqual(0);
  });

  it('accumulates penalties from multiple issue types', () => {
    // 1 image without alt (-3) + 1 input without label (-4) = score 93
    appendImg('x.jpg');
    appendInput('text');
    expect(analyzeAccessibility().score).toBe(93);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// analyzeAccessibility — custom settings
// ══════════════════════════════════════════════════════════════════════════════
import { DEFAULT_SETTINGS } from '../../src/shared/settings';

describe('analyzeAccessibility with custom settings', () => {
  beforeEach(() => {
    document.head.replaceChildren();
    document.body.replaceChildren();
  });

  it('uses custom missingAltDeduction', () => {
    appendImg('a.jpg');
    appendImg('b.jpg');
    const result = analyzeAccessibility({
      ...DEFAULT_SETTINGS.accessibility,
      missingAltDeduction: 10,
    });
    // 2 images * 10 = 20, capped at 25 → score 80
    expect(result.score).toBe(80);
  });

  it('uses custom missingAltCap', () => {
    appendImg('a.jpg');
    appendImg('b.jpg');
    appendImg('c.jpg');
    const result = analyzeAccessibility({
      ...DEFAULT_SETTINGS.accessibility,
      missingAltDeduction: 3,
      missingAltCap: 5,
    });
    // 3 * 3 = 9, capped at 5 → score 95
    expect(result.score).toBe(95);
  });

  it('uses custom unlabelledInputDeduction', () => {
    appendInput('text');
    const result = analyzeAccessibility({
      ...DEFAULT_SETTINGS.accessibility,
      unlabelledInputDeduction: 8,
    });
    // 1 input * 8 = 8, capped at 20 → score 92
    expect(result.score).toBe(92);
  });

  it('uses custom headingHierarchyDeduction', () => {
    appendHeading(1, 'Title');
    appendHeading(3, 'Skipped');
    const result = analyzeAccessibility({
      ...DEFAULT_SETTINGS.accessibility,
      headingHierarchyDeduction: 20,
    });
    expect(result.score).toBe(80);
  });

  it('returns score 100 with no issues when enabled is true and page is clean', () => {
    const result = analyzeAccessibility(DEFAULT_SETTINGS.accessibility);
    expect(result.score).toBe(100);
    expect(result.issues).toHaveLength(0);
  });
});
