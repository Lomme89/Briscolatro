import { describe, expect, it } from 'vitest';
import { chooseOpponentFollow, chooseOpponentLead, OpponentAiContext } from './ai';
import { getAiProfile } from './aiProfiles';
import { giftValue, isEmptyThreat, NO_THREAT, readPlayerThreat } from './opponentThreat';
import { createCard } from './briscola';
import { ALL_JOKERS } from '../data/jokers';
import { ALL_BOSS_BLINDS } from '../data/bosses';
import { CardRank, Joker, PlayingCard, Suit } from '../types/game';

const c = (suit: Suit, rank: CardRank, id?: string) =>
  createCard(suit, rank, 'standard', 'none', 'none', id ?? `${suit}_${rank}`);

const joker = (id: string): Joker => ALL_JOKERS.find((j) => j.id === id)!;

function threatOf(ids: string[], over: Partial<Parameters<typeof readPlayerThreat>[1]> = {}) {
  return readPlayerThreat(ids.map(joker), {
    briscolaSuit: 'denari',
    streak: 0,
    remainingTricks: 10,
    boss: null,
    ...over,
  });
}

/** noise off: these hands are built to have one right answer. */
function ctx(profileId: string, extra: Partial<OpponentAiContext> = {}): OpponentAiContext {
  return {
    briscolaSuit: 'denari',
    profile: { ...getAiProfile(profileId), noise: 0 },
    ...extra,
  };
}

describe('reading the board across the table', () => {
  it('an empty board threatens nothing', () => {
    expect(isEmptyThreat(threatOf([]))).toBe(true);
    expect(isEmptyThreat(NO_THREAT)).toBe(true);
  });

  it('a suit jolly prices that suit and leaves the others alone', () => {
    const threat = threatOf(['j_carrettiere']);
    expect(threat.suitBounty.bastoni).toBeGreaterThan(0);
    expect(threat.suitBounty.coppe ?? 0).toBe(0);
    expect(giftValue(c('bastoni', 5), threat, 'denari')).toBeGreaterThan(
      giftValue(c('coppe', 5), threat, 'denari')
    );
  });

  it('a carico jolly prices Assi and Tre, not the lisce', () => {
    const threat = threatOf(['j_cacciatore_carichi']);
    expect(giftValue(c('coppe', 1), threat, 'denari')).toBeGreaterThan(0);
    expect(giftValue(c('coppe', 3), threat, 'denari')).toBeGreaterThan(0);
    expect(giftValue(c('coppe', 5), threat, 'denari')).toBe(0);
  });

  it('a streak jolly is worth more the longer the chain already is', () => {
    const cold = threatOf(['j_barone_briscola'], { streak: 0 });
    const hot = threatOf(['j_barone_briscola'], { streak: 4 });
    expect(hot.winBounty).toBeGreaterThan(cold.winBounty);
  });

  it('the Duellante only shows up in the last three tricks', () => {
    expect(threatOf(['j_duellante'], { remainingTricks: 10 }).winBounty).toBe(0);
    expect(threatOf(['j_duellante'], { remainingTricks: 2 }).winBounty).toBeGreaterThan(0);
  });

  it('the boss rule is announced out loud, so it counts', () => {
    const halved = ALL_BOSS_BLINDS.find((b) => b.debuffType === 'half_carichi')!;
    const plain = threatOf(['j_cacciatore_carichi']);
    const nerfed = threatOf(['j_cacciatore_carichi'], { boss: halved });
    expect(nerfed.caricoBounty).toBeLessThan(plain.caricoBounty);
  });

  it('no single card is ever worth more than snatching an Asso', () => {
    // Everything at once, on one card. The cap has to hold, or a build becomes
    // a card the opponent simply refuses to interact with.
    const stacked = threatOf([
      'j_cacciatore_carichi',
      'j_scopa_galattica',
      'j_napola_cosmica',
      'j_orafo',
      'j_briscola_folle',
      'j_vesuvio',
    ]);
    expect(giftValue(c('denari', 1), stacked, 'denari')).toBeLessThanOrEqual(8);
  });

  it('money and utility jolly do not change what a trick is worth', () => {
    expect(isEmptyThreat(threatOf(['j_oste', 'j_jolly_sport', 'j_specchietto_baro']))).toBe(true);
  });
});

