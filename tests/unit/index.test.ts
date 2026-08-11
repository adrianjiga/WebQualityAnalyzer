import { analyzePage, collectIssues, DEFAULT_SETTINGS } from '../../src/index';
import { appendImg, appendH1, appendMeta } from '../helpers/helpers';

beforeEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
  document.title = 'A reasonable page title for testing';
});

// ══════════════════════════════════════════════════════════════════════════════
// analyzePage
// ══════════════════════════════════════════════════════════════════════════════
describe('analyzePage', () => {
  it('runs every category by default', () => {
    const result = analyzePage();

    expect(result.categories.accessibility).toBeDefined();
    expect(result.categories.seo).toBeDefined();
    expect(result.categories.performance).toBeDefined();
    expect(result.pageInfo.url).toBe(window.location.href);
  });

  it('detects a real accessibility issue on the page', () => {
    appendImg('/logo.png');

    const result = analyzePage();

    expect(result.categories.accessibility.issues).toContainEqual(
      expect.objectContaining({ type: 'Missing Alt Text', severity: 'high' })
    );
    expect(result.categories.accessibility.score).toBeLessThan(100);
  });

  it('disables a category without disturbing the others', () => {
    appendImg('/logo.png');

    const result = analyzePage({
      seo: { enabled: false },
      performance: { enabled: false },
    });

    // A disabled category scores 100 ("nothing found wrong"), so the overall average is not
    // dragged down by a category the caller deliberately switched off.
    expect(result.categories.seo.issues).toEqual([]);
    expect(result.categories.seo.score).toBe(100);
    expect(result.categories.performance.score).toBe(100);
    // …while the enabled one still reports.
    expect(result.categories.accessibility.issues.length).toBeGreaterThan(0);
  });

  it('merges a partial override over the defaults rather than replacing them', () => {
    appendImg('/a.png');
    appendImg('/b.png');

    const strict = analyzePage({
      accessibility: { missingAltDeduction: 50, missingAltCap: 100 },
    });
    const lenient = analyzePage({
      accessibility: { missingAltDeduction: 1, missingAltCap: 2 },
    });

    // Only the two named thresholds changed; every other accessibility setting — including
    // `enabled` — came from DEFAULT_SETTINGS, so both runs still analysed the category.
    expect(strict.categories.accessibility.score).toBeLessThan(
      lenient.categories.accessibility.score
    );
    expect(DEFAULT_SETTINGS.accessibility.enabled).toBe(true);
  });

  it('does not mutate DEFAULT_SETTINGS', () => {
    const before = DEFAULT_SETTINGS.accessibility.missingAltDeduction;
    analyzePage({ accessibility: { missingAltDeduction: 99 } });
    expect(DEFAULT_SETTINGS.accessibility.missingAltDeduction).toBe(before);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// collectIssues
// ══════════════════════════════════════════════════════════════════════════════
describe('collectIssues', () => {
  it('flattens issues across categories, tagging each with its category', () => {
    appendImg('/logo.png'); // accessibility: missing alt
    document.title = 'Hi'; // seo: title too short

    const issues = collectIssues(analyzePage());

    expect(issues.some((i) => i.category === 'accessibility')).toBe(true);
    expect(issues.some((i) => i.category === 'seo')).toBe(true);
    for (const issue of issues) {
      expect(issue).toHaveProperty('type');
      expect(issue).toHaveProperty('severity');
    }
  });

  it('returns an empty array for a clean page', () => {
    appendH1('A heading');
    appendMeta({ name: 'description', content: 'A'.repeat(130) });
    // jsdom resets document.title whenever head children change — set it afterwards.
    document.title = 'A reasonable page title for testing';

    const issues = collectIssues(
      analyzePage({ performance: { enabled: false } })
    );

    expect(issues).toEqual([]);
  });
});
