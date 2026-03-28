import {
  switchTab,
  updatePageInfo,
  showLoadingState,
  showError,
} from '../../src/popup/popup';

import { setupPopupDOM } from '../helpers/popup';

// ══════════════════════════════════════════════════════════════════════════════
// switchTab
// ══════════════════════════════════════════════════════════════════════════════
describe('switchTab', () => {
  beforeEach(setupPopupDOM);

  it('adds the "active" class to the target tab button', () => {
    switchTab('seo');
    const seoTab = document.querySelector('[data-tab="seo"]');
    expect(seoTab?.classList.contains('active')).toBe(true);
  });

  it('removes the "active" class from the previously active tab', () => {
    switchTab('seo');
    const overviewTab = document.querySelector('[data-tab="overview"]');
    expect(overviewTab?.classList.contains('active')).toBe(false);
  });

  it('shows the target tab content', () => {
    switchTab('accessibility');
    const panel = document.getElementById('accessibility-tab');
    expect(panel?.classList.contains('active')).toBe(true);
  });

  it('hides the previously active tab content', () => {
    switchTab('accessibility');
    const overview = document.getElementById('overview-tab');
    expect(overview?.classList.contains('active')).toBe(false);
  });

  it('only one tab button is active after switching', () => {
    switchTab('performance');
    const activeTabs = document.querySelectorAll('.tab.active');
    expect(activeTabs).toHaveLength(1);
  });

  it('only one tab content panel is active after switching', () => {
    switchTab('performance');
    const activePanels = document.querySelectorAll('.tab-content.active');
    expect(activePanels).toHaveLength(1);
  });

  it('correctly switches back to overview from another tab', () => {
    switchTab('seo');
    switchTab('overview');
    expect(document.getElementById('overview-tab')?.classList.contains('active')).toBe(true);
    expect(document.getElementById('seo-tab')?.classList.contains('active')).toBe(false);
  });

  it('switches to the settings tab', () => {
    switchTab('settings');
    expect(document.getElementById('settings-tab')?.classList.contains('active')).toBe(true);
    expect(document.querySelector('[data-tab="settings"]')?.classList.contains('active')).toBe(true);
  });

  it('shows only one active panel after switching to settings', () => {
    switchTab('settings');
    expect(document.querySelectorAll('.tab-content.active')).toHaveLength(1);
    expect(document.querySelectorAll('.tab.active')).toHaveLength(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// updatePageInfo
// ══════════════════════════════════════════════════════════════════════════════
describe('updatePageInfo', () => {
  beforeEach(setupPopupDOM);

  it('sets the text content of #page-url', () => {
    updatePageInfo('https://example.com/path');
    expect(document.getElementById('page-url')?.textContent).toBe(
      'https://example.com/path'
    );
  });

  it('makes the #page-info div visible', () => {
    updatePageInfo('https://example.com');
    const info = document.getElementById('page-info') as HTMLElement;
    expect(info.style.display).toBe('block');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// showLoadingState
// ══════════════════════════════════════════════════════════════════════════════
describe('showLoadingState', () => {
  beforeEach(setupPopupDOM);

  it('renders a spinner inside #overview-tab', () => {
    showLoadingState();
    const overview = document.getElementById('overview-tab');
    expect(overview?.querySelector('.spinner')).not.toBeNull();
  });

  it('renders text indicating analysis is in progress', () => {
    showLoadingState();
    const overview = document.getElementById('overview-tab');
    expect(overview?.textContent).toContain('Analyzing page quality');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// showError
// ══════════════════════════════════════════════════════════════════════════════
describe('showError', () => {
  beforeEach(setupPopupDOM);

  it('renders the provided error message inside #overview-tab', () => {
    showError('Something went wrong.');
    const overview = document.getElementById('overview-tab');
    expect(overview?.textContent).toContain('Something went wrong.');
  });

  it('renders an error indicator in the overview tab', () => {
    showError('Page not accessible.');
    const overview = document.getElementById('overview-tab');
    expect(overview?.textContent).toContain('Error');
  });

  it('renders different messages correctly', () => {
    showError('Custom error message here');
    expect(
      document.getElementById('overview-tab')?.textContent
    ).toContain('Custom error message here');
  });
});
