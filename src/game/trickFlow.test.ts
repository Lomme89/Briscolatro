import { describe, expect, it } from 'vitest';
import { trickFlowReducer, TrickFlowEvent, TrickPhase } from './trickFlow';

function run(initial: TrickPhase, ...events: TrickFlowEvent[]): TrickPhase {
  return events.reduce(trickFlowReducer, initial);
}

describe('trick flow state machine', () => {
  it('covers a player-led trick through tally and back to idle', () => {
    expect(
      run(
        'idle',
        { type: 'BEGIN_CLASH' },
        { type: 'SHOW_TALLY' },
        { type: 'CONTINUE_ROUND' }
      )
    ).toBe('idle');
  });

  it('covers an opponent-led final trick', () => {
    expect(
      run(
        'idle',
        { type: 'OPPONENT_LED' },
        { type: 'BEGIN_CLASH' },
        { type: 'SHOW_TALLY' },
        { type: 'FINISH_ROUND' }
      )
    ).toBe('round_end');
  });

  it('recovers when the opponent cannot supply a card', () => {
    expect(run('resolving', { type: 'CANCEL_CLASH' })).toBe('idle');
  });

  it('ignores stale events and can reset from every phase', () => {
    expect(run('idle', { type: 'SHOW_TALLY' })).toBe('idle');
    expect(run('round_end', { type: 'RESET' })).toBe('idle');
  });
});
