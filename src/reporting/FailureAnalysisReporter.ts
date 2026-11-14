import { appendFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { env } from '../config/env';
import { ClaudeAnalyzer } from './claude';
import { heuristicAnalysis } from './heuristics';
import { sanitize } from './redact';
import type { AnalyzedFailure, FailureContext } from './types';

const OUT_DIR = 'reports';
const CONCURRENCY = 4;

/**
 * Secondary reporter: after the run, classifies every failed or flaky test and
 * writes reports/failure-analysis.{json,md}. It never changes pass/fail status.
 * With AI_ANALYSIS=true it asks Claude; otherwise, or if a call fails, it uses
 * the offline heuristic so the report always has the same shape.
 */
export default class FailureAnalysisReporter implements Reporter {
  private readonly lastFailure = new Map<TestCase, TestResult>();

  printsToStdio(): boolean {
    return false;
  }

  /** A report left over from an earlier run would describe failures that no longer exist. */
  onBegin(): void {
    for (const file of ['failure-analysis.json', 'failure-analysis.md']) {
      rmSync(path.join(OUT_DIR, file), { force: true });
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status === 'failed' || result.status === 'timedOut') {
      this.lastFailure.set(test, result);
    }
  }

  async onEnd(_result: FullResult): Promise<void> {
    const contexts: FailureContext[] = [];
    for (const [test, result] of this.lastFailure) {
      const outcome = test.outcome();
      if (outcome !== 'unexpected' && outcome !== 'flaky') continue;
      contexts.push({
        // titlePath = ['', project, file, ...describes, title]
        title: test.titlePath().slice(3).join(' › '),
        file: path.relative(process.cwd(), test.location.file).replaceAll('\\', '/'),
        project: test.parent.project()?.name ?? 'unknown',
        tags: test.tags,
        outcome,
        attempts: test.results.length,
        errorMessage: sanitize(result.errors.map((e) => e.message ?? '').join('\n') || 'Unknown error'),
        stack: sanitize(result.errors.map((e) => e.stack ?? '').join('\n'), 2000),
      });
    }
    if (contexts.length === 0) return;

    const claude = env.aiAnalysis ? new ClaudeAnalyzer(env.aiModel) : null;
    const analyzed: AnalyzedFailure[] = [];
    for (let i = 0; i < contexts.length; i += CONCURRENCY) {
      const batch = contexts.slice(i, i + CONCURRENCY);
      analyzed.push(...(await Promise.all(batch.map((ctx) => this.analyze(ctx, claude)))));
    }

    mkdirSync(OUT_DIR, { recursive: true });
    const summary = {
      generatedAt: new Date().toISOString(),
      analyzer: claude ? `claude (${env.aiModel}) with heuristic fallback` : 'heuristic',
      failures: analyzed,
    };
    writeFileSync(path.join(OUT_DIR, 'failure-analysis.json'), JSON.stringify(summary, null, 2));
    const markdown = toMarkdown(analyzed, summary.analyzer);
    writeFileSync(path.join(OUT_DIR, 'failure-analysis.md'), markdown);
    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
    }
    console.log(
      `\n[failure-analysis] ${analyzed.length} failure(s) classified → ${OUT_DIR}/failure-analysis.md`,
    );
  }

  private async analyze(ctx: FailureContext, claude: ClaudeAnalyzer | null): Promise<AnalyzedFailure> {
    if (claude) {
      try {
        const analysis = await claude.analyze(ctx);
        if (analysis) return { ...ctx, analysis, analyzer: 'claude' };
        console.warn(
          `[failure-analysis] Claude returned no usable analysis for "${ctx.title}"; using heuristic.`,
        );
      } catch (error) {
        console.warn(`[failure-analysis] Claude call failed (${(error as Error).message}); using heuristic.`);
      }
    }
    return { ...ctx, analysis: heuristicAnalysis(ctx), analyzer: 'heuristic' };
  }
}

function escapeCell(text: string): string {
  return text.replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function toMarkdown(failures: AnalyzedFailure[], analyzer: string): string {
  const rows = failures.map(
    (f) =>
      `| ${escapeCell(f.title)} | ${f.project} | ${f.analysis.category} | ${f.analysis.confidence} | ${escapeCell(f.analysis.probableRootCause)} | ${escapeCell(f.analysis.suggestedFix)} |`,
  );
  return [
    `## Failure analysis (${failures.length})`,
    '',
    `Analyzer: ${analyzer}`,
    '',
    '| Test | Project | Category | Confidence | Probable root cause | Suggested fix |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n');
}
