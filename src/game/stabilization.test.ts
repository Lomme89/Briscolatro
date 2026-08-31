import { describe, expect, it } from 'vitest';
import { ALL_JOKERS } from '../data/jokers';
import { ALL_UNO_CARDS } from '../data/unoCards';
import { Joker, PlayingCard, Suit } from '../types/game';
import { createCard, createStandardDeck, resolveTrick } from './briscola';
import { applyTrickResult, canDiscardCardNow, RoundStateSnapshot } from './gameState';
import { createBlueSealReward, instantiateJoker } from './itemInstances';
import { JOKER_EFFECTS, JokerScoringContext } from './jokerEffects';
import { calculateTrickScore } from './scoring';
import { boosterAbandonLabel, discountedShopCost, trySpendMoney } from './shopRules';
import { executeUnoCard, UnoActionContext } from './unoEffects';
import { buildDefeatReason, evaluateVictoryCondition } from './victoryModes';

const card = (suit: Suit, rank: PlayingCard['rank'], id: string) =>
  createCard(suit, rank, 'standard', 'none', 'none', id);

function joker(id: string, instanceId = id): Joker {
  return instantiateJoker(ALL_JOKERS.find((entry) => entry.id === id)!, instanceId);
}

function jokerContext(overrides: Partial<JokerScoringContext> = {}): JokerScoringContext {
  const playerCard = card('denari', 1, 'player');
  const opponentCard = card('coppe', 2, 'opponent');
  return {
    playerCard,
    opponentCard,
    clashResult: resolveTrick(playerCard, opponentCard, 'denari', true),
    briscolaSuit: 'denari',
    money: 10,
    playerHand: [],
    consecutiveWinStreak: 0,
    totalTricksPlayedThisRound: 0,
    remainingTricksCount: 20,
    capturedDenariRanksThisRound: new Set(),
    disabledJokerIndex: null,
    ...overrides,
  };
}

function scoreContext() {
  return {
    money: 10,
    playerHand: [] as PlayingCard[],
    consecutiveWinStreak: 0,
    totalTricksPlayedThisRound: 0,
    remainingTricksCount: 20,
    capturedDenariRanksThisRound: new Set<number>(),
  };
}

describe('stabilization scoring regressions', () => {
  it('keeps fractional Mult until the final rounded score', () => {
    const player = card('coppe', 2, 'p');
    const opponent = card('spade', 4, 'o');
    const clash = resolveTrick(player, opponent, 'denari', true);
    const result = calculateTrickScore(
      player, opponent, clash, 'denari', [], null, scoreContext(), 1.05
    );
    expect(result.totalChips).toBe(20);
    expect(result.totalMult).toBeCloseTo(1.05);
    expect(result.finalScore).toBe(21);
  });

  it('keeps Don Vito points modified for score but raw for traditional totals', () => {
    const player = card('denari', 1, 'asso');
    const opponent = card('coppe', 3, 'tre');
    const clash = resolveTrick(player, opponent, 'denari', true, 'half_carichi');
    expect(clash.points).toBe(10);
    expect(clash.rawPoints).toBe(21);

    const snapshot = {
      currentRoundScore: 0, totalScore: 0, roundPointsTaken: 0, opponentPointsTaken: 0,
      roundTricksWon: 0, roundTricksLost: 0, totalTricksWon: 0, totalTricksLost: 0,
      totalBriscolaPointsPlayer: 0, totalBriscolaPointsOpponent: 0, money: 0,
      totalMoneyEarned: 0,
    } as RoundStateSnapshot;
    const next = applyTrickResult(snapshot, true, 0, clash.rawPoints);
    expect(next.roundPointsTaken).toBe(21);
    expect(createStandardDeck().reduce((sum, entry) => sum + entry.points, 0)).toBe(120);
  });

  it('Conte uses normal Spade hierarchy in Spade vs Spade', () => {
    const conte = card('spade', 2, 'conte');
    const ace = card('spade', 1, 'ace');
    expect(resolveTrick(conte, ace, 'coppe', false, 'spades_are_briscola').playerWon).toBe(true);
  });

  it('Conte Spade trumps another suit, unless the player used real Briscola', () => {
    const conte = card('spade', 2, 'conte');
    expect(resolveTrick(conte, card('denari', 10, 'king'), 'coppe', false, 'spades_are_briscola').playerWon).toBe(false);
    expect(resolveTrick(conte, card('coppe', 10, 'trump-king'), 'coppe', false, 'spades_are_briscola').playerWon).toBe(true);
  });
});

