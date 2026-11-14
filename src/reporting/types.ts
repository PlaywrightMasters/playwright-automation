import { z } from 'zod';

export const FailureCategory = z.enum([
  'product-bug',
  'automation-bug',
  'environment-issue',
  'flaky-test',
  'unknown',
]);
export type FailureCategory = z.infer<typeof FailureCategory>;

export const FailureAnalysisSchema = z.object({
  category: FailureCategory,
  probableRootCause: z.string(),
  suggestedFix: z.string(),
  confidence: z.enum(['low', 'medium', 'high']),
});
export type FailureAnalysis = z.infer<typeof FailureAnalysisSchema>;

export interface FailureContext {
  title: string;
  file: string;
  project: string;
  tags: string[];
  /** 'unexpected' = failed every attempt, 'flaky' = failed then passed on retry. */
  outcome: 'unexpected' | 'flaky';
  attempts: number;
  errorMessage: string;
  stack: string;
}

export interface AnalyzedFailure extends FailureContext {
  analysis: FailureAnalysis;
  analyzer: 'claude' | 'heuristic';
}
