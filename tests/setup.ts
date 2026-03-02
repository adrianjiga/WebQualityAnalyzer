import '@testing-library/jest-dom';

// Mock Chrome extension APIs globally so all test files can safely import
// modules that call chrome.* at load time (e.g. content.ts registers a
// chrome.runtime.onMessage listener the moment it is imported).
const chromeMock = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
    },
    onInstalled: {
      addListener: jest.fn(),
    },
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
  },
};

(globalThis as unknown as { chrome: typeof chrome }).chrome =
  chromeMock as unknown as typeof chrome;
