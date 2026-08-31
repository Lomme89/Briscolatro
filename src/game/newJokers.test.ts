import { describe, expect, it } from 'vitest';
import { ALL_JOKERS } from '../data/jokers';
import { CardRank, CardSpecial, Edition, Enhancement, Joker, PlayingCard, Seal, Suit } from '../types/game';
import { createCard, resolveTrick } from './briscola';
import { instantiateJoker } from './itemInstances';
import { CONTO_SOSPESO_SPEND_THRESHOLD, JOKER_EFFECTS, JokerScoringContext } from './jokerEffects';
import { calculateTrickScore } from './scoring';

/**
 * The ten new jolly, each one against the rule it is printed with.
 *
 * Everything goes through the real resolver and the real JOKER_EFFECTS: a test
 * that hand-builds a clash result would happily pass while the game disagreed.
 */

const BRISCOLA: Suit = 'denari';

function card(
  suit: Suit,
  rank: CardRank,
  id: string,
  extras: {
    edition?: Edition;
    seal?: Seal;
    enhancement?: Enhancement;
    special?: CardSpecial;
  } = {}
): PlayingCard {
  return createCard(
    suit,
    rank,
    extras.edition ?? 'standard',
    extras.seal ?? 'none',
    extras.enhancement ?? 'none',
    id,
    extras.special ?? 'none'
  );
}

function joker(id: string, instanceId = id): Joker {
  const found = ALL_JOKERS.find((entry) => entry.id === id);
  if (!found) throw new Error(`jolly assente dal catalogo: ${id}`);
  return instantiateJoker(found, instanceId);
}

interface ClashSetup {
  playerCard: PlayingCard;
  opponentCard: PlayingCard;
  /** Defaults to the player opening the trick. */
  playerLed?: boolean;
  briscolaSuit?: Suit;
}

/** A real clash plus a neutral context, so each test only states what it means. */
function context(setup: ClashSetup, overrides: Partial<JokerScoringContext> = {}): JokerScoringContext {
  const { playerCard, opponentCard, playerLed = true, briscolaSuit = BRISCOLA } = setup;
  const clashResult = resolveTrick(
    playerLed ? playerCard : opponentCard,
    playerLed ? opponentCard : playerCard,
    briscolaSuit,
    playerLed
  );
  return {
    playerCard,
    opponentCard,
    clashResult,
    briscolaSuit,
    money: 10,
    playerHand: [],
    consecutiveWinStreak: 0,
    totalTricksPlayedThisRound: 0,
    remainingTricksCount: 20,
    capturedDenariRanksThisRound: new Set<number>(),
    disabledJokerIndex: null,
    ...overrides,
  };
}

const apply = (jokers: Joker[], ctx: JokerScoringContext) =>
  JOKER_EFFECTS.applyJokersToTrick(jokers, ctx);

// A trick the player wins without trump: Asso di Coppe over the Quattro.
const crossWin = (): ClashSetup => ({
  playerCard: card('coppe', 1, 'p_coppe_asso'),
  opponentCard: card('spade', 4, 'o_spade_quattro'),
});

// The same win, but taken with a Briscola.
const trumpWin = (): ClashSetup => ({
  playerCard: card('denari', 2, 'p_denari_due'),
  opponentCard: card('coppe', 4, 'o_coppe_quattro'),
});

describe('Il Tirchio', () => {
  // Powers 1, 4 and 8 are the Due, il Sei and il Re.
  const cheapest = card('denari', 2, 'p_due');
  const middling = card('denari', 6, 'p_sei');
  const dearest = card('coppe', 10, 'p_re');

  it('paga +8 Mult quando la carta giocata era la piu\' bassa della mano', () => {
    const ctx = context(
      { playerCard: cheapest, opponentCard: card('coppe', 4, 'o') },
      { playerHand: [middling, dearest] }
    );
    const mod = apply([joker('j_tirchio')], ctx);
    expect(mod.multToAdd).toBe(8);
    expect(mod.triggeredJokerIds).toContain('j_tirchio');
  });

  it('non paga nulla se in mano restava una carta piu\' bassa', () => {
    const ctx = context(
      { playerCard: middling, opponentCard: card('coppe', 4, 'o') },
      { playerHand: [cheapest, dearest] }
    );
    const mod = apply([joker('j_tirchio')], ctx);
    expect(mod.multToAdd).toBe(0);
    expect(mod.triggeredJokerIds).not.toContain('j_tirchio');
  });

  it('conta anche un pareggio sul minimo', () => {
    const twin = card('coppe', 2, 'p_due_gemello');
    const ctx = context(
      { playerCard: cheapest, opponentCard: card('coppe', 4, 'o') },
      { playerHand: [twin, dearest] }
    );
    expect(apply([joker('j_tirchio')], ctx).multToAdd).toBe(8);
  });

  it('non paga su una presa persa', () => {
    const ctx = context(
      { playerCard: card('coppe', 2, 'p'), opponentCard: card('denari', 4, 'o'), playerLed: true },
      { playerHand: [dearest] }
    );
    expect(ctx.clashResult.playerWon).toBe(false);
    expect(apply([joker('j_tirchio')], ctx).multToAdd).toBe(0);
  });
});

