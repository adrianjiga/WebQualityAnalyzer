import type { CategoryResult, Issue } from '../types';

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
