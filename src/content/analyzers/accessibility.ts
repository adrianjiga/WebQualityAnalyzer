import type { CategoryResult, Issue } from '../types';
import { getCssSelector, getHtmlSnippet } from '../utils';

export function analyzeAccessibility(): CategoryResult {
  const issues: Issue[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // Check for missing alt text on images
  const images = document.querySelectorAll('img');
  const imagesWithoutAlt = Array.from(images).filter(
    (img) => !img.alt || img.alt.trim() === ''
  );
  if (imagesWithoutAlt.length > 0) {
    const firstImg = imagesWithoutAlt[0];
    issues.push({
      type: 'Missing Alt Text',
      message: `${imagesWithoutAlt.length} images missing alt text`,
      severity: 'high',
      selector: firstImg ? getCssSelector(firstImg) : undefined,
      htmlSnippet: firstImg ? getHtmlSnippet(firstImg) : undefined,
    });
    suggestions.push('Add descriptive alt text to all images for screen readers');
    score -= Math.min(25, imagesWithoutAlt.length * 3);
  }

  // Check for form labels
  const inputs = document.querySelectorAll(
    'input[type="text"], input[type="email"], input[type="password"], textarea, select'
  );
  const inputsWithoutLabels = Array.from(inputs).filter((input) => {
    const id = input.getAttribute('id');
    const ariaLabel = input.getAttribute('aria-label');
    const label = id ? document.querySelector(`label[for="${id}"]`) : null;
    return !label && !ariaLabel;
  });
  if (inputsWithoutLabels.length > 0) {
    const firstInput = inputsWithoutLabels[0] as Element;
    issues.push({
      type: 'Form Accessibility',
      message: `${inputsWithoutLabels.length} form inputs without labels`,
      severity: 'high',
      selector: firstInput ? getCssSelector(firstInput) : undefined,
      htmlSnippet: firstInput ? getHtmlSnippet(firstInput) : undefined,
    });
    suggestions.push('Add labels or aria-label attributes to all form inputs');
    score -= Math.min(20, inputsWithoutLabels.length * 4);
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
    let firstSkippedHeading: Element | null = null;

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
        selector: firstSkippedHeading ? getCssSelector(firstSkippedHeading) : undefined,
        htmlSnippet: firstSkippedHeading ? getHtmlSnippet(firstSkippedHeading) : undefined,
      });
      suggestions.push('Use heading levels in sequential order (h1, h2, h3, etc.)');
      score -= 10;
    }
  }

  return { score: Math.max(0, score), issues, suggestions };
}