describe('Il Sottobicchiere', () => {
  it('paga +60 Chips su una presa a semi incrociati senza Briscola', () => {
    const ctx = context(crossWin());
    expect(ctx.clashResult.playerIsBriscola).toBe(false);
    expect(apply([joker('j_sottobicchiere')], ctx).chipsToAdd).toBe(60);
  });

  it('non paga se la presa e\' stata vinta con una Briscola', () => {
    const ctx = context(trumpWin());
    expect(ctx.clashResult.playerIsBriscola).toBe(true);
    expect(apply([joker('j_sottobicchiere')], ctx).chipsToAdd).toBe(0);
  });

  it('non paga se i semi effettivi coincidono', () => {
    const ctx = context({
      playerCard: card('coppe', 1, 'p'),
      opponentCard: card('coppe', 4, 'o'),
    });
    expect(apply([joker('j_sottobicchiere')], ctx).chipsToAdd).toBe(0);
  });
});

describe('Il Due di Picche', () => {
  it('paga +100 Chips se vinci giocando un Due', () => {
    const ctx = context(trumpWin());
    expect(apply([joker('j_due_di_picche')], ctx).chipsToAdd).toBe(100);
  });

  it('non paga per il Due catturato all\'avversario', () => {
    const ctx = context({
      playerCard: card('denari', 4, 'p_quattro'),
      opponentCard: card('coppe', 2, 'o_due'),
    });
    expect(ctx.clashResult.playerWon).toBe(true);
    expect(apply([joker('j_due_di_picche')], ctx).chipsToAdd).toBe(0);
  });
});

describe('Il Vecchio Volpone', () => {
  it('paga +10 Mult se vince senza Briscola tenendone una in mano', () => {
    const ctx = context(crossWin(), { playerHand: [card('denari', 5, 'h_briscola')] });
    expect(apply([joker('j_vecchio_volpone')], ctx).multToAdd).toBe(10);
  });

  it('legge la mano DOPO la giocata: senza Briscola residua non paga', () => {
    const ctx = context(crossWin(), { playerHand: [card('coppe', 5, 'h_liscia')] });
    expect(apply([joker('j_vecchio_volpone')], ctx).multToAdd).toBe(0);
  });

  it('non paga se la presa e\' stata vinta di Briscola', () => {
    const ctx = context(trumpWin(), { playerHand: [card('denari', 5, 'h_briscola')] });
    expect(apply([joker('j_vecchio_volpone')], ctx).multToAdd).toBe(0);
  });

  it('conta una Wild in mano come Briscola', () => {
    const wild = card('coppe', 5, 'h_wild', { enhancement: 'wild' });
    const ctx = context(crossWin(), { playerHand: [wild] });
    expect(apply([joker('j_vecchio_volpone')], ctx).multToAdd).toBe(10);
  });
});

describe('Il Contropiede', () => {
  const fire = (consecutiveLossStreak: number, jokers = [joker('j_contropiede')]) =>
    apply(jokers, context(crossWin(), { consecutiveLossStreak })).xMultToMultiply;

  it('non e\' armato dopo una sola sconfitta', () => {
    expect(fire(0)).toBe(1);
    expect(fire(1)).toBe(1);
  });

  it('paga x1.6 sulla prima presa vinta dopo 2 sconfitte di fila', () => {
    expect(fire(2)).toBeCloseTo(1.6, 5);
  });

  it('resta armato oltre la seconda sconfitta', () => {
    expect(fire(5)).toBeCloseTo(1.6, 5);
  });

  it('si azzera dopo aver pagato: la presa successiva riparte da zero', () => {
    // La vittoria che lo incassa azzera lo streak, quindi la presa dopo vede 0.
    expect(fire(2)).toBeCloseTo(1.6, 5);
    expect(fire(0)).toBe(1);
  });

  it('due copie si moltiplicano fra loro', () => {
    const copies = [joker('j_contropiede', 'cp-1'), joker('j_contropiede', 'cp-2')];
    expect(fire(2, copies)).toBeCloseTo(2.56, 5);
  });
});

