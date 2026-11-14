import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { FailureAnalysisSchema, type FailureAnalysis, type FailureContext } from './types';

const SYSTEM_PROMPT = `You triage failed automated tests for a Playwright + TypeScript framework that tests the
"Toolshop" demo e-commerce web app and its REST API. Classify the failure:
- product-bug: the application behaved incorrectly (wrong data, broken flow, API contract drift, a11y/visual regression)
- automation-bug: the test code is wrong (bad selector, wrong expectation, missing wait, test-data mistake)
- environment-issue: network, DNS, server errors (5xx), rate limits, or the environment being down
- flaky-test: the outcome depends on timing or shared state (especially if it passed on retry)
- unknown: the evidence is insufficient
Base the answer only on the evidence given. Keep probableRootCause and suggestedFix to one or two sentences each,
and name the specific selector, endpoint or assertion when the evidence shows it.`;

// Models that accept the server-side refusal fallback parameter.
const FALLBACK_MODELS = new Set([
  'claude-opus-5-5',
  'claude-opus-5',
  'claude-sonnet-5-5',
  'claude-fable-5-2',
  'claude-fable-5-1',
]);

export class ClaudeAnalyzer {
  private readonly client: Anthropic;

  constructor(private readonly model: string) {
    // Credentials resolve from ANTHROPIC_API_KEY or an `ant auth login` profile.
    this.client = new Anthropic({ timeout: 60_000, maxRetries: 2 });
  }

  /** Returns null when Claude declines or the output can't be parsed; callers fall back to the heuristic. */
  async analyze(ctx: FailureContext): Promise<FailureAnalysis | null> {
    const evidence = [
      `Test: ${ctx.title}`,
      `File: ${ctx.file}`,
      `Project: ${ctx.project}`,
      `Tags: ${ctx.tags.join(', ') || 'none'}`,
      `Outcome: ${ctx.outcome === 'flaky' ? 'failed, then passed on retry' : 'failed on every attempt'} (${ctx.attempts} attempt(s))`,
      '',
      'Error message:',
      ctx.errorMessage,
      '',
      'Stack trace:',
      ctx.stack,
    ].join('\n');

    const response = await this.client.beta.messages.parse({
      model: this.model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: evidence }],
      output_config: { effort: 'low', format: betaZodOutputFormat(FailureAnalysisSchema) },
      ...(FALLBACK_MODELS.has(this.model)
        ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
        : {}),
    });

    if (response.stop_reason === 'refusal') {
      return null;
    }
    return response.parsed_output ?? null;
  }
}
