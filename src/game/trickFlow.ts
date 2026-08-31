export type TrickPhase =
  | 'idle'
  | 'waiting_player_follow'
  | 'resolving'
  | 'tally'
  | 'round_end';

export type TrickFlowEvent =
  | { type: 'RESET' }
  | { type: 'OPPONENT_LED' }
  | { type: 'BEGIN_CLASH' }
  | { type: 'SHOW_TALLY' }
  | { type: 'CANCEL_CLASH' }
  | { type: 'CONTINUE_ROUND' }
  | { type: 'FINISH_ROUND' };

const transitions: Record<
  Exclude<TrickFlowEvent['type'], 'RESET'>,
  Partial<Record<TrickPhase, TrickPhase>>
> = {
  OPPONENT_LED: { idle: 'waiting_player_follow' },
  BEGIN_CLASH: {
    idle: 'resolving',
    waiting_player_follow: 'resolving',
    resolving: 'resolving',
  },
  SHOW_TALLY: { resolving: 'tally' },
  CANCEL_CLASH: { idle: 'idle', resolving: 'idle' },
  CONTINUE_ROUND: { tally: 'idle' },
  FINISH_ROUND: { tally: 'round_end' },
};

/** The only legal phase changes for one trick. Invalid late events are ignored. */
export function trickFlowReducer(state: TrickPhase, event: TrickFlowEvent): TrickPhase {
  if (event.type === 'RESET') return 'idle';
  return transitions[event.type][state] ?? state;
}
