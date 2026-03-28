import type { AnalysisResult } from '../content/content';

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  a.download = `quality-analysis-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
