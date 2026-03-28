// Jest mock for webextension-polyfill.
// Maps browser.* to the existing chrome.* global mock so tests don't need changes.
export default (globalThis as unknown as { chrome: typeof chrome }).chrome;
