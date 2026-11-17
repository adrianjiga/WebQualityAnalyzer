import '@testing-library/jest-dom';

// Mock Chrome extension APIs globally so all test files can safely import
// modules that call chrome.* at load time (e.g. background.ts registers a
// chrome.runtime.onInstalled listener the moment it is imported).
const chromeMock = {
  runtime: {
    onInstalled: {
      addListener: jest.fn(),
    },
  },
  tabs: {
    query: jest.fn(),
  },
  scripting: {
    executeScript: jest.fn(),
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
};

(globalThis as unknown as { chrome: typeof chrome }).chrome =
  chromeMock as unknown as typeof chrome;