describe('Il Temerario', () => {
  it('paga +8 Mult quando l\'Azzardo della carta giocata ha pagato', () => {
    const segnata = card('coppe', 1, 'p_segnata', { special: 'segnata' });
    const ctx = context(
      { playerCard: segnata, opponentCard: card('spade', 4, 'o') },
      { azzardoPaidOff: true }
    );
    expect(apply([joker('j_temerario')], ctx).multToAdd).toBe(8);
  });

  it('non paga per una carta senza Azzardo', () => {
    const ctx = context(crossWin(), { azzardoPaidOff: true });
    expect(apply([joker('j_temerario')], ctx).multToAdd).toBe(0);
  });

  it('non paga per un Azzardo che non ha soddisfatto la sua condizione', () => {
    // La Traditrice paga solo se APRE la presa e la vince: se risponde e vince
    // ha il badge e nessun bonus, quindi il Temerario resta a bocca asciutta.
    const traditrice = card('coppe', 1, 'p_traditrice', { special: 'traditrice' });
    const opponentCard = card('coppe', 4, 'o_coppe_quattro');
    const base = {
      money: 10,
      playerHand: [] as PlayingCard[],
      consecutiveWinStreak: 0,
      totalTricksPlayedThisRound: 0,
      remainingTricksCount: 20,
      capturedDenariRanksThisRound: new Set<number>(),
    };

    const led = calculateTrickScore(
      traditrice,
      opponentCard,
      resolveTrick(traditrice, opponentCard, BRISCOLA, true),
      BRISCOLA,
      [joker('j_temerario')],
      null,
      base,
      1,
      null,
      true
    );
    expect(led.triggeredJokerIds).toContain('j_temerario');

    const answered = calculateTrickScore(
      traditrice,
      opponentCard,
      resolveTrick(opponentCard, traditrice, BRISCOLA, false),
      BRISCOLA,
      [joker('j_temerario')],
      null,
      base,
      1,
      null,
      false
    );
    expect(answered.triggeredJokerIds).not.toContain('j_temerario');
  });
});

describe('Il Restauratore', () => {
  const chipsFor = (extras: Parameters<typeof card>[3]) =>
    apply(
      [joker('j_restauratore')],
      context({ playerCard: card('coppe', 1, 'p', extras), opponentCard: card('spade', 4, 'o') })
    ).chipsToAdd;

  it('paga +20 Chips per categoria presente', () => {
    expect(chipsFor({ edition: 'foil', seal: 'red' })).toBe(40);
  });

  it('arriva a +80 Chips con tutte e quattro le categorie', () => {
    expect(
      chipsFor({ edition: 'foil', seal: 'red', enhancement: 'bonus', special: 'segnata' })
    ).toBe(80);
  });

  it('non paga per una carta senza modifiche', () => {
    expect(chipsFor({})).toBe(0);
  });
});

