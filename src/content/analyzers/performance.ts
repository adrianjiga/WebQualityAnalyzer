import type { CategoryResult, Issue } from '../types';
import { getCssSelector, getHtmlSnippet } from '../utils';

export function analyzePerformance(): CategoryResult {
  const issues: Issue[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // Check for large images
  const images = document.querySelectorAll('img');
  const largeImages = Array.from(images).filter((img) => {
    return img.naturalWidth > 1920 || img.naturalHeight > 1080;
  });
  if (largeImages.length > 0) {
    const firstLarge = largeImages[0];
    issues.push({
      type: 'Image Optimization',
      message: `${largeImages.length} images larger than 1920x1080`,
      severity: 'medium',
      selector: firstLarge ? getCssSelector(firstLarge) : undefined,
      htmlSnippet: firstLarge ? getHtmlSnippet(firstLarge) : undefined,
    });
    suggestions.push('Optimize large images and use appropriate formats (WebP, AVIF)');
    score -= Math.min(20, largeImages.length * 3);
  }

  // Check for images without loading attribute
  const imagesWithoutLoading = Array.from(images).filter(img => !img.getAttribute('loading'));
  if (imagesWithoutLoading.length > 3) {
    issues.push({
      type: 'Lazy Loading',
      message: `${imagesWithoutLoading.length} images without lazy loading`,
      severity: 'low'
    });
    suggestions.push('Add loading="lazy" to images below the fold');
    score -= 10;
  }

  // Check for external resources
  const externalScripts = document.querySelectorAll('script[src^="http"]');
  const externalStyles = document.querySelectorAll('link[href^="http"]');
  const totalExternal = externalScripts.length + externalStyles.length;

  if (totalExternal > 10) {
    issues.push({
      type: 'External Resources',
      message: `${totalExternal} external resources detected`,
      severity: 'medium'
    });
    suggestions.push('Consider bundling or reducing external resources to improve load times');
    score -= Math.min(15, (totalExternal - 10) * 2);
  }

  // Check for inline styles
  const elementsWithInlineStyles = document.querySelectorAll('[style]');
  if (elementsWithInlineStyles.length > 20) {
    issues.push({
      type: 'Inline Styles',
      message: `${elementsWithInlineStyles.length} elements with inline styles`,
      severity: 'low'
    });
    suggestions.push('Move inline styles to CSS files for better caching');
    score -= 5;
  }

  // Check for external links without proper attributes
  const externalLinks = Array.from(
    document.querySelectorAll('a[href^="http"]')
  ).filter((link) => {
    const href = link.getAttribute('href');
    return href && !href.includes(window.location.hostname);
  });
  const externalLinksWithoutRel = externalLinks.filter(
    (link) => !link.getAttribute('rel')
  );
  if (externalLinksWithoutRel.length > 0) {
    issues.push({
      type: 'External Links',
      message: `${externalLinksWithoutRel.length} external links without rel attributes`,
      severity: 'low'
    });
    suggestions.push('Add rel="noopener noreferrer" to external links for security and performance');
    score -= Math.min(10, externalLinksWithoutRel.length);
  }

  if (score < 100) {
    suggestions.push('Consider using a Content Delivery Network (CDN) for static assets');
    suggestions.push('Enable gzip compression on your server');
    suggestions.push('Minify CSS and JavaScript files');
  }

  return { score: Math.max(0, score), issues, suggestions };
}
