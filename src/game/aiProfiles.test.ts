import { describe, expect, it } from 'vitest';
import { chooseOpponentFollow, chooseOpponentLead, OpponentAiContext } from './ai';
import { AI_PROFILES, getAiProfile, NEUTRAL_PROFILE } from './aiProfiles';
import { createCard } from './briscola';
import { getOpponentIntro } from '../data/opponents';
import { CardRank, PlayingCard, Suit } from '../types/game';

const c = (suit: Suit, rank: CardRank, id?: string) =>
  createCard(suit, rank, 'standard', 'none', 'none', id ?? `${suit}_${rank}`);

/** Silences the noise knob so a hand-built situation has one right answer. */
function steady(id: string) {
  return { ...getAiProfile(id), noise: 0 };
}

function ctx(id: string, extra: Partial<OpponentAiContext> = {}): OpponentAiContext {
  return { briscolaSuit: 'denari', profile: steady(id), ...extra };
}

describe('every character has a temperament of their own', () => {
  it('the eight regulars each point at a profile that exists', () => {
    const seen = new Set<string>();
    for (let ante = 1; ante <= 8; ante++) {
      const intro = getOpponentIntro(ante, 1);
      expect(AI_PROFILES[intro.aiProfileId], `ante ${ante}`).toBeDefined();
      seen.add(intro.aiProfileId);
    }
    // Eight antes, eight different temperaments: the two Gennaros included.
    expect(seen.size).toBe(8);
    expect(seen.has('neutral')).toBe(false);
  });

  it('the two Gennaros are the same man, not the same player', () => {
    const young = AI_PROFILES.gennaro_habitue;
    const old = AI_PROFILES.gennaro_rivale;
    // Eight antes later he counts more, wanders less, and has learned to sit
    // on his carichi instead of cashing them the moment they look useful.
    expect(old.memory).toBeGreaterThan(young.memory);
    expect(old.noise).toBeLessThan(young.noise);
    expect(old.pointSpending).toBeLessThan(young.pointSpending);
  });

  it('bosses keep the house policy: one thing beating you at a time', () => {
    for (let ante = 1; ante <= 8; ante++) {
      expect(getOpponentIntro(ante, 3).aiProfileId).toBe('neutral');
    }
    expect(getAiProfile('neutral')).toBe(NEUTRAL_PROFILE);
    expect(getAiProfile('un_tipo_che_non_esiste')).toBe(NEUTRAL_PROFILE);
  });
});

describe('a worthless trick led with a liscia', () => {
  // The player opens the Due di Coppe: nothing on the table. The opponent can
  // take it with a small trump, or let it go.
  const lead = c('coppe', 2, 'lead_liscia');
  const hand = () => [c('denari', 4, 'trump_low'), c('bastoni', 5, 'throw')];

  it('Mimì takes it anyway: there is an audience', () => {
    const chosen = chooseOpponentFollow(hand(), lead, ctx('mimi'));
    expect(chosen!.id).toBe('trump_low');
  });

  it('Nonna Assunta lets it go and keeps the Briscola', () => {
    const chosen = chooseOpponentFollow(hand(), lead, ctx('assunta'));
    expect(chosen!.id).toBe('throw');
  });

  it('the Ragioniere agrees with the Nonna: the pot does not pay', () => {
    expect(chooseOpponentFollow(hand(), lead, ctx('esposito'))!.id).toBe('throw');
  });

  it('Rocco spends the trump, because Rocco spends', () => {
    expect(chooseOpponentFollow(hand(), lead, ctx('rocco'))!.id).toBe('trump_low');
  });
});

describe('an Asso on the table and only expensive ways to take it', () => {
  // The player leads the Asso di Coppe: eleven points, and the only card that
  // takes it is the Tre di Briscola, which is ten points of your own.
  const lead = c('coppe', 1, 'asso_avversario');
  const hand = () => [c('denari', 3, 'tre_briscola'), c('bastoni', 4, 'liscia')];

  it('Nonna Assunta pays: this is the trick she was waiting for', () => {
    expect(chooseOpponentFollow(hand(), lead, ctx('assunta'))!.id).toBe('tre_briscola');
  });

  it("'O Muto pays too: the arithmetic is not close", () => {
    expect(chooseOpponentFollow(hand(), lead, ctx('o_muto'))!.id).toBe('tre_briscola');
  });
});

