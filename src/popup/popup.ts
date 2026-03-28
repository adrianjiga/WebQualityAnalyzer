// Popup script for WebQualityAnalyzer extension
import './popup.css';
import type { AnalysisResult, CategoryResult } from '../content/content';
import { browser } from '../shared/browser';

let currentAnalysis: AnalysisResult | null = null;

document.addEventListener('DOMContentLoaded', () => {
  const analyzeButton = document.getElementById(
    'analyze-btn'
  ) as HTMLButtonElement;
  const exportButton = document.getElementById(
    'export-btn'
  ) as HTMLButtonElement;

  // Tab functionality
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      switchTab(tabName!);
    });
  });

  // Analyze button
  analyzeButton.addEventListener('click', async () => {
    await runAnalysis();
  });

  // Export button
  exportButton.addEventListener('click', () => {
    if (currentAnalysis) {
      exportResults(currentAnalysis);
    }
  });
});

export async function runAnalysis(): Promise<void> {
  const analyzeButton = document.getElementById(
    'analyze-btn'
  ) as HTMLButtonElement;
  const exportButton = document.getElementById(
    'export-btn'
  ) as HTMLButtonElement;

  analyzeButton.disabled = true;
  analyzeButton.textContent = 'Analyzing...';
  exportButton.disabled = true;

  // Show loading state
  showLoadingState();

  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab.id && tab.url) {
      // Update page info
      updatePageInfo(tab.url);

      // Send message to content script
      const response = await browser.tabs.sendMessage(tab.id, {
        action: 'analyze',
      }) as AnalysisResult;
      currentAnalysis = response;
      displayResults(response);
      exportButton.disabled = false;
    }
  } catch (_error) {
    showError("Could not analyze page. Make sure you're on a valid webpage.");
  } finally {
    analyzeButton.disabled = false;
    analyzeButton.textContent = 'Analyze Page';
  }
}

export function switchTab(tabName: string): void {
  // Update tab buttons
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

  // Update tab content
  document.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.remove('active');
  });
  document.getElementById(`${tabName}-tab`)?.classList.add('active');
}

export function updatePageInfo(url: string): void {
  const pageInfo = document.getElementById('page-info') as HTMLDivElement;
  const pageUrl = document.getElementById('page-url') as HTMLDivElement;

  pageUrl.textContent = url;
  pageInfo.style.display = 'block';
}

export function showLoadingState(): void {
  const overviewTab = document.getElementById('overview-tab') as HTMLDivElement;
  overviewTab.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <div>Analyzing page quality...</div>
    </div>
  `;
}

export function showError(message: string): void {
  const overviewTab = document.getElementById('overview-tab') as HTMLDivElement;
  overviewTab.innerHTML = `
    <div class="empty-state">
      <div style="color: #dc3545; margin-bottom: 10px;">❌ Error</div>
      <div>${message}</div>
    </div>
  `;
}

export function displayResults(result: AnalysisResult): void {
  displayOverview(result);
  displayAccessibility(result.categories.accessibility);
  displaySEO(result.categories.seo);
  displayPerformance(result.categories.performance);
}

function displayOverview(result: AnalysisResult): void {
  const overviewTab = document.getElementById('overview-tab') as HTMLDivElement;
  const scoreColor = getScoreColor(result.score);

  overviewTab.innerHTML = `
    <div class="score-card" style="background: ${scoreColor};">
      <div class="score-number">${result.score}</div>
      <div class="score-label">Overall Quality Score</div>
    </div>
    
    <div class="metric-card">
      <div class="metric-header">
        <div class="metric-title">🎯 Accessibility</div>
        <div class="metric-count" style="background: ${getScoreColor(result.categories.accessibility.score)};">
          ${result.categories.accessibility.issues.length} issues
        </div>
      </div>
      <div style="font-size: 12px; color: #697b8f;">Score: ${
        result.categories.accessibility.score
      }/100</div>
    </div>

    <div class="metric-card">
      <div class="metric-header">
        <div class="metric-title">🔍 SEO</div>
        <div class="metric-count" style="background: ${getScoreColor(result.categories.seo.score)};">
          ${result.categories.seo.issues.length} issues
        </div>
      </div>
      <div style="font-size: 12px; color: #697b8f;">Score: ${
        result.categories.seo.score
      }/100</div>
    </div>

    <div class="metric-card">
      <div class="metric-header">
        <div class="metric-title">⚡ Performance</div>
        <div class="metric-count" style="background: ${getScoreColor(result.categories.performance.score)};">
          ${result.categories.performance.issues.length} issues
        </div>
      </div>
      <div style="font-size: 12px; color: #697b8f;">Score: ${
        result.categories.performance.score
      }/100</div>
    </div>
  `;
}

function displayAccessibility(category: CategoryResult): void {
  const accessibilityTab = document.getElementById(
    'accessibility-tab'
  ) as HTMLDivElement;
  displayCategoryContent(accessibilityTab, category, '♿');
}

function displaySEO(category: CategoryResult): void {
  const seoTab = document.getElementById('seo-tab') as HTMLDivElement;
  displayCategoryContent(seoTab, category, '🔍');
}

function displayPerformance(category: CategoryResult): void {
  const performanceTab = document.getElementById(
    'performance-tab'
  ) as HTMLDivElement;
  displayCategoryContent(performanceTab, category, '⚡');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function displayCategoryContent(
  container: HTMLDivElement,
  category: CategoryResult,
  icon: string
): void {
  if (category.issues.length === 0 && category.suggestions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div style="font-size: 48px; margin-bottom: 15px;">${icon}</div>
        <div style="color: #28a745; font-weight: 600;">Perfect Score!</div>
        <div>No issues found in this category</div>
      </div>
    `;
    return;
  }

  let content = `
    <div class="score-card" style="background: ${getScoreColor(
      category.score
    )};">
      <div class="score-number">${category.score}</div>
      <div class="score-label">Category Score</div>
    </div>
  `;

  if (category.issues.length > 0) {
    content += `
      <div class="metric-card">
        <div class="metric-title" style="margin-bottom: 15px;">🚨 Issues Found</div>
        <ul class="issue-list">
          ${category.issues
            .map(
              (issue) => `
            <li class="issue-item">
              <strong>${escapeHtml(issue.type)}:</strong> ${escapeHtml(issue.message)}
              ${
                issue.element
                  ? `<br><small style="color: #6c757d;">Element: ${escapeHtml(issue.element)}</small>`
                  : ''
              }
            </li>
          `
            )
            .join('')}
        </ul>
      </div>
    `;
  }

  if (category.suggestions.length > 0) {
    content += `
      <div class="metric-card">
        <div class="metric-title" style="margin-bottom: 15px;">💡 Suggestions</div>
        <ul class="issue-list">
          ${category.suggestions
            .map(
              (suggestion) => `
            <li class="suggestion-item">${escapeHtml(suggestion)}</li>
          `
            )
            .join('')}
        </ul>
      </div>
    `;
  }

  container.innerHTML = content;
}

export function getScoreColor(score: number): string {
  if (score >= 90) return '#059669';
  if (score >= 80) return '#2563eb';
  if (score >= 60) return '#b45309';
  return '#dc2626';
}

export function exportResults(analysis: AnalysisResult): void {
  const data = {
    ...analysis,
    exportedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `quality-analysis-${
    new Date().toISOString().split('T')[0]
  }.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
