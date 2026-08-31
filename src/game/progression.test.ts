import { describe, expect, it } from 'vitest';
import { calculateRoundOutcome, RoundStateSnapshot } from './gameState';
import { createCard, createStandardDeck } from './briscola';
import { prepareRoundDeck } from './gameState';
import { ALL_DECKS } from '../data/decks';
import { BOSS_RULES } from './bossRules';
import { ALL_BOSS_BLINDS } from '../data/bosses';
import { executeUnoCard, UnoActionContext } from './unoEffects';
import { UnoCard } from '../types/game';

const DEFAULT_UNLOCKED = ['deck_napoletano', 'deck_bastoni'];

function snapshot(overrides: Partial<RoundStateSnapshot> = {}): RoundStateSnapshot {
  return {
    currentRoundScore: 500,
    totalScore: 500,
    roundPointsTaken: 30,
    opponentPointsTaken: 20,
    roundTricksWon: 5,
    roundTricksLost: 3,
    totalTricksWon: 5,
    totalTricksLost: 3,
    totalBriscolaPointsPlayer: 30,
    totalBriscolaPointsOpponent: 20,
    money: 4,
    totalMoneyEarned: 10,
    targetScore: 300,
    ante: 1,
    round: 1,
    vouchers: [],
    bossesDefeated: 0,
    solaCardsUsed: 0,
    ...overrides,
  };
}

describe('deck unlocks say what they do', () => {
  it('every locked deck is unlocked by exactly one condition in the engine', () => {
    // The picker prints unlockRequirement; nothing here may be unreachable.
    const lockedIds = ALL_DECKS.filter((deck) => !deck.unlocked).map((deck) => deck.id);
    const reachable = new Set<string>();

    reachable.add(
      calculateRoundOutcome(snapshot({ money: 40 }), 0, DEFAULT_UNLOCKED).newUnlockedDecks[0]
    );
    calculateRoundOutcome(snapshot({ round: 2, bossesDefeated: 2 }), 0, DEFAULT_UNLOCKED)
      .newUnlockedDecks.forEach((id) => reachable.add(id));
    calculateRoundOutcome(snapshot({ solaCardsUsed: 5 }), 0, DEFAULT_UNLOCKED)
      .newUnlockedDecks.forEach((id) => reachable.add(id));
    calculateRoundOutcome(snapshot({ ante: 5 }), 0, DEFAULT_UNLOCKED)
      .newUnlockedDecks.forEach((id) => reachable.add(id));

    for (const id of lockedIds) expect(reachable.has(id)).toBe(true);
  });

  it('the Bastoni deck is already yours: it is never handed out again', () => {
    const deck = ALL_DECKS.find((d) => d.id === 'deck_bastoni')!;
    expect(deck.unlocked).toBe(true);
    expect(deck.unlockRequirement).toMatch(/inizio/i);
    expect(DEFAULT_UNLOCKED).toContain('deck_bastoni');

    const outcome = calculateRoundOutcome(snapshot({ ante: 8, money: 99 }), 0, DEFAULT_UNLOCKED);
    expect(outcome.newUnlockedDecks).not.toContain('deck_bastoni');
  });

  it('the Spade deck counts three beaten bosses, not the third ante', () => {
    // Ante 3 with two bosses down: not yet.
    const early = calculateRoundOutcome(
      snapshot({ ante: 3, round: 1, bossesDefeated: 2 }),
      0,
      DEFAULT_UNLOCKED
    );
    expect(early.newUnlockedDecks).not.toContain('deck_spade');

    // Beating the boss of this very round is the third one: now.
    const third = calculateRoundOutcome(
      snapshot({ ante: 3, round: 2, bossesDefeated: 2 }),
      0,
      DEFAULT_UNLOCKED
    );
    expect(third.newUnlockedDecks).toContain('deck_spade');

    // A boss round that was lost does not count.
    const lost = calculateRoundOutcome(
      snapshot({ ante: 3, round: 2, bossesDefeated: 2, currentRoundScore: 10 }),
      0,
      DEFAULT_UNLOCKED
    );
    expect(lost.won).toBe(false);
    expect(lost.newUnlockedDecks).not.toContain('deck_spade');
  });

  it('the Sola deck counts five Carte Sola actually played', () => {
    expect(
      calculateRoundOutcome(snapshot({ solaCardsUsed: 4 }), 0, DEFAULT_UNLOCKED).newUnlockedDecks
    ).not.toContain('deck_uno');
    expect(
      calculateRoundOutcome(snapshot({ solaCardsUsed: 5 }), 0, DEFAULT_UNLOCKED).newUnlockedDecks
    ).toContain('deck_uno');
  });

  it('the Denari deck wants the money in hand at the end of a round', () => {
    expect(
      calculateRoundOutcome(snapshot({ money: 10 }), 0, DEFAULT_UNLOCKED).newUnlockedDecks
    ).not.toContain('deck_denari');
    expect(
      calculateRoundOutcome(snapshot({ money: 40 }), 0, DEFAULT_UNLOCKED).newUnlockedDecks
    ).toContain('deck_denari');
  });

  it('nothing is unlocked twice', () => {
    const outcome = calculateRoundOutcome(
      snapshot({ ante: 5, money: 40, solaCardsUsed: 9, bossesDefeated: 5 }),
      0,
      ['deck_napoletano', 'deck_bastoni', 'deck_denari', 'deck_spade', 'deck_uno', 'deck_baro']
    );
    expect(outcome.newUnlockedDecks).toEqual([]);
  });
});

