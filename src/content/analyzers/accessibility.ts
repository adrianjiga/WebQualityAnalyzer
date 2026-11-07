import type { CategoryResult, Issue } from '../types';
import { getCssSelector, getHtmlSnippet } from '../utils';
import {
  AccessibilitySettings,
  DEFAULT_SETTINGS,
} from '../../shared/settings';

export function analyzeAccessibility(
  settings: AccessibilitySettings = DEFAULT_SETTINGS.accessibility
): CategoryResult {
  const issues: Issue[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // Check for missing alt text on images
  const images = document.querySelectorAll('img');
  const imagesWithoutAlt = Array.from(images).filter(
    (img) =>
      !img.hasAttribute('alt') || (img.alt.length > 0 && img.alt.trim() === '')
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
    score -= Math.min(settings.missingAltCap, imagesWithoutAlt.length * settings.missingAltDeduction);
  }

  // Check for form labels
  const inputs = document.querySelectorAll(
    'input:not([type="hidden"]), textarea, select'
  );
  const inputsWithoutLabels = Array.from(inputs).filter((input) => {
    const ariaLabel = input.getAttribute('aria-label')?.trim();
    const labelledBy = input
      .getAttribute('aria-labelledby')
      ?.trim()
      .split(/\s+/)
      .some((id) => {
        const label = document.getElementById(id);
        return Boolean(label?.textContent?.trim());
      });
    const hasAssociatedLabel = Array.from(
      document.getElementsByTagName('label')
    ).some((label) => label.htmlFor === input.id || label.contains(input));
    return !hasAssociatedLabel && !ariaLabel && !labelledBy;
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
    score -= Math.min(settings.unlabelledInputCap, inputsWithoutLabels.length * settings.unlabelledInputDeduction);
  }

  // Check for color contrast (basic check)
  const elementsWithColor = document.querySelectorAll('[style*="color"]');
  if (elementsWithColor.length > 0) {
    suggestions.push(
      'Inline color styles were found; manually check text/background contrast (this analyzer does not calculate contrast ratios)'
    );
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
      score -= settings.headingHierarchyDeduction;
    }
  }

  return { score: Math.max(0, score), issues, suggestions };
}
