import { describe, expect, it } from 'vitest';
import { ALL_JOKERS } from '../data/jokers';
import { CardRank, Joker, PlayingCard, Suit } from '../types/game';
import { createCard, createStandardDeck, RANK_INFO, resolveTrick, SUITS } from './briscola';
import { instantiateJoker } from './itemInstances';
import { JOKER_EFFECTS, JokerScoringContext } from './jokerEffects';

/**
 * The four suits, and nothing that looks like a fifth.
 *
 * `Suit` is 'bastoni' | 'coppe' | 'denari' | 'spade' and the compiler already
 * refuses anything else, so this file is not here to catch a typo - it is here
 * to pin the two places where a suit string is easy to CONFUSE with something
 * that merely reads like one:
 *
 * - `spades_are_briscola` is a BossDebuffType, not a suit. Il Conte promotes
 *   the opponent's Spade to trump; the rule id is not the seme.
 * - `deck_spade` is a deck id, not a suit.
 *
 * Everything below asserts the behaviour those two are involved in, in the
 * canonical spelling.
 */

const card = (suit: Suit, rank: CardRank, id: string): PlayingCard =>
  createCard(suit, rank, 'standard', 'none', 'none', id);

const CONTE = 'spades_are_briscola';

describe('il mazzo parla solo i quattro semi canonici', () => {
  const CANONICAL: Suit[] = ['bastoni', 'coppe', 'denari', 'spade'];

  it('createStandardDeck non contiene nessun altro seme', () => {
    const deck = createStandardDeck();
    const seen = new Set(deck.map((entry) => entry.suit));
    expect([...seen].sort()).toEqual([...CANONICAL].sort());
    for (const entry of deck) {
      expect(CANONICAL).toContain(entry.suit);
    }
  });

  it('quaranta carte, dieci per seme, ogni identita\' una volta sola', () => {
    const deck = createStandardDeck();
    expect(deck).toHaveLength(40);
    for (const suit of CANONICAL) {
      expect(deck.filter((entry) => entry.suit === suit)).toHaveLength(10);
    }
    const identities = new Set(deck.map((entry) => `${entry.suit}_${entry.rank}`));
    expect(identities.size).toBe(40);
    expect(new Set(deck.map((entry) => entry.id)).size).toBe(40);
  });

  it('la tabella dei semi e il tipo Suit dicono la stessa cosa', () => {
    expect(SUITS.map((entry) => entry.id).sort()).toEqual([...CANONICAL].sort());
  });

  it('il seme delle Spade si scrive "spade", al plurale italiano', () => {
    const deck = createStandardDeck();
    expect(deck.some((entry) => entry.suit === 'spade')).toBe(true);
    // 'spades' esiste nel progetto, ma e' l'id di una regola del Boss.
    expect(deck.some((entry) => (entry.suit as string) === 'spades')).toBe(false);
    expect(deck.some((entry) => (entry.suit as string) === 'spada')).toBe(false);
  });
});

describe('Il Conte delle Spade promuove il seme, non lo rinomina', () => {
  // resolveTrick(lead, follow, briscola, leadIsPlayer): il Conte apre, quindi
  // leadIsPlayer = false e la seconda carta e' quella del giocatore.
  const conteLeads = (conte: PlayingCard, player: PlayingCard, briscola: Suit = 'coppe') =>
    resolveTrick(conte, player, briscola, false, CONTE);

  it('Spade contro Spade resta un duello normale: 2 di Spade perde contro l\'Asso', () => {
    // La promozione si spegne quando entrambe le carte sono Spade, altrimenti
    // sarebbero due briscole dello stesso seme e il rango deciderebbe comunque.
    const clash = conteLeads(card('spade', 2, 'conte_due'), card('spade', 1, 'asso'));
    expect(clash.playerWon).toBe(true);
    expect(RANK_INFO[1].power).toBeGreaterThan(RANK_INFO[2].power);
  });

  it('il 2 di Spade del Conte batte il Re di Denari', () => {
    const clash = conteLeads(card('spade', 2, 'conte_due'), card('denari', 10, 're_denari'));
    expect(clash.playerWon).toBe(false);
    // Vince perche' e' trump, non perche' vale di piu': il Re ha piu' potere.
    expect(clash.opponentIsBriscola).toBe(true);
    expect(RANK_INFO[10].power).toBeGreaterThan(RANK_INFO[2].power);
  });

  it('contro una vera Briscola vale la normale gerarchia fra Briscole', () => {
    // Entrambe trump: decide il rango, in un verso e nell'altro.
    const playerHigher = conteLeads(card('spade', 2, 'conte_due'), card('coppe', 4, 'coppe_quattro'));
    expect(playerHigher.playerWon).toBe(true);
    expect(playerHigher.playerIsBriscola).toBe(true);
    expect(playerHigher.opponentIsBriscola).toBe(true);

    const contHigher = conteLeads(card('spade', 1, 'conte_asso'), card('coppe', 4, 'coppe_quattro'));
    expect(contHigher.playerWon).toBe(false);

    const playerAce = conteLeads(card('spade', 10, 'conte_re'), card('coppe', 1, 'coppe_asso'));
    expect(playerAce.playerWon).toBe(true);
  });

  it('senza il Conte le Spade avversarie sono un seme come un altro', () => {
    const clash = resolveTrick(
      card('spade', 2, 'due_spade'),
      card('denari', 10, 're_denari'),
      'coppe',
      false
    );
    // Semi incrociati, nessuna briscola: la presa resta a chi ha aperto.
    expect(clash.playerWon).toBe(false);
    expect(clash.opponentIsBriscola).toBe(false);
    expect(clash.opponentEffectiveSuit).toBe('spade');
  });
});

