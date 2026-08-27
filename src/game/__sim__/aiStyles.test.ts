import { describe, expect, it } from 'vitest';
import { duel, pointShare } from './duel';
import { seedRandom } from './sim';
import { AI_PROFILES, NEUTRAL_PROFILE, OpponentAiProfile } from '../aiProfiles';
import { chooseOpponentFollow, chooseOpponentLead } from '../ai';
import { createStandardDeck } from '../briscola';
import { prepareRoundDeck as dealRound } from '../gameState';
import { PlayingCard } from '../../types/game';

const CHARACTERS: OpponentAiProfile[] = [
  AI_PROFILES.gennaro_habitue,
  AI_PROFILES.assunta,
  AI_PROFILES.mimi,
  AI_PROFILES.o_muto,
  AI_PROFILES.salvatore,
  AI_PROFILES.rocco,
  AI_PROFILES.esposito,
  AI_PROFILES.gennaro_rivale,
];

describe('the roster plays eight different games', () => {
  it('every profile is competitive but none of them is a wall', () => {
    const restore = seedRandom(4242);
    const shares: Record<string, number> = {};
    for (const profile of CHARACTERS) {
      shares[profile.id] = pointShare(duel(profile, NEUTRAL_PROFILE, 120));
    }
    restore();

    console.log(
      'PUNTI CONTRO IL BANCO',
      Object.entries(shares)
        .map(([id, share]) => `${id}:${Math.round(share * 100)}%`)
        .join(' ')
    );

    for (const [id, share] of Object.entries(shares)) {
      // Nobody is a free win, and nobody takes the round off you every time.
      expect({ id, tooWeak: share < 0.38 }).toEqual({ id, tooWeak: false });
      expect({ id, tooStrong: share > 0.62 }).toEqual({ id, tooStrong: false });
    }
  });

  it('the sharp ones really are sharper than the showy ones', () => {
    const restore = seedRandom(77);
    const counter = pointShare(duel(AI_PROFILES.gennaro_rivale, NEUTRAL_PROFILE, 200));
    const showman = pointShare(duel(AI_PROFILES.rocco, NEUTRAL_PROFILE, 200));
    restore();

    // Personality is allowed to cost something: Rocco spends early and pays
    // for it, Gennaro at the end of the run does not.
    expect(counter).toBeGreaterThan(showman);
  });

  it('the roster averages out near the house policy', () => {
    // This is the difficulty guard. Individual opponents may be harder or
    // easier than before, but the ladder as a whole must not quietly inflate.
    const restore = seedRandom(31337);
    const shares = CHARACTERS.map((p) => pointShare(duel(p, NEUTRAL_PROFILE, 120)));
    restore();

    const average = shares.reduce((a, b) => a + b, 0) / shares.length;
    console.log('MEDIA DEL RUOLINO', Math.round(average * 1000) / 10 + '%');
    expect(average).toBeGreaterThan(0.45);
    expect(average).toBeLessThan(0.55);
  });
});

describe('the same hand, eight different answers', () => {
  /** Deals a batch of real hands and records what each profile does with them. */
  function decisionsFor(profile: OpponentAiProfile): string[] {
    const restore = seedRandom(9001);
    const picks: string[] = [];
    for (let i = 0; i < 60; i++) {
      const deal = dealRound(createStandardDeck());
      // A late-round position: most of the deck has been seen, which is where
      // counting starts paying and where the profiles have most to disagree
      // about. Without this, memory is inert and half the roster looks alike.
      const ctx = {
        briscolaSuit: deal.briscolaSuit,
        profile: { ...profile, noise: 0 },
        playedCards: deal.roundDrawPile.slice(0, 24),
      };
      const lead = chooseOpponentLead(deal.opponentHand, ctx)!;
      picks.push(`L${lead.suit}${lead.rank}`);

      const follow = chooseOpponentFollow(deal.opponentHand, deal.playerHand[0], ctx)!;
      picks.push(`F${follow.suit}${follow.rank}`);
    }
    restore();
    return picks;
  }

  it('no two profiles produce the same sequence of choices', () => {
    const byProfile = new Map<string, string>();
    for (const profile of CHARACTERS) {
      byProfile.set(profile.id, decisionsFor(profile).join(','));
    }

    const ids = [...byProfile.keys()];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        expect(
          { pair: `${ids[i]} vs ${ids[j]}`, identical: byProfile.get(ids[i]) === byProfile.get(ids[j]) },
        ).toEqual({ pair: `${ids[i]} vs ${ids[j]}`, identical: false });
      }
    }
  });

  it('and they disagree on a good share of the hands, not one in fifty', () => {
    const assunta = decisionsFor(AI_PROFILES.assunta);
    const mimi = decisionsFor(AI_PROFILES.mimi);
    const different = assunta.filter((pick, i) => pick !== mimi[i]).length;
    console.log('ASSUNTA vs MIMÌ: scelte diverse', `${different}/${assunta.length}`);
    expect(different / assunta.length).toBeGreaterThan(0.25);
  });
});

describe('noise is a person having an off moment, not a coin flip', () => {
  it('a noisy profile still never plays a card it does not hold', () => {
    const restore = seedRandom(5);
    for (let i = 0; i < 200; i++) {
      const deal = dealRound(createStandardDeck());
      const hand: PlayingCard[] = deal.opponentHand;
      const lead = chooseOpponentLead(hand, {
        briscolaSuit: deal.briscolaSuit,
        profile: AI_PROFILES.rocco,
      })!;
      expect(hand.some((c) => c.id === lead.id)).toBe(true);
    }
    restore();
  });

  it("'O Muto plays the same line every time, Rocco does not", () => {
    const deal = (() => {
      const restore = seedRandom(1234);
      const d = dealRound(createStandardDeck());
      restore();
      return d;
    })();

    const run = (profile: OpponentAiProfile, seed: number) => {
      const restore = seedRandom(seed);
      const picks = [];
      for (let i = 0; i < 40; i++) {
        picks.push(chooseOpponentLead(deal.opponentHand, { briscolaSuit: deal.briscolaSuit, profile })!.id);
      }
      restore();
      return new Set(picks).size;
    };

    // One line, always: noise 0.01 over forty tries stays put on this seed.
    expect(run(AI_PROFILES.o_muto, 11)).toBe(1);
    // Rocco wanders, but only ever to his second choice.
    expect(run(AI_PROFILES.rocco, 11)).toBeGreaterThan(1);
    expect(run(AI_PROFILES.rocco, 11)).toBeLessThanOrEqual(2);
  });
});