describe('what they choose to open with', () => {
  const hand = () => [
    c('spade', 1, 'asso_spade'),
    c('coppe', 2, 'liscia_coppe'),
    c('bastoni', 10, 're_bastoni'),
  ];

  it('Nonna Assunta opens with the card that costs her nothing', () => {
    expect(chooseOpponentLead(hand(), ctx('assunta'))!.id).toBe('liscia_coppe');
  });

  it('Mimì opens with something the table can see', () => {
    const chosen = chooseOpponentLead(hand(), ctx('mimi'))!;
    expect(chosen.id).not.toBe('liscia_coppe');
  });

  it('the Cadetto reaches for the Spade', () => {
    const chosen = chooseOpponentLead(
      [c('spade', 5, 'spada'), c('coppe', 5, 'coppa'), c('bastoni', 5, 'bastone')],
      ctx('salvatore')
    );
    expect(chosen!.id).toBe('spada');
  });

  it('Rocco reaches for the Bastoni', () => {
    const evenHand = [c('spade', 5, 'spada'), c('coppe', 5, 'coppa'), c('bastoni', 5, 'bastone')];
    expect(chooseOpponentLead(evenHand, ctx('rocco'))!.id).toBe('bastone');
  });

  it('the Ragioniere reaches for the Denari, unless the Denari are trump', () => {
    const evenHand = () => [c('denari', 5, 'denaro'), c('coppe', 5, 'coppa'), c('bastoni', 5, 'bastone')];

    // Trump is Coppe here, so his favourite suit is just a suit.
    const free = chooseOpponentLead(evenHand(), ctx('esposito', { briscolaSuit: 'coppe' }));
    expect(free!.id).toBe('denaro');

    // Trump is Denari: thrift beats taste, and he opens with something else.
    const trumped = chooseOpponentLead(evenHand(), ctx('esposito'));
    expect(trumped!.id).not.toBe('denaro');
  });

  it('no profile ever opens with a card it does not hold', () => {
    for (const id of Object.keys(AI_PROFILES)) {
      const h = hand();
      const chosen = chooseOpponentLead(h, ctx(id));
      expect(h.some((card) => card.id === chosen!.id), id).toBe(true);
    }
  });
});

describe('memory reads the table, and nothing but the table', () => {
  // The Re di Coppe is the highest Coppe left and every trump has been seen.
  // Nothing can take it: a counter knows that, a chatterer does not.
  const played = (): PlayingCard[] => {
    const cards: PlayingCard[] = [];
    for (const rank of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as CardRank[]) {
      cards.push(c('denari', rank, `d${rank}`));
    }
    cards.push(c('coppe', 1, 'c1'), c('coppe', 3, 'c3'));
    return cards;
  };

  const hand = () => [c('coppe', 10, 're_coppe'), c('bastoni', 2, 'liscia_bastoni')];

  it('Gennaro il Rivale cashes the card nothing can beat', () => {
    const chosen = chooseOpponentLead(hand(), ctx('gennaro_rivale', { playedCards: played() }));
    expect(chosen!.id).toBe('re_coppe');
  });

  it('even Nonna Assunta reaches for the Re, because she counted', () => {
    // She is the most cautious opener in the roster: nothing but certainty
    // gets her to lead a card worth four points.
    const counted = chooseOpponentLead(hand(), ctx('assunta', { playedCards: played() }));
    expect(counted!.id).toBe('re_coppe');

    const blind = chooseOpponentLead(hand(), ctx('assunta', { playedCards: [] }));
    expect(blind!.id).toBe('liscia_bastoni');
  });

  it('with nothing played yet, even the counter stays quiet', () => {
    const chosen = chooseOpponentLead(hand(), ctx('gennaro_rivale', { playedCards: [] }));
    expect(chosen!.id).toBe('liscia_bastoni');
  });

  it('a trump still outstanding is enough to call the lead unsafe', () => {
    // One Denaro never seen: the Re di Coppe can still be cut.
    const almost = played().filter((card) => card.id !== 'd2');
    const chosen = chooseOpponentLead(hand(), ctx('gennaro_rivale', { playedCards: almost }));
    expect(chosen!.id).toBe('liscia_bastoni');
  });
});