describe('Il Conto Sospeso', () => {
  const empty = () => new Set<string>();

  it('non scatta sotto la soglia di spesa', () => {
    const settled = JOKER_EFFECTS.applyShopSpend(
      [joker('j_conto_sospeso', 'cs-1')],
      CONTO_SOSPESO_SPEND_THRESHOLD - 1,
      empty()
    );
    expect(settled.paidInstanceIds).toHaveLength(0);
    expect(settled.jokers[0].stats?.accumulatedMult ?? 0).toBe(0);
  });

  it('paga +1 Mult permanente raggiunta la soglia', () => {
    const settled = JOKER_EFFECTS.applyShopSpend(
      [joker('j_conto_sospeso', 'cs-1')],
      CONTO_SOSPESO_SPEND_THRESHOLD,
      empty()
    );
    expect(settled.paidInstanceIds).toEqual(['cs-1']);
    expect(settled.jokers[0].stats?.accumulatedMult).toBe(1);
  });

  it('scatta una volta sola per negozio', () => {
    const paid = empty();
    const first = JOKER_EFFECTS.applyShopSpend([joker('j_conto_sospeso', 'cs-1')], 8, paid);
    first.paidInstanceIds.forEach((id) => paid.add(id));
    const second = JOKER_EFFECTS.applyShopSpend(first.jokers, 20, paid);
    expect(second.paidInstanceIds).toHaveLength(0);
    expect(second.jokers[0].stats?.accumulatedMult).toBe(1);
  });

  it('ricomincia nel negozio successivo e la crescita resta', () => {
    const shopOne = JOKER_EFFECTS.applyShopSpend([joker('j_conto_sospeso', 'cs-1')], 8, empty());
    const shopTwo = JOKER_EFFECTS.applyShopSpend(shopOne.jokers, 9, empty());
    expect(shopTwo.jokers[0].stats?.accumulatedMult).toBe(2);
  });

  it('non scatta entrando in un negozio con la spesa gia\' fatta altrove', () => {
    // Un nuovo negozio parte da zero speso: nessun progresso viene ereditato.
    const carried = JOKER_EFFECTS.applyShopSpend([joker('j_conto_sospeso', 'cs-1')], 0, empty());
    expect(carried.paidInstanceIds).toHaveLength(0);
  });

  it('tiene separate due copie tramite instanceId', () => {
    const copies = [joker('j_conto_sospeso', 'cs-1'), joker('j_conto_sospeso', 'cs-2')];
    const paid = new Set<string>(['cs-1']);
    const settled = JOKER_EFFECTS.applyShopSpend(copies, 8, paid);
    expect(settled.paidInstanceIds).toEqual(['cs-2']);
    expect(settled.jokers[0].stats?.accumulatedMult ?? 0).toBe(0);
    expect(settled.jokers[1].stats?.accumulatedMult).toBe(1);
  });

  it('versa il Mult accumulato su ogni presa vinta', () => {
    const grown = JOKER_EFFECTS.applyShopSpend([joker('j_conto_sospeso', 'cs-1')], 8, empty()).jokers;
    expect(apply(grown, context(crossWin())).multToAdd).toBe(1);
  });
});

describe('Il Contacarte', () => {
  it('paga +8 Mult se il rango avversario era gia\' uscito', () => {
    const ctx = context(
      { playerCard: card('coppe', 1, 'p'), opponentCard: card('bastoni', 7, 'o_sette') },
      { seenRanksBeforeTrick: new Set([7]) }
    );
    expect(apply([joker('j_contacarte')], ctx).multToAdd).toBe(8);
  });

  it('la presa corrente non puo\' auto-soddisfare la condizione', () => {
    const ctx = context(
      { playerCard: card('coppe', 7, 'p_sette'), opponentCard: card('bastoni', 7, 'o_sette') },
      { seenRanksBeforeTrick: new Set<number>() }
    );
    expect(apply([joker('j_contacarte')], ctx).multToAdd).toBe(0);
  });

  it('si azzera a inizio incontro', () => {
    const ctx = context(
      { playerCard: card('coppe', 1, 'p'), opponentCard: card('bastoni', 7, 'o_sette') },
      { seenRanksBeforeTrick: new Set([4, 5]) }
    );
    expect(apply([joker('j_contacarte')], ctx).multToAdd).toBe(0);
  });

  it('ignora il seme: conta solo il rango', () => {
    const ctx = context(
      { playerCard: card('coppe', 1, 'p'), opponentCard: card('bastoni', 7, 'o_sette') },
      { seenRanksBeforeTrick: new Set([7]) }
    );
    expect(apply([joker('j_contacarte')], ctx).multToAdd).toBe(8);
  });
});

describe('Il Segnapunti', () => {
  const fire = (roundPointsTaken: number, opponentPointsTaken: number) =>
    apply(
      [joker('j_segnapunti')],
      context(crossWin(), { roundPointsTaken, opponentPointsTaken })
    ).multToAdd;

  it('paga +8 Mult da dietro nei Punti Briscola', () => {
    expect(fire(10, 21)).toBe(8);
  });

  it('non paga in pareggio', () => {
    expect(fire(21, 21)).toBe(0);
  });

  it('non paga da davanti', () => {
    expect(fire(30, 21)).toBe(0);
  });

  it('confronta lo stato PRIMA della presa', () => {
    // 0-0 alla prima presa non e' un ritardo: nessun bonus.
    expect(fire(0, 0)).toBe(0);
  });
});

