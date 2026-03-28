// Provides a unified browser.* API for Chrome and Firefox via webextension-polyfill.
// Chrome: polyfill wraps chrome.* callbacks as Promises under browser.*
// Firefox: passes through the native browser.* API unchanged
export { default as browser } from 'webextension-polyfill';