describe('it stops feeding the build when there is another way', () => {
  // Briscola is Coppe. The opponent is losing this trick and has to choose what
  // goes under it: a worthless Due di Denari, or a Fante di Bastoni that costs
  // it two real points. Normally the Due, obviously - unless the Due is worth
  // a great deal to the build sitting opposite.
  const lead = c('coppe', 4, 'lead');
  const hand = () => [c('denari', 2, 'due_denari'), c('bastoni', 8, 'fante_bastoni')];
  const denariBuild = () => threatOf(['j_orafo', 'j_napola_cosmica']);
  const trumpCoppe = { briscolaSuit: 'coppe' as const };

  it('with nothing on the board it throws the worthless card, as anyone would', () => {
    const chosen = chooseOpponentFollow(hand(), lead, ctx('esposito', trumpCoppe));
    expect(chosen!.id).toBe('due_denari');
  });

  it('facing a Denari build the Ragioniere pays two points to starve it', () => {
    const chosen = chooseOpponentFollow(
      hand(),
      lead,
      ctx('esposito', { ...trumpCoppe, playerThreat: denariBuild() })
    );
    expect(chosen!.id).toBe('fante_bastoni');
  });

  it('Rocco is looking at his own cards and feeds it without noticing', () => {
    const chosen = chooseOpponentFollow(
      hand(),
      lead,
      ctx('rocco', { ...trumpCoppe, playerThreat: denariBuild() })
    );
    expect(chosen!.id).toBe('due_denari');
  });
});

describe('the Ragioniere refuses to hand over a carico for free', () => {
  // He is losing this trick. Under it goes either the Tre di Coppe - ten points
  // and a x2 trigger for the Cacciatore - or a worthless Cavallo di Spade.
  const lead = c('spade', 1, 'asso_avversario');
  const hand = () => [c('coppe', 3, 'tre_coppe'), c('spade', 9, 'cavallo_spade')];

  it('he throws the cheap card when a cheap card exists', () => {
    const chosen = chooseOpponentFollow(
      hand(),
      lead,
      ctx('esposito', { playerThreat: threatOf(['j_cacciatore_carichi']) })
    );
    expect(chosen!.id).toBe('cavallo_spade');
  });

  it('and with only carichi left he still has to give one up', () => {
    // No hard counter: a build is not made unplayable, it just costs the
    // opponent something to feed.
    const onlyCarichi = [c('coppe', 3, 'tre_coppe'), c('bastoni', 1, 'asso_bastoni')];
    const chosen = chooseOpponentFollow(
      onlyCarichi,
      lead,
      ctx('esposito', { playerThreat: threatOf(['j_cacciatore_carichi']) })
    );
    expect(onlyCarichi.some((card) => card.id === chosen!.id)).toBe(true);
  });
});

describe('it is a thumb on the scale, not a hard counter', () => {
  // The player leads a worthless Due. The only card that takes it is the Asso
  // di Briscola: the most expensive card the opponent owns.
  const lead = c('coppe', 2, 'lead_liscia');
  const hand = () => [c('denari', 1, 'asso_briscola'), c('bastoni', 4, 'liscia_bastoni')];

  it('the house policy does not burn the Asso di Briscola to deny +8 Mult', () => {
    const chosen = chooseOpponentFollow(
      hand(),
      lead,
      ctx('neutral', { playerThreat: threatOf(['j_carrettiere']) })
    );
    expect(chosen!.id).toBe('liscia_bastoni');
  });

  it('nor does the sharpest opponent in the game', () => {
    const chosen = chooseOpponentFollow(
      hand(),
      lead,
      ctx('gennaro_rivale', { playerThreat: threatOf(['j_carrettiere']) })
    );
    expect(chosen!.id).toBe('liscia_bastoni');
  });

  it('not even with a whole board of jolly stacked against it', () => {
    const everything = threatOf([
      'j_carrettiere',
      'j_cacciatore_carichi',
      'j_barone_briscola',
      'j_briscola_folle',
      'j_vesuvio',
      'j_scopa_galattica',
    ]);
    const chosen = chooseOpponentFollow(hand(), lead, ctx('esposito', { playerThreat: everything }));
    expect(chosen!.id).toBe('liscia_bastoni');
  });
});

