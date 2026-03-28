import { displayResults, displayCategoryContent } from '../../src/popup/popup';
import { getScoreColor } from '../../src/popup/utils';

import { buildCategory, buildResult, setupPopupDOM } from '../helpers/popup';

beforeEach(setupPopupDOM);

// ══════════════════════════════════════════════════════════════════════════════
// getScoreColor
// ══════════════════════════════════════════════════════════════════════════════
describe('getScoreColor', () => {
  it('returns emerald green for scores >= 90', () => {
    expect(getScoreColor(90)).toBe('#059669');
    expect(getScoreColor(100)).toBe('#059669');
    expect(getScoreColor(95)).toBe('#059669');
  });

  it('returns blue for scores >= 80 and < 90', () => {
    expect(getScoreColor(80)).toBe('#2563eb');
    expect(getScoreColor(89)).toBe('#2563eb');
  });

  it('returns amber for scores >= 60 and < 80', () => {
    expect(getScoreColor(60)).toBe('#b45309');
    expect(getScoreColor(79)).toBe('#b45309');
  });

  it('returns red for scores below 60', () => {
    expect(getScoreColor(59)).toBe('#dc2626');
    expect(getScoreColor(0)).toBe('#dc2626');
    expect(getScoreColor(1)).toBe('#dc2626');
  });

  it('returns a hex color string for every threshold', () => {
    [0, 60, 80, 90, 100].forEach((score) => {
      expect(getScoreColor(score)).toMatch(/^#[0-9a-f]{6}$/);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// displayCategoryContent
// ══════════════════════════════════════════════════════════════════════════════
describe('displayCategoryContent', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('renders the "Perfect Score" empty-state when there are no issues or suggestions', () => {
    displayCategoryContent(container, buildCategory(100), '♿');
    expect(container.textContent).toContain('Perfect Score');
    expect(container.textContent).toContain('No issues found');
  });

  it('renders the icon in the empty-state view', () => {
    displayCategoryContent(container, buildCategory(100), '♿');
    expect(container.textContent).toContain('♿');
  });

  it('renders a score card when there are issues', () => {
    const category = buildCategory(70, [
      { type: 'Missing Alt Text', message: 'Images lack alt', severity: 'high' },
    ]);
    displayCategoryContent(container, category, '♿');
    expect(container.textContent).toContain('70');
    expect(container.textContent).toContain('Category Score');
  });

  it('renders a score card when there are only suggestions', () => {
    const category = buildCategory(95, [], ['Add a CDN']);
    displayCategoryContent(container, category, '⚡');
    expect(container.textContent).toContain('95');
  });

  it('renders each issue type and message', () => {
    const category = buildCategory(80, [
      { type: 'Page Title', message: 'Title too short', severity: 'medium' },
      { type: 'H1 Heading', message: 'No H1 found', severity: 'high' },
    ]);
    displayCategoryContent(container, category, '🔍');
    expect(container.textContent).toContain('Page Title');
    expect(container.textContent).toContain('Title too short');
    expect(container.textContent).toContain('H1 Heading');
    expect(container.textContent).toContain('No H1 found');
  });

  it('renders the selector in the expanded detail when an issue includes one', () => {
    const category = buildCategory(80, [
      {
        type: 'Missing Alt Text',
        message: 'Image lacks alt',
        severity: 'high',
        selector: 'body > img.hero',
      },
    ]);
    displayCategoryContent(container, category, '♿');
    expect(container.textContent).toContain('body > img.hero');
  });

  it('does not render an element field when the issue has none', () => {
    const category = buildCategory(80, [
      { type: 'Page Title', message: 'No title', severity: 'high' },
    ]);
    displayCategoryContent(container, category, '🔍');
    expect(container.textContent).not.toContain('Element:');
  });

  it('wraps each issue in a details element', () => {
    const category = buildCategory(80, [
      { type: 'Page Title', message: 'No title', severity: 'high' },
    ]);
    displayCategoryContent(container, category, '🔍');
    expect(container.querySelector('details')).not.toBeNull();
  });

  it('renders issue type and message in the summary', () => {
    const category = buildCategory(80, [
      { type: 'H1 Heading', message: 'No H1 found', severity: 'high' },
    ]);
    displayCategoryContent(container, category, '🔍');
    const summary = container.querySelector('summary');
    expect(summary?.textContent).toContain('H1 Heading');
    expect(summary?.textContent).toContain('No H1 found');
  });

  it('renders the html snippet in the expanded detail when present', () => {
    const category = buildCategory(80, [
      {
        type: 'Missing Alt Text',
        message: 'Image lacks alt',
        severity: 'high',
        htmlSnippet: '<img src="hero.jpg">',
      },
    ]);
    displayCategoryContent(container, category, '♿');
    expect(container.textContent).toContain('<img src="hero.jpg">');
  });

  it('renders a severity badge in the expanded detail', () => {
    const category = buildCategory(80, [
      { type: 'Page Title', message: 'No title', severity: 'medium' },
    ]);
    displayCategoryContent(container, category, '🔍');
    const badge = container.querySelector('.severity-badge--medium');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('medium');
  });

  it('does not render a selector block when selector is absent', () => {
    const category = buildCategory(80, [
      { type: 'Page Title', message: 'No title', severity: 'high' },
    ]);
    displayCategoryContent(container, category, '🔍');
    expect(container.querySelector('.issue-selector')).toBeNull();
  });

  it('does not render a snippet block when htmlSnippet is absent', () => {
    const category = buildCategory(80, [
      { type: 'Page Title', message: 'No title', severity: 'high' },
    ]);
    displayCategoryContent(container, category, '🔍');
    expect(container.querySelector('.issue-snippet')).toBeNull();
  });

  it('applies severity variant class to issue items', () => {
    const category = buildCategory(80, [
      { type: 'Page Title', message: 'No title', severity: 'low' },
    ]);
    displayCategoryContent(container, category, '🔍');
    expect(container.querySelector('.issue-item--low')).not.toBeNull();
  });

  it('renders each suggestion', () => {
    const category = buildCategory(90, [], ['Add a CDN', 'Use gzip']);
    displayCategoryContent(container, category, '⚡');
    expect(container.textContent).toContain('Add a CDN');
    expect(container.textContent).toContain('Use gzip');
  });

  it('renders both issues and suggestions sections when both are present', () => {
    const category = buildCategory(
      75,
      [{ type: 'H1 Heading', message: 'No H1', severity: 'high' }],
      ['Add a main heading']
    );
    displayCategoryContent(container, category, '🔍');
    expect(container.textContent).toContain('Issues Found');
    expect(container.textContent).toContain('Suggestions');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// displayResults
// ══════════════════════════════════════════════════════════════════════════════
describe('displayResults', () => {
  it('renders the overall score in the overview tab', () => {
    displayResults(buildResult({ score: 72 }));
    expect(document.getElementById('overview-tab')?.textContent).toContain('72');
  });

  it('renders accessibility score in the overview tab', () => {
    const result = buildResult();
    result.categories.accessibility = buildCategory(88);
    displayResults(result);
    expect(document.getElementById('overview-tab')?.textContent).toContain('88');
  });

  it('renders SEO score in the overview tab', () => {
    const result = buildResult();
    result.categories.seo = buildCategory(55, [
      { type: 'Page Title', message: 'Too short', severity: 'medium' },
    ]);
    displayResults(result);
    expect(document.getElementById('overview-tab')?.textContent).toContain('55');
  });

  it('renders performance score in the overview tab', () => {
    const result = buildResult();
    result.categories.performance = buildCategory(91);
    displayResults(result);
    expect(document.getElementById('overview-tab')?.textContent).toContain('91');
  });

  it('populates the accessibility tab content', () => {
    displayResults(buildResult());
    expect(document.getElementById('accessibility-tab')?.textContent?.length).toBeGreaterThan(0);
  });

  it('populates the SEO tab content', () => {
    displayResults(buildResult());
    expect(document.getElementById('seo-tab')?.textContent?.length).toBeGreaterThan(0);
  });

  it('populates the performance tab content', () => {
    displayResults(buildResult());
    expect(document.getElementById('performance-tab')?.textContent?.length).toBeGreaterThan(0);
  });

  it('shows the green score color on the badge when a category scores 100', () => {
    const result = buildResult();
    result.categories.accessibility = buildCategory(100, [], []);
    displayResults(result);
    const overview = document.getElementById('overview-tab');
    const badge = overview?.querySelector('.metric-count') as HTMLElement | null;
    expect(badge?.getAttribute('style')).toContain('#059669');
  });
});
