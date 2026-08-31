/**
 * The ordered story of how a trick's score was built.
 *
 * The engine already knew the total; it never said in what order the total
 * happened. The tally overlay needs that order to fire one source at a time
 * instead of ramping a finished number, so scoring emits a trace of steps
 * alongside the aggregates it already returned.
 *
 * Replaying a trace never changes a result: a consumer folds it as
 *   chips = baseChips + Σ chips steps
 *   mult  = (baseMult + Σ mult steps) × Π xmult steps
 * which lands on the same totals the engine computed, in any prefix order.
 */

export type ScoreStepKind = 'chips' | 'mult' | 'xmult' | 'dollars';

export interface ScoreStep {
  kind: ScoreStepKind;
  /** Added amount, except for `xmult` where it is the factor multiplied in. */
  amount: number;
  /** What to show the player, e.g. "Foil" or "L'Oste". */
  label: string;
  /** Set when a Jolly produced the step, so the UI can light that slot up. */
  sourceJokerId?: string;
  /** The owned copy, when two of the same Jolly are in play. */
  sourceJokerInstanceId?: string;
}

/**
 * Records a step only when it moved something. A joker that fired for +0 is
 * noise in the tally, and a ×1 is not a multiplier.
 */
export function pushStep(steps: ScoreStep[], step: ScoreStep): void {
  if (step.kind === 'xmult' ? step.amount === 1 : step.amount === 0) return;
  steps.push(step);
}
