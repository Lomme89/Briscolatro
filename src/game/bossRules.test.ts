import { describe, expect, it } from 'vitest';
import { BOSS_RULES } from './bossRules';
import { createCard, createStandardDeck } from './briscola';
import { prepareRoundDeck } from './gameState';
import { readPlayerThreat } from './opponentThreat';
import { ALL_BOSS_BLINDS } from '../data/bosses';
import { ALL_JOKERS } from '../data/jokers';
import { BossBlind, CardRank, Joker, PlayingCard, Suit } from '../types/game';

const boss = (type: BossBlind['debuffType']) =>
  ALL_BOSS_BLINDS.find((b) => b.debuffType === type)!;

const c = (suit: Suit, rank: CardRank, id?: string) =>
  createCard(suit, rank, 'standard', 'none', 'none', id ?? `${suit}_${rank}`);

const joker = (id: string): Joker => ALL_JOKERS.find((j) => j.id === id)!;

describe('every boss says what it does in one sentence', () => {
  it('the roster is complete, one per ante, and nobody is only a number', () => {
    for (let ante = 1; ante <= 8; ante++) {
      const found = ALL_BOSS_BLINDS.filter((b) => b.ante === ante);
      expect({ ante, count: found.length }).toEqual({ ante, count: 1 });
      expect(found[0].debuffDescription.length).toBeGreaterThan(20);
    }
    // The +50% tax is gone: no boss is a target multiplier any more.
    for (const b of ALL_BOSS_BLINDS) {
      expect(BOSS_RULES.getTargetScoreMultiplier(b)).toBe(1);
    }
  });
});

describe('Ante 6 - il pedaggio del Maestro dei Bastoni', () => {
  const gigante = boss('forced_suit_chain');
  const hand = () => [c('coppe', 4, 'coppa'), c('spade', 7, 'spada'), c('bastoni', 2, 'bastone')];

  it('with no trick won yet you open with whatever you like', () => {
    for (const card of hand()) {
      expect(BOSS_RULES.canPlayerLeadCard(card, gigante, hand(), null).allowed).toBe(true);
    }
    expect(BOSS_RULES.getForcedLeadSuit(gigante, null, hand())).toBeNull();
  });

  it('winning with a Coppa chains the next opening to Coppe', () => {
    expect(BOSS_RULES.getForcedLeadSuit(gigante, 'coppe', hand())).toBe('coppe');

    const allowed = BOSS_RULES.canPlayerLeadCard(hand()[0], gigante, hand(), 'coppe');
    expect(allowed.allowed).toBe(true);

    const refused = BOSS_RULES.canPlayerLeadCard(hand()[1], gigante, hand(), 'coppe');
    expect(refused.allowed).toBe(false);
    expect(refused.reason).toMatch(/coppe/i);
  });

  it('the chain breaks the moment you no longer hold the suit', () => {
    const noCoppe = [c('spade', 7, 'spada'), c('bastoni', 2, 'bastone')];
    expect(BOSS_RULES.getForcedLeadSuit(gigante, 'coppe', noCoppe)).toBeNull();
    for (const card of noCoppe) {
      expect(BOSS_RULES.canPlayerLeadCard(card, gigante, noCoppe, 'coppe').allowed).toBe(true);
    }
  });

  it('there is always a legal opening, whatever the hand and whatever the chain', () => {
    // Sweep every hand shape a round can reach against every possible chain.
    const deal = prepareRoundDeck(createStandardDeck());
    const shapes: PlayingCard[][] = [
      deal.playerHand,
      deal.playerHand.slice(0, 2),
      deal.playerHand.slice(0, 1),
      [c('coppe', 1), c('coppe', 3), c('coppe', 10)],
      [c('bastoni', 5)],
    ];
    const suits: Suit[] = ['denari', 'coppe', 'spade', 'bastoni'];

    for (const shape of shapes) {
      for (const chain of [...suits, null]) {
        const legal = shape.filter(
          (card) => BOSS_RULES.canPlayerLeadCard(card, gigante, shape, chain).allowed
        );
        expect({ chain, hand: shape.length, legal: legal.length > 0 }).toEqual({
          chain,
          hand: shape.length,
          legal: true,
        });
      }
    }
  });

  it('it only restricts the opening, never the answer', () => {
    // The rule is a toll on opening. Following is untouched, so no trick can
    // ever stall halfway through.
    expect(BOSS_RULES.getForcedLeadSuit(null, 'coppe', hand())).toBeNull();
  });
});