describe('i nuovi jolly rispettano il silenzio del Boss e le copie multiple', () => {
  const SILENCEABLE: Array<[string, Partial<JokerScoringContext>, ClashSetup]> = [
    ['j_tirchio', { playerHand: [card('denari', 10, 'h_re')] }, trumpWin()],
    ['j_sottobicchiere', {}, crossWin()],
    ['j_due_di_picche', {}, trumpWin()],
    ['j_vecchio_volpone', { playerHand: [card('denari', 5, 'h')] }, crossWin()],
    ['j_contropiede', { consecutiveLossStreak: 3 }, crossWin()],
    ['j_restauratore', {}, { playerCard: card('coppe', 1, 'p', { edition: 'foil' }), opponentCard: card('spade', 4, 'o') }],
    ['j_contacarte', { seenRanksBeforeTrick: new Set([4]) }, crossWin()],
    ['j_segnapunti', { roundPointsTaken: 0, opponentPointsTaken: 11 }, crossWin()],
  ];

  it.each(SILENCEABLE)('%s tace quando il Boss lo zittisce', (id, overrides, setup) => {
    const jokers = [joker(id)];
    const live = apply(jokers, context(setup, overrides));
    expect(live.triggeredJokerIds).toContain(id);

    const silenced = apply(jokers, context(setup, { ...overrides, disabledJokerIndex: 0 }));
    expect(silenced.triggeredJokerIds).not.toContain(id);
    expect(silenced.chipsToAdd).toBe(0);
    expect(silenced.multToAdd).toBe(0);
    expect(silenced.xMultToMultiply).toBe(1);
  });

  it.each(SILENCEABLE)('%s si somma con una seconda copia', (id, overrides, setup) => {
    const single = apply([joker(id, `${id}-1`)], context(setup, overrides));
    const double = apply(
      [joker(id, `${id}-1`), joker(id, `${id}-2`)],
      context(setup, overrides)
    );
    expect(double.chipsToAdd).toBe(single.chipsToAdd * 2);
    expect(double.multToAdd).toBe(single.multToAdd * 2);
    expect(double.xMultToMultiply).toBeCloseTo(single.xMultToMultiply ** 2, 5);
  });

  it('il Temerario tace quando il Boss lo zittisce', () => {
    const segnata = card('coppe', 1, 'p_segnata', { special: 'segnata' });
    const setup = { playerCard: segnata, opponentCard: card('spade', 4, 'o') };
    expect(
      apply([joker('j_temerario')], context(setup, { azzardoPaidOff: true, disabledJokerIndex: 0 }))
        .multToAdd
    ).toBe(0);
  });

  it('il Conto Sospeso tace quando il Boss lo zittisce', () => {
    const grown = JOKER_EFFECTS.applyShopSpend(
      [joker('j_conto_sospeso', 'cs-1')],
      CONTO_SOSPESO_SPEND_THRESHOLD,
      new Set<string>()
    ).jokers;
    expect(apply(grown, context(crossWin(), { disabledJokerIndex: 0 })).multToAdd).toBe(0);
  });
});

describe('catalogo dei nuovi jolly', () => {
  const NEW_IDS = [
    'j_tirchio',
    'j_sottobicchiere',
    'j_due_di_picche',
    'j_vecchio_volpone',
    'j_contropiede',
    'j_temerario',
    'j_restauratore',
    'j_conto_sospeso',
    'j_contacarte',
    'j_segnapunti',
  ];

  it('sono tutti nel catalogo, una volta sola', () => {
    for (const id of NEW_IDS) {
      expect(ALL_JOKERS.filter((j) => j.id === id)).toHaveLength(1);
    }
  });

  it('le descrizioni dichiarano gli stessi numeri del runtime', () => {
    const describedBy = (id: string) => ALL_JOKERS.find((j) => j.id === id)!;
    expect(describedBy('j_tirchio').description).toContain('+8 Mult');
    expect(describedBy('j_sottobicchiere').description).toContain('+60 Chips');
    expect(describedBy('j_due_di_picche').description).toContain('+100 Chips');
    expect(describedBy('j_vecchio_volpone').description).toContain('+10 Mult');
    expect(describedBy('j_contropiede').description).toContain('x1.6 Mult');
    expect(describedBy('j_temerario').description).toContain('+8 Mult');
    expect(describedBy('j_restauratore').description).toContain('+20 Chips');
    expect(describedBy('j_restauratore').description).toContain('+80 Chips');
    expect(describedBy('j_conto_sospeso').description).toContain(
      `$${CONTO_SOSPESO_SPEND_THRESHOLD}`
    );
    expect(describedBy('j_contacarte').description).toContain('+8 Mult');
    expect(describedBy('j_segnapunti').description).toContain('+8 Mult');
  });

  it('ogni copia acquistata ha il proprio instanceId e le proprie stats', () => {
    const first = instantiateJoker(ALL_JOKERS.find((j) => j.id === 'j_conto_sospeso')!);
    const second = instantiateJoker(ALL_JOKERS.find((j) => j.id === 'j_conto_sospeso')!);
    expect(first.instanceId).not.toBe(second.instanceId);
    expect(first.stats).not.toBe(second.stats);
  });
});