describe('Lo Spadaccino legge il seme canonico', () => {
  const spadaccino = (): Joker =>
    instantiateJoker(ALL_JOKERS.find((entry) => entry.id === 'j_spadaccino')!, 'spadaccino-1');

  const context = (playerCard: PlayingCard, opponentCard: PlayingCard): JokerScoringContext => ({
    playerCard,
    opponentCard,
    clashResult: resolveTrick(playerCard, opponentCard, 'denari', true),
    briscolaSuit: 'denari',
    money: 10,
    playerHand: [],
    tricksWonThisRound: 0,
    consecutiveWinStreak: 0,
    totalTricksPlayedThisRound: 0,
    remainingTricksCount: 20,
    capturedDenariRanksThisRound: new Set<number>(),
    disabledJokerIndex: null,
  });

  it('scatta quando la carta giocata e\' di Spade', () => {
    const ctx = context(card('spade', 1, 'p_spade'), card('coppe', 4, 'o_coppe'));
    expect(ctx.clashResult.playerWon).toBe(true);
    const modifier = JOKER_EFFECTS.applyJokersToTrick([spadaccino()], ctx);
    expect(modifier.multToAdd).toBe(12);
    expect(modifier.triggeredJokerIds).toContain('j_spadaccino');
  });

  it('non scatta per le Spade catturate all\'avversario', () => {
    const ctx = context(card('denari', 4, 'p_denari'), card('spade', 1, 'o_spade'));
    expect(ctx.clashResult.playerWon).toBe(true);
    expect(JOKER_EFFECTS.applyJokersToTrick([spadaccino()], ctx).multToAdd).toBe(0);
  });

  it('non scatta sugli altri tre semi', () => {
    for (const suit of ['bastoni', 'coppe', 'denari'] as Suit[]) {
      const ctx = context(card(suit, 1, `p_${suit}`), card('coppe', 4, 'o_coppe'));
      const modifier = JOKER_EFFECTS.applyJokersToTrick([spadaccino()], ctx);
      expect(modifier.triggeredJokerIds).not.toContain('j_spadaccino');
    }
  });

  it('il numero dichiarato nel catalogo e\' quello che paga', () => {
    const catalogue = ALL_JOKERS.find((entry) => entry.id === 'j_spadaccino')!;
    expect(catalogue.multBonus).toBe(12);
    expect(catalogue.description).toContain('Spade');
  });
});

describe('gli identificatori che somigliano a un seme non lo sono', () => {
  it('deck_spade e\' l\'id di un mazzo, non un Suit', () => {
    // Se qualcuno lo "normalizzasse" a un seme, il mazzo sparirebbe dal picker
    // e ogni salvataggio che lo nomina diventerebbe irrecuperabile.
    expect('deck_spade'.startsWith('deck_')).toBe(true);
    expect(SUITS.map((entry) => entry.id)).not.toContain('deck_spade');
  });

  it('spades_are_briscola e\' una regola del Boss, non un Suit', () => {
    expect(SUITS.map((entry) => entry.id)).not.toContain(CONTE);
    // E si applica alle carte del seme scritto correttamente.
    const promoted = resolveTrick(
      card('spade', 2, 'conte'),
      card('bastoni', 10, 'player'),
      'coppe',
      false,
      CONTE
    );
    expect(promoted.opponentIsBriscola).toBe(true);
  });
});
