import { performQualityAnalysis } from '../../src/content/content';
import { getCssSelector, getHtmlSnippet } from '../../src/content/utils';

// ─── Message-listener capture ─────────────────────────────────────────────────
type MessageListener = (
  request: { action: string },
  sender: chrome.runtime.MessageSender
) => Promise<unknown> | undefined;

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

  it('returns a Promise resolving to a full AnalysisResult when action is "analyze"', async () => {
    const result = capturedMessageListener(
      { action: 'analyze' },
      {} as chrome.runtime.MessageSender
    );
    expect(result).toBeInstanceOf(Promise);
    const response = (await result) as ReturnType<typeof performQualityAnalysis>;
    expect(response).toHaveProperty('score');
    expect(response).toHaveProperty('pageInfo');
    expect(response).toHaveProperty('categories');
  });

  it('returns undefined for unknown action types', () => {
    const result = capturedMessageListener(
      { action: 'unknown-action' },
      {} as chrome.runtime.MessageSender
    );
    expect(result).toBeUndefined();
  });
});

// ─── getCssSelector ───────────────────────────────────────────────────────────
describe('getCssSelector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('uses id as anchor and stops ascending', () => {
    const div = document.createElement('div');
    div.id = 'hero';
    const img = document.createElement('img');
    img.src = 'a.jpg';
    div.appendChild(img);
    document.body.appendChild(div);
    expect(getCssSelector(img)).toBe('div#hero > img');
  });

  it('includes first class when no id is present', () => {
    const div = document.createElement('div');
    div.className = 'card promo';
    const span = document.createElement('span');
    div.appendChild(span);
    document.body.appendChild(div);
    expect(getCssSelector(span)).toContain('.card');
  });

  it('adds nth-of-type for an element without id among siblings', () => {
    const ul = document.createElement('ul');
    const li1 = document.createElement('li');
    const li2 = document.createElement('li');
    li2.className = 'second';
    ul.appendChild(li1);
    ul.appendChild(li2);
    document.body.appendChild(ul);
    const selector = getCssSelector(li2);
    expect(selector).toContain('nth-of-type(2)');
  });

  it('does not add nth-of-type when element is the only sibling of its tag', () => {
    const div = document.createElement('div');
    const p = document.createElement('p');
    const span = document.createElement('span');
    div.appendChild(p);
    div.appendChild(span);
    document.body.appendChild(div);
    // p is the only <p> sibling, so no nth-of-type needed
    expect(getCssSelector(p)).not.toContain('nth-of-type');
  });

  it('falls back to tag name for a root-level element with no id or class', () => {
    const p = document.createElement('p');
    document.body.appendChild(p);
    const selector = getCssSelector(p);
    expect(selector).toMatch(/p/);
  });

  it('returns the tag name alone for an orphan element with no parent chain', () => {
    const orphan = document.createElement('span');
    expect(getCssSelector(orphan)).toBe('span');
  });
});

// ─── getHtmlSnippet ───────────────────────────────────────────────────────────
describe('getHtmlSnippet', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns outerHTML unchanged when shorter than maxLength', () => {
    const img = document.createElement('img');
    img.src = 'a.jpg';
    img.alt = '';
    document.body.appendChild(img);
    const snippet = getHtmlSnippet(img);
    expect(snippet).toBe(img.outerHTML);
    expect(snippet).not.toContain('\u2026');
  });

  it('truncates and appends ellipsis when outerHTML exceeds maxLength', () => {
    const img = document.createElement('img');
    img.src = 'x'.repeat(200);
    document.body.appendChild(img);
    const snippet = getHtmlSnippet(img, 120);
    expect(snippet.length).toBe(121);
    expect(snippet.endsWith('\u2026')).toBe(true);
  });

  it('respects a custom maxLength parameter', () => {
    const div = document.createElement('div');
    div.className = 'a b c d e f g h i j k l m n o p q r s t u v w x y z';
    document.body.appendChild(div);
    const snippet = getHtmlSnippet(div, 20);
    expect(snippet.length).toBe(21);
    expect(snippet.endsWith('\u2026')).toBe(true);
  });
});
