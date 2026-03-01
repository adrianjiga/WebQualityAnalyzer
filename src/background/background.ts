// Background script for WebQualityAnalyzer extension
console.log('WebQualityAnalyzer background script loaded');

// Listen for extension installation
chrome.runtime.onInstalled.addListener((): void => {
  console.log('WebQualityAnalyzer extension installed');
});