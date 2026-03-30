// Popup script for WebQualityAnalyzer extension
import './popup.css';
import type { AnalysisResult, CategoryResult } from '../content/content';
import { browser } from '../shared/browser';
import { escapeHtml, getScoreColor, exportResults } from './utils';
import { loadSettings, saveSettings, resetSettings } from './settings';
import { AnalyzerSettings, DEFAULT_SETTINGS } from '../shared/settings';


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

  // Settings
  initSettings();
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
      const settings = await loadSettings();
      const response = await browser.tabs.sendMessage(tab.id, {
        action: 'analyze',
        settings,
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
      <div style="color: #dc2626; margin-bottom: 10px;">❌ Error</div>
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
      <div class="metric-score-label">Score: ${
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
      <div class="metric-score-label">Score: ${
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
      <div class="metric-score-label">Score: ${
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

// ── Settings UI ──────────────────────────────────────────────────────────────

export function initSettings(): void {
  loadSettings()
    .then((settings) => {
      populateSettingsUI(settings);
      attachSettingsListeners();
    })
    .catch(() => {
      populateSettingsUI(DEFAULT_SETTINGS);
      attachSettingsListeners();
    });
}

export function populateSettingsUI(settings: AnalyzerSettings): void {
  const set = (id: string, value: string | boolean): void => {
    const el = document.getElementById(id);
    if (!el) return;
    if (typeof value === 'boolean') {
      (el as HTMLInputElement).checked = value;
    } else {
      (el as HTMLInputElement).value = value;
    }
  };

  // Accessibility
  set('settings-a11y-enabled', settings.accessibility.enabled);
  set('settings-a11y-missingAltDeduction', String(settings.accessibility.missingAltDeduction));
  set('settings-a11y-missingAltCap', String(settings.accessibility.missingAltCap));
  set('settings-a11y-unlabelledInputDeduction', String(settings.accessibility.unlabelledInputDeduction));
  set('settings-a11y-unlabelledInputCap', String(settings.accessibility.unlabelledInputCap));
  set('settings-a11y-headingHierarchyDeduction', String(settings.accessibility.headingHierarchyDeduction));

  // SEO
  set('settings-seo-enabled', settings.seo.enabled);
  set('settings-seo-titleMinLength', String(settings.seo.titleMinLength));
  set('settings-seo-titleMaxLength', String(settings.seo.titleMaxLength));
  set('settings-seo-metaDescMinLength', String(settings.seo.metaDescMinLength));
  set('settings-seo-metaDescMaxLength', String(settings.seo.metaDescMaxLength));
  set('settings-seo-noH1Deduction', String(settings.seo.noH1Deduction));
  set('settings-seo-multipleH1Deduction', String(settings.seo.multipleH1Deduction));

  // Performance
  set('settings-perf-enabled', settings.performance.enabled);
  set('settings-perf-imageMaxWidth', String(settings.performance.imageMaxWidth));
  set('settings-perf-imageMaxHeight', String(settings.performance.imageMaxHeight));
  set('settings-perf-lazyLoadThreshold', String(settings.performance.lazyLoadThreshold));
  set('settings-perf-externalResourcesThreshold', String(settings.performance.externalResourcesThreshold));
  set('settings-perf-inlineStylesThreshold', String(settings.performance.inlineStylesThreshold));
  set('settings-perf-externalLinksDeductionCap', String(settings.performance.externalLinksDeductionCap));

  // Apply disabled state
  updateSectionDisabledState('settings-a11y-body', settings.accessibility.enabled);
  updateSectionDisabledState('settings-seo-body', settings.seo.enabled);
  updateSectionDisabledState('settings-perf-body', settings.performance.enabled);
}

export function collectSettings(): AnalyzerSettings {
  const num = (id: string, fallback: number): number => {
    const val = parseInt((document.getElementById(id) as HTMLInputElement).value, 10);
    return Number.isNaN(val) ? fallback : val;
  };
  const bool = (id: string): boolean =>
    (document.getElementById(id) as HTMLInputElement).checked;
  const d = DEFAULT_SETTINGS;

  return {
    accessibility: {
      enabled: bool('settings-a11y-enabled'),
      missingAltDeduction: num('settings-a11y-missingAltDeduction', d.accessibility.missingAltDeduction),
      missingAltCap: num('settings-a11y-missingAltCap', d.accessibility.missingAltCap),
      unlabelledInputDeduction: num('settings-a11y-unlabelledInputDeduction', d.accessibility.unlabelledInputDeduction),
      unlabelledInputCap: num('settings-a11y-unlabelledInputCap', d.accessibility.unlabelledInputCap),
      headingHierarchyDeduction: num('settings-a11y-headingHierarchyDeduction', d.accessibility.headingHierarchyDeduction),
    },
    seo: {
      enabled: bool('settings-seo-enabled'),
      titleMinLength: num('settings-seo-titleMinLength', d.seo.titleMinLength),
      titleMaxLength: num('settings-seo-titleMaxLength', d.seo.titleMaxLength),
      metaDescMinLength: num('settings-seo-metaDescMinLength', d.seo.metaDescMinLength),
      metaDescMaxLength: num('settings-seo-metaDescMaxLength', d.seo.metaDescMaxLength),
      noH1Deduction: num('settings-seo-noH1Deduction', d.seo.noH1Deduction),
      multipleH1Deduction: num('settings-seo-multipleH1Deduction', d.seo.multipleH1Deduction),
    },
    performance: {
      enabled: bool('settings-perf-enabled'),
      imageMaxWidth: num('settings-perf-imageMaxWidth', d.performance.imageMaxWidth),
      imageMaxHeight: num('settings-perf-imageMaxHeight', d.performance.imageMaxHeight),
      lazyLoadThreshold: num('settings-perf-lazyLoadThreshold', d.performance.lazyLoadThreshold),
      externalResourcesThreshold: num('settings-perf-externalResourcesThreshold', d.performance.externalResourcesThreshold),
      inlineStylesThreshold: num('settings-perf-inlineStylesThreshold', d.performance.inlineStylesThreshold),
      externalLinksDeductionCap: num('settings-perf-externalLinksDeductionCap', d.performance.externalLinksDeductionCap),
    },
  };
}

function updateSectionDisabledState(bodyId: string, enabled: boolean): void {
  document.getElementById(bodyId)?.classList.toggle('disabled', !enabled);
}

export function attachSettingsListeners(): void {
  const toggleConfigs = [
    { toggleId: 'settings-a11y-enabled', bodyId: 'settings-a11y-body' },
    { toggleId: 'settings-seo-enabled', bodyId: 'settings-seo-body' },
    { toggleId: 'settings-perf-enabled', bodyId: 'settings-perf-body' },
  ];

  toggleConfigs.forEach(({ toggleId, bodyId }) => {
    const toggle = document.getElementById(toggleId) as HTMLInputElement;
    if (!toggle) return;
    // Prevent the toggle click from also toggling the parent <details>
    toggle.addEventListener('click', (e) => e.stopPropagation());
    toggle.addEventListener('change', () => {
      updateSectionDisabledState(bodyId, toggle.checked);
      saveSettings(collectSettings()).catch(console.error);
    });
  });

  // Auto-save all number inputs on change
  document.querySelectorAll('#settings-tab input[type="number"]').forEach((input) => {
    input.addEventListener('change', () => {
      saveSettings(collectSettings()).catch(console.error);
    });
  });

  // Reset button
  document.getElementById('settings-reset-btn')?.addEventListener('click', async () => {
    const defaults = await resetSettings();
    populateSettingsUI(defaults);
  });
}

export function displayCategoryContent(
  container: HTMLDivElement,
  category: CategoryResult,
  icon: string
): void {
  if (category.issues.length === 0 && category.suggestions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${icon}</div>
        <div class="empty-state-success">Perfect Score!</div>
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
        <div class="metric-title">🚨 Issues Found</div>
        <ul class="issue-list">
          ${category.issues
            .map(
              (issue) => `
            <li class="issue-item issue-item--${escapeHtml(issue.severity)}">
              <details>
                <summary class="issue-summary">
                  <span><strong>${escapeHtml(issue.type)}:</strong> ${escapeHtml(issue.message)}</span>
                </summary>
                <div class="issue-detail">
                  ${issue.selector ? `<div class="issue-detail-label">CSS Selector</div><code class="issue-selector">${escapeHtml(issue.selector)}</code>` : ''}
                  ${issue.htmlSnippet ? `<div class="issue-detail-label">Element</div><code class="issue-snippet">${escapeHtml(issue.htmlSnippet)}</code>` : ''}
                  <span class="severity-badge severity-badge--${escapeHtml(issue.severity)}">${escapeHtml(issue.severity)}</span>
                </div>
              </details>
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
        <div class="metric-title">💡 Suggestions</div>
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

