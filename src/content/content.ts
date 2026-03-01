// Content script for WebQualityAnalyzer extension
console.log('WebQualityAnalyzer content script loaded');

interface AnalysisResult {
  score: number;
  pageInfo: {
    url: string;
    title: string;
    timestamp: string;
  };
  categories: {
    accessibility: CategoryResult;
    seo: CategoryResult;
    performance: CategoryResult;
  };
}

interface CategoryResult {
  score: number;
  issues: Issue[];
  suggestions: string[];
}

interface Issue {
  type: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  element?: string;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyze') {
    const result = performQualityAnalysis();
    sendResponse(result);
  }
});

export function performQualityAnalysis(): AnalysisResult {
  const accessibility = analyzeAccessibility();
  const seo = analyzeSEO();
  const performance = analyzePerformance();
  
  // Calculate overall score
  const overallScore = Math.round((accessibility.score + seo.score + performance.score) / 3);
  
  return {
    score: overallScore,
    pageInfo: {
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString()
    },
    categories: {
      accessibility,
      seo,
      performance
    }
  };
}

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
    issues.push({
      type: 'Missing Alt Text',
      message: `${imagesWithoutAlt.length} images missing alt text`,
      severity: 'high',
      element: imagesWithoutAlt[0]?.src || 'Unknown image'
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
    issues.push({
      type: 'Form Accessibility',
      message: `${inputsWithoutLabels.length} form inputs without labels`,
      severity: 'high',
      element: `${inputsWithoutLabels[0]?.tagName} element`
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
  const interactiveElements = document.querySelectorAll('button, a, input, select, textarea');
  if (interactiveElements.length > 0) {
    suggestions.push('Ensure all interactive elements have visible focus indicators');
  }

  // Check for heading hierarchy
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  if (headings.length > 0) {
    const headingLevels = Array.from(headings).map(h => parseInt(h.tagName.charAt(1)));
    let previousLevel = 0;
    let hasSkippedLevel = false;
    
    headingLevels.forEach(level => {
      if (level > previousLevel + 1) {
        hasSkippedLevel = true;
      }
      previousLevel = level;
    });
    
    if (hasSkippedLevel) {
      issues.push({
        type: 'Heading Hierarchy',
        message: 'Heading levels are not in proper order',
        severity: 'medium'
      });
      suggestions.push('Use heading levels in sequential order (h1, h2, h3, etc.)');
      score -= 10;
    }
  }

  return { score: Math.max(0, score), issues, suggestions };
}

export function analyzeSEO(): CategoryResult {
  const issues: Issue[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // Check for page title
  const title = document.title;
  if (!title || title.trim() === '') {
    issues.push({
      type: 'Page Title',
      message: 'Page has no title',
      severity: 'high'
    });
    suggestions.push('Add a descriptive page title (50-60 characters recommended)');
    score -= 25;
  } else if (title.length < 10) {
    issues.push({
      type: 'Page Title',
      message: 'Page title is too short',
      severity: 'medium'
    });
    suggestions.push('Make page title more descriptive (50-60 characters recommended)');
    score -= 15;
  } else if (title.length > 60) {
    issues.push({
      type: 'Page Title',
      message: 'Page title is too long',
      severity: 'low'
    });
    suggestions.push('Shorten page title to 50-60 characters for better search results');
    score -= 5;
  }

  // Check for meta description
  const metaDescription = document.querySelector('meta[name="description"]');
  if (!metaDescription || !metaDescription.getAttribute('content')) {
    issues.push({
      type: 'Meta Description',
      message: 'Missing meta description',
      severity: 'high'
    });
    suggestions.push('Add a meta description (150-160 characters recommended)');
    score -= 20;
  } else {
    const content = metaDescription.getAttribute('content') || '';
    if (content.length < 120) {
      issues.push({
        type: 'Meta Description',
        message: 'Meta description is too short',
        severity: 'medium'
      });
      suggestions.push('Expand meta description to 150-160 characters');
      score -= 10;
    } else if (content.length > 160) {
      issues.push({
        type: 'Meta Description',
        message: 'Meta description is too long',
        severity: 'low'
      });
      suggestions.push('Shorten meta description to 150-160 characters');
      score -= 5;
    }
  }

  // Check for H1 heading
  const h1Count = document.querySelectorAll('h1').length;
  if (h1Count === 0) {
    issues.push({
      type: 'H1 Heading',
      message: 'No H1 heading found',
      severity: 'high'
    });
    suggestions.push('Add a main H1 heading to improve SEO and accessibility');
    score -= 20;
  } else if (h1Count > 1) {
    issues.push({
      type: 'H1 Heading',
      message: `Multiple H1 headings found (${h1Count})`,
      severity: 'medium'
    });
    suggestions.push('Use only one H1 heading per page');
    score -= 15;
  }

  // Check for canonical URL
  const canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    suggestions.push('Consider adding a canonical URL to prevent duplicate content issues');
  }

  // Check for Open Graph tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (!ogTitle || !ogDescription) {
    suggestions.push('Add Open Graph meta tags for better social media sharing');
  }

  return { score: Math.max(0, score), issues, suggestions };
}

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
    issues.push({
      type: 'Image Optimization',
      message: `${largeImages.length} images larger than 1920x1080`,
      severity: 'medium',
      element: largeImages[0]?.src || 'Unknown image'
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

  // Performance suggestions
  suggestions.push('Consider using a Content Delivery Network (CDN) for static assets');
  suggestions.push('Enable gzip compression on your server');
  suggestions.push('Minify CSS and JavaScript files');

  return { score: Math.max(0, score), issues, suggestions };
}

// Initialize on page load
function initializeQualityAnalysis(): void {
  console.log('WebQualityAnalyzer initialized for:', window.location.href);
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeQualityAnalysis);
} else {
  initializeQualityAnalysis();
}
