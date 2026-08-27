import { describe, expect, it } from 'vitest';
import { createCard } from './briscola';
import { isCardModifierCombinationValid, rollCardUpgrade } from './cardUpgrades';
import {
  checkRunDeckIntegrity,
  clearSpecialInRunDeck,
  createRunDeck,
  upgradeCardInRunDeck,
} from './gameState';
import { ALL_DECKS } from '../data/decks';
import { PlayingCard, Suit } from '../types/game';

const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const SUITS: Suit[] = ['denari', 'coppe', 'spade', 'bastoni'];

const napoletano = () => createRunDeck(ALL_DECKS[0]);

function identities(deck: PlayingCard[]): string[] {
  return deck.map((card) => `${card.suit}_${card.rank}`).sort();
}

describe('the run deck is always the forty Italian cards', () => {
  it('a fresh run deck passes the integrity check', () => {
    const result = checkRunDeckIntegrity(napoletano());
    expect(result.problems).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('every starting deck in the game passes it too', () => {
    // Deck perks rewrite cards in place; none of them may add or drop one.
    for (const definition of ALL_DECKS) {
      const result = checkRunDeckIntegrity(createRunDeck(definition));
      expect({ deck: definition.id, problems: result.problems }).toEqual({
        deck: definition.id,
        problems: [],
      });
    }
  });

  it('catches a duplicate identity', () => {
    const deck = napoletano();
    const index = deck.findIndex((c) => c.suit === 'spade' && c.rank === 4);
    const other = deck.findIndex((c) => c.suit === 'coppe' && c.rank === 2);
    deck[other] = { ...deck[index], id: 'clone' };

    const result = checkRunDeckIntegrity(deck);
    expect(result.valid).toBe(false);
    expect(result.problems.some((p) => /4 di spade compare 2 volte/.test(p))).toBe(true);
    expect(result.problems.some((p) => /manca 2 di coppe/.test(p))).toBe(true);
  });

  it('catches a deck of the wrong size', () => {
    expect(checkRunDeckIntegrity(napoletano().slice(0, 39)).valid).toBe(false);
  });
});

describe('upgrading the 4 di Spade upgrades YOUR 4 di Spade', () => {
  it('keeps 40 cards, one 4 di Spade, and the other 39 identities', () => {
    const deck = napoletano();
    const before = identities(deck);
    const mine = deck.find((c) => c.suit === 'spade' && c.rank === 4)!;

    const next = upgradeCardInRunDeck(
      deck,
      createCard('spade', 4, 'foil', 'gold', 'bonus', 'carta_della_bustina', 'vetro')
    );

    expect(next).toHaveLength(40);
    expect(next.filter((c) => c.suit === 'spade' && c.rank === 4)).toHaveLength(1);
    expect(identities(next)).toEqual(before);
    expect(checkRunDeckIntegrity(next).valid).toBe(true);

    const upgraded = next.find((c) => c.suit === 'spade' && c.rank === 4)!;
    expect(upgraded.special).toBe('vetro');
    expect(upgraded.edition).toBe('foil');
    expect(upgraded.seal).toBe('gold');
    // It is the same card: same id, same slot, same points.
    expect(upgraded.id).toBe(mine.id);
    expect(upgraded.points).toBe(mine.points);
    expect(next.indexOf(upgraded)).toBe(deck.indexOf(mine));
  });

  it('several upgrades to the same card never make a second copy', () => {
    let deck = napoletano();
    deck = upgradeCardInRunDeck(deck, createCard('coppe', 10, 'foil'));
    deck = upgradeCardInRunDeck(deck, createCard('coppe', 10, 'standard', 'red', 'none', undefined, 'segnata'));
    deck = upgradeCardInRunDeck(deck, createCard('coppe', 10, 'polychrome', 'none', 'mult', undefined, 'debito'));

    expect(deck).toHaveLength(40);
    expect(deck.filter((c) => c.suit === 'coppe' && c.rank === 10)).toHaveLength(1);
    expect(checkRunDeckIntegrity(deck).valid).toBe(true);

    // One Azzardo at a time: the last one applied is the one that stands.
    const card = deck.find((c) => c.suit === 'coppe' && c.rank === 10)!;
    expect(card.special).toBe('debito');
    expect(card.edition).toBe('polychrome');
  });

  it('an upgrade for an identity that is not there is refused, never appended', () => {
    const deck = napoletano().filter((c) => !(c.suit === 'bastoni' && c.rank === 7));
    const next = upgradeCardInRunDeck(deck, createCard('bastoni', 7, 'foil'));
    expect(next).toHaveLength(39);
    expect(next).toBe(deck);
  });

  it('upgrading every card in the deck still leaves forty unique identities', () => {
    let deck = napoletano();
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck = upgradeCardInRunDeck(deck, createCard(suit, rank, 'holo', 'none', 'none', undefined, 'vetro'));
      }
    }
    expect(deck).toHaveLength(40);
    expect(checkRunDeckIntegrity(deck).valid).toBe(true);
    expect(deck.every((c) => c.special === 'vetro')).toBe(true);
  });

  it('a broken Vetro leaves the card in the deck, only plainer', () => {
    let deck = upgradeCardInRunDeck(
      napoletano(),
      createCard('denari', 3, 'standard', 'none', 'none', undefined, 'vetro')
    );
    const target = deck.find((c) => c.suit === 'denari' && c.rank === 3)!;

    deck = clearSpecialInRunDeck(deck, target.id);

    expect(deck).toHaveLength(40);
    expect(deck.find((c) => c.id === target.id)!.special).toBe('none');
    expect(checkRunDeckIntegrity(deck).valid).toBe(true);
  });
});

describe('a whole run of upgrades never breaks the deck', () => {
  it('two hundred booster picks leave forty unique identities, all legal', () => {
    let deck = napoletano();
    for (let i = 0; i < 200; i++) {
      const drawn = deck[Math.floor(Math.random() * deck.length)];
      const offer = rollCardUpgrade(drawn);
      expect(isCardModifierCombinationValid(offer).valid).toBe(true);
      deck = upgradeCardInRunDeck(deck, offer);
      expect(checkRunDeckIntegrity(deck).problems).toEqual([]);
    }

    expect(deck).toHaveLength(40);
    expect(new Set(deck.map((c) => `${c.suit}_${c.rank}`)).size).toBe(40);
    // Nothing in the deck ended up in a combination the game refuses to make.
    for (const card of deck) {
      expect(isCardModifierCombinationValid(card).valid).toBe(true);
      expect(card.enhancement as string).not.toBe('glass');
    }
  });

  it('hammering the same card two hundred times still leaves one of it', () => {
    let deck = napoletano();
    for (let i = 0; i < 200; i++) {
      const mine = deck.find((c) => c.suit === 'spade' && c.rank === 4)!;
      deck = upgradeCardInRunDeck(deck, rollCardUpgrade(mine));
      expect(deck.filter((c) => c.suit === 'spade' && c.rank === 4)).toHaveLength(1);
    }
    expect(checkRunDeckIntegrity(deck).valid).toBe(true);
  });
});