describe('Ante 7 - il Cambiavalute', () => {
  const cambiavalute = boss('no_denari_first');

  it('bans opening with Denari while another suit is in hand', () => {
    const hand = [c('denari', 1, 'denaro'), c('coppe', 4, 'coppa')];
    const refused = BOSS_RULES.canPlayerLeadCard(hand[0], cambiavalute, hand);
    expect(refused.allowed).toBe(false);
    expect(refused.reason).toBeTruthy();
    expect(BOSS_RULES.canPlayerLeadCard(hand[1], cambiavalute, hand).allowed).toBe(true);
  });

  it('a hand of nothing but Denari opens anyway, and the rule says so out loud', () => {
    const hand = [c('denari', 1), c('denari', 7), c('denari', 10)];
    for (const card of hand) {
      expect(BOSS_RULES.canPlayerLeadCard(card, cambiavalute, hand).allowed).toBe(true);
    }
    // The escape hatch has to be in the text the player reads before sitting
    // down, or it reads as a bug the one time it happens.
    expect(cambiavalute.debuffDescription).toMatch(/solo Denari/i);
  });

  it('there is always a legal opening, whatever the hand', () => {
    const shapes: PlayingCard[][] = [
      [c('denari', 1)],
      [c('denari', 1), c('denari', 3)],
      [c('denari', 1), c('coppe', 2)],
      [c('spade', 4), c('bastoni', 5)],
    ];
    for (const shape of shapes) {
      const legal = shape.filter((card) => BOSS_RULES.canPlayerLeadCard(card, cambiavalute, shape).allowed);
      expect(legal.length).toBeGreaterThan(0);
    }
  });
});

describe('Ante 8 - il Sovrano zittisce a turno', () => {
  const sovrano = boss('rotating_joker_silence');

  it('walks the rail in order, so the next silence is knowable', () => {
    const seen = [0, 1, 2, 3, 4, 5, 6, 7].map((trick) =>
      BOSS_RULES.getSilencedJokerIndex(sovrano, trick, 5)
    );
    expect(seen).toEqual([0, 1, 2, 3, 4, 0, 1, 2]);
  });

  it('is deterministic: the same trick always silences the same slot', () => {
    for (let i = 0; i < 50; i++) {
      expect(BOSS_RULES.getSilencedJokerIndex(sovrano, 7, 3)).toBe(1);
    }
  });

  it('every joker is silenced equally often over a round', () => {
    const counts = [0, 0, 0, 0];
    for (let trick = 0; trick < 20; trick++) {
      counts[BOSS_RULES.getSilencedJokerIndex(sovrano, trick, 4)!]++;
    }
    expect(counts).toEqual([5, 5, 5, 5]);
  });

  it('an empty rail has nothing to silence', () => {
    expect(BOSS_RULES.getSilencedJokerIndex(sovrano, 3, 0)).toBeNull();
  });

  it('no other boss touches the jokers', () => {
    for (const other of ALL_BOSS_BLINDS.filter((b) => b.id !== sovrano.id)) {
      expect(BOSS_RULES.getSilencedJokerIndex(other, 3, 5)).toBeNull();
    }
  });

  it('the opponent stops playing around a jolly it can see is silent', () => {
    const jokers = [joker('j_carrettiere'), joker('j_cacciatore_carichi')];
    const base = { briscolaSuit: 'denari' as Suit, streak: 0, remainingTricks: 10, boss: sovrano };

    const awake = readPlayerThreat(jokers, base);
    const carrettiereSilent = readPlayerThreat(jokers, { ...base, silencedJokerIndex: 0 });

    expect(awake.suitBounty.bastoni).toBeGreaterThan(0);
    expect(carrettiereSilent.suitBounty.bastoni ?? 0).toBe(0);
    // The other one is still very much awake.
    expect(carrettiereSilent.caricoBounty).toBe(awake.caricoBounty);
  });
});
