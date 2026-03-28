export interface AnalysisResult {
  score: number;
  pageInfo: {
    url: string;
    title: string;
    timestamp: string;
  };
  categories: {
    accessibility: CategoryResult;
    seo: CategoryResult;
    performance: CategoryResult;
  };
}

export interface CategoryResult {
  score: number;
  issues: Issue[];
  suggestions: string[];
}

export interface Issue {
  type: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  element?: string;
  selector?: string;
  htmlSnippet?: string;
}
