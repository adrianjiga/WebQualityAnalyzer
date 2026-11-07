import {
  analyzePage,
  collectIssues,
  type AnalysisResult,
} from 'webqualityanalyzer';

const result: AnalysisResult = analyzePage({
  accessibility: { enabled: false },
});
collectIssues(result);