describe('one-shot and per-instance Joker growth', () => {
  it('Napola triggers only on first completion and grows additively by x0.05', () => {
    const napola = joker('j_napola_cosmica', 'napola-a');
    const playerCard = card('denari', 3, 'three');
    const opponentCard = card('coppe', 2, 'blank');
    const completion = jokerContext({
      playerCard,
      opponentCard,
      clashResult: resolveTrick(playerCard, opponentCard, 'spade', true),
      briscolaSuit: 'spade',
      capturedDenariRanksThisRound: new Set([1, 2]),
    });
    const first = JOKER_EFFECTS.applyJokersToTrick([napola], completion);
    expect(first.xMultToMultiply).toBe(3);
    expect(first.statGrowth[0].addMult).toBe(0.05);

    const grown = JOKER_EFFECTS.applyStatGrowth([napola], first.statGrowth)[0];
    const nextEncounterCompletion = JOKER_EFFECTS.applyJokersToTrick([grown], completion);
    expect(nextEncounterCompletion.xMultToMultiply).toBeCloseTo(3.05);

    const alreadyComplete = JOKER_EFFECTS.applyJokersToTrick([grown], jokerContext({
      capturedDenariRanksThisRound: new Set([1, 2, 3]),
    }));
    expect(alreadyComplete.xMultToMultiply).toBe(1);
    expect(alreadyComplete.statGrowth).toEqual([]);
  });

  it('Duellante applies 2.5, 2.6... only in the last three tricks', () => {
    const duellante = { ...joker('j_duellante', 'duel-a'), stats: { accumulatedMult: 0.2 } };
    const normal = JOKER_EFFECTS.applyJokersToTrick([duellante], jokerContext({ remainingTricksCount: 4 }));
    expect(normal.xMultToMultiply).toBe(1);
    expect(normal.statGrowth).toEqual([]);

    const finale = JOKER_EFFECTS.applyJokersToTrick([duellante], jokerContext({ remainingTricksCount: 3 }));
    expect(finale.xMultToMultiply).toBeCloseTo(2.7);
    expect(finale.statGrowth[0].addMult).toBe(0.1);
  });

  for (const copies of [2, 3]) {
    it(`${copies} Vesuvio copies bank exactly +1 on each owned instance`, () => {
      const vesuvi = Array.from({ length: copies }, (_, index) => joker('j_vesuvio', `vesuvio-${index}`));
      const modifier = JOKER_EFFECTS.applyJokersToTrick(vesuvi, jokerContext());
      const grown = JOKER_EFFECTS.applyStatGrowth(vesuvi, modifier.statGrowth);
      expect(modifier.statGrowth).toHaveLength(copies);
      expect(grown.map((entry) => entry.stats?.accumulatedMult)).toEqual(Array(copies).fill(1));
    });
  }
});

describe('Carta Sola identity and refusal', () => {
  function unoContext(unoCard = ALL_UNO_CARDS[0]): UnoActionContext {
    return {
      unoCard,
      drawPile: [], playerHand: [], opponentHand: [], briscolaSuit: 'denari',
      money: 5, discardsLeft: 0, activeJokers: [], maxJokers: 5,
      currentRoundScore: 0, bossDebuffActive: false, activeUnoMultiplier: 1,
      isReverseActive: false,
    };
  }

  it('a Sigillo Blu reward preserves definition dispatch and executes its real effect', () => {
    const reward = createBlueSealReward(ALL_UNO_CARDS, () => 0.08)!; // blue +2
    expect(reward.id).toBe('uno_plus_two_blue');
    expect(reward.definitionId).toBe('uno_plus_two_blue');
    expect(reward.instanceId).toBeTruthy();
    const result = executeUnoCard(unoContext(reward));
    expect(result.newMoney).toBe(8);
    expect(result.consumed).toBe(true);
  });

  it('Jolly Misterioso with full slots is not consumed', () => {
    const mysterious = ALL_UNO_CARDS.find((entry) => entry.id === 'uno_wild_joker')!;
    const activeJokers = ALL_JOKERS.slice(0, 5).map((entry, index) => instantiateJoker(entry, `full-${index}`));
    const result = executeUnoCard(unoContext(mysterious));
    const fullResult = executeUnoCard({ ...unoContext(mysterious), activeJokers });
    expect(result.consumed).toBe(true);
    expect(fullResult.consumed).toBe(false);
    expect(fullResult.newActiveJokers).toEqual(activeJokers);
  });
});

describe('shop, UI rules and defeat copy', () => {
  it('Sconto della Casa discounts vouchers and immediately recomputes reroll cost', () => {
    expect(discountedShopCost(10, true)).toBe(8);
    expect(discountedShopCost(5, false)).toBe(5);
    expect(discountedShopCost(5, true)).toBe(3);
    expect(discountedShopCost(2, true)).toBe(1);
  });

  it('a paid booster requires the explicit remaining-choice abandonment label', () => {
    expect(boosterAbandonLabel(2, 1)).toBe('RINUNCIA ALLE 1 SCELTE');
  });

  it('rapid spending can never make money negative', () => {
    const first = trySpendMoney(5, 4);
    const second = trySpendMoney(first.balance, 4);
    expect(first).toEqual({ success: true, balance: 1 });
    expect(second).toEqual({ success: false, balance: 1 });
  });

  it('traditional defeat mentions only the real 61-point condition', () => {
    const check = evaluateVictoryCondition({ mode: 'traditional', score: 0, targetScore: 9999, playerBriscolaPoints: 60 });
    const reason = buildDefeatReason(check, 0, 9999, 60);
    expect(reason).toContain('servivano 61');
    expect(reason).not.toContain('target');
    expect(reason).not.toContain('Chips');
  });

  it('App and UI discard rule refuses non-idle, no-stock and off-turn states', () => {
    const base = { discardsLeft: 1, trickPhase: 'idle', isPlayerTurn: true, drawPileCount: 1, playerCardAlreadyPlayed: false };
    expect(canDiscardCardNow(base)).toBe(true);
    expect(canDiscardCardNow({ ...base, trickPhase: 'waiting_player_follow' })).toBe(false);
    expect(canDiscardCardNow({ ...base, drawPileCount: 0 })).toBe(false);
    expect(canDiscardCardNow({ ...base, isPlayerTurn: false })).toBe(false);
  });
});