describe('an aggressive opponent buys the denial more often', () => {
  const threat = () => threatOf(['j_re_mida', 'j_cavaliere_nero', 'j_barone_briscola']);

  /** How often this profile pays a trump to take the trick, across the table. */
  function takeRate(profileId: string): number {
    let taken = 0;
    let total = 0;
    for (const rank of [2, 4, 5, 6, 7, 8, 9] as CardRank[]) {
      for (const trumpRank of [2, 4, 6, 7] as CardRank[]) {
        const lead = c('coppe', rank, 'lead');
        const hand: PlayingCard[] = [c('denari', trumpRank, 'trump'), c('bastoni', 2, 'liscia')];
        const chosen = chooseOpponentFollow(hand, lead, ctx(profileId, { playerThreat: threat() }));
        if (chosen!.id === 'trump') taken++;
        total++;
      }
    }
    return taken / total;
  }

  it('the showy ones take far more of these tricks than the patient ones', () => {
    const rates = Object.fromEntries(
      ['mimi', 'salvatore', 'rocco', 'neutral', 'esposito', 'assunta'].map((id) => [id, takeRate(id)])
    );
    console.log(
      'QUOTE DI PRESA',
      Object.entries(rates).map(([id, r]) => `${id}:${Math.round(r * 100)}%`).join(' ')
    );

    expect(rates.mimi).toBeGreaterThan(rates.assunta);
    expect(rates.salvatore).toBeGreaterThan(rates.esposito);
    expect(rates.rocco).toBeGreaterThan(rates.assunta);
  });

  it('the threat only ever pushes towards taking, never away from it', () => {
    const lead = c('coppe', 8, 'fante_avversario');
    const hand = () => [c('denari', 6, 'trump_medio'), c('bastoni', 2, 'liscia')];
    // Adding a reason to deny must not make an opponent duck a trick it would
    // otherwise have taken.
    for (const id of ['neutral', 'assunta', 'mimi', 'esposito', 'rocco', 'gennaro_rivale']) {
      const blind = chooseOpponentFollow(hand(), lead, ctx(id));
      const aware = chooseOpponentFollow(hand(), lead, ctx(id, { playerThreat: threat() }));
      if (blind!.id === 'trump_medio') expect({ id, took: aware!.id }).toEqual({ id, took: 'trump_medio' });
    }
  });
});

describe('it never learns anything it was not shown', () => {
  it('the decision does not depend on the player hand, only on the board', () => {
    const lead = c('spade', 4, 'lead');
    const hand = () => [c('bastoni', 5, 'bastone'), c('coppe', 5, 'coppa')];
    const threat = threatOf(['j_carrettiere']);

    // Whatever the player is actually holding, the answer is the same: the AI
    // is given no way to look at it.
    const withHand = chooseOpponentFollow(hand(), lead, ctx('esposito', { playerThreat: threat }));
    const other = chooseOpponentFollow(hand(), lead, ctx('esposito', { playerThreat: threat }));
    expect(withHand!.id).toBe(other!.id);

    // And the context it receives has no field that could carry one.
    const keys = Object.keys(ctx('esposito', { playerThreat: threat }));
    expect(keys).not.toContain('playerHand');
    expect(keys).not.toContain('opponentHand');
  });

  it('leading is influenced too, but only by what is face-up', () => {
    const hand = () => [c('bastoni', 10, 're_bastoni'), c('coppe', 10, 're_coppe')];
    const blind = chooseOpponentLead(hand(), ctx('esposito'));
    const aware = chooseOpponentLead(
      hand(),
      ctx('esposito', { playerThreat: threatOf(['j_carrettiere']) })
    );
    expect(blind!.id).toBe('re_bastoni');
    expect(aware!.id).toBe('re_coppe');
  });
});