describe('Il Cambiavalute cannot lock the round', () => {
  const boss = ALL_BOSS_BLINDS.find((b) => b.debuffType === 'no_denari_first')!;

  it('bans opening with Denari while another suit is in hand', () => {
    const hand = [createCard('denari', 1), createCard('coppe', 4)];
    const check = BOSS_RULES.canPlayerLeadCard(hand[0], boss, hand);
    expect(check.allowed).toBe(false);
    expect(check.reason).toBeTruthy();
  });

  it('lets a hand of nothing but Denari open anyway', () => {
    // Otherwise the round sits there: no legal lead, no way to pass.
    const hand = [createCard('denari', 1), createCard('denari', 7), createCard('denari', 10)];
    for (const card of hand) {
      expect(BOSS_RULES.canPlayerLeadCard(card, boss, hand).allowed).toBe(true);
    }
  });

  it('still allows any other suit', () => {
    const hand = [createCard('denari', 1), createCard('spade', 3)];
    expect(BOSS_RULES.canPlayerLeadCard(hand[1], boss, hand).allowed).toBe(true);
  });
});

describe('Jolly Matto changes the suit the player picked', () => {
  const wildSuit: UnoCard = {
    id: 'uno_wild_suit',
    name: 'Jolly Matto',
    symbol: '🌈',
    unoColor: 'wild',
    description: '',
    cost: 4,
    icon: '',
    color: '',
    targetType: 'instant_run',
  };

  function context(overrides: Partial<UnoActionContext> = {}): UnoActionContext {
    const deal = prepareRoundDeck(createStandardDeck());
    return {
      unoCard: wildSuit,
      drawPile: deal.roundDrawPile,
      playerHand: deal.playerHand,
      opponentHand: deal.opponentHand,
      briscolaSuit: 'denari',
      money: 10,
      discardsLeft: 1,
      activeJokers: [],
      maxJokers: 5,
      currentRoundScore: 0,
      bossDebuffActive: false,
      activeUnoMultiplier: 1,
      isReverseActive: false,
      ...overrides,
    };
  }

  it('uses the chosen suit', () => {
    const result = executeUnoCard(context({ chosenSuit: 'bastoni' }));
    expect(result.newBriscolaSuit).toBe('bastoni');
  });

  it('falls back to another suit when nothing was chosen', () => {
    const result = executeUnoCard(context());
    expect(result.newBriscolaSuit).not.toBe('denari');
  });

  it('never leaves the Briscola where it was, even if that suit is picked', () => {
    const result = executeUnoCard(context({ chosenSuit: 'denari' }));
    expect(result.newBriscolaSuit).not.toBe('denari');
  });
});
