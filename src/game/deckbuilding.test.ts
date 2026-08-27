import { describe, expect, it } from 'vitest';
import { createCard, createStandardDeck } from './briscola';
import {
  addCardToRunDeck,
  fallbackWeakestCardId,
  replaceCardInRunDeck,
} from './gameState';
import { PlayingCard } from '../types/game';

const upgraded = (): PlayingCard =>
  createCard('denari', 1, 'polychrome', 'gold', 'mult', 'nuova');

describe('the player chooses which card leaves the run deck', () => {
  it('keeps the deck at exactly 40 cards, replacement after replacement', () => {
    let deck = createStandardDeck();
    expect(deck).toHaveLength(40);

    for (let i = 0; i < 12; i++) {
      const victim = deck[(i * 3) % deck.length];
      deck = replaceCardInRunDeck(deck, victim.id, createCard('coppe', 7, 'foil'));
      expect(deck).toHaveLength(40);
    }
  });

  it('removes the card that was chosen and nothing else', () => {
    const deck = createStandardDeck();
    // Deliberately the strongest card in the deck: the choice is the player's,
    // not the engine's idea of what is worth keeping.
    const victim = [...deck].sort((a, b) => b.points - a.points)[0];

    const next = replaceCardInRunDeck(deck, victim.id, upgraded());

    expect(next.some((card) => card.id === victim.id)).toBe(false);
    expect(next.some((card) => card.id === 'nuova')).toBe(true);
    for (const card of deck) {
      if (card.id === victim.id) continue;
      expect(next.some((c) => c.id === card.id)).toBe(true);
    }
  });

  it('puts the new card in the slot the old one held', () => {
    const deck = createStandardDeck();
    const index = 17;
    const next = replaceCardInRunDeck(deck, deck[index].id, upgraded());
    expect(next[index].id).toBe('nuova');
  });

  it('the new card arrives with its modifiers intact', () => {
    const deck = createStandardDeck();
    const next = replaceCardInRunDeck(deck, deck[0].id, upgraded());
    const added = next.find((card) => card.id === 'nuova')!;

    expect(added.edition).toBe('polychrome');
    expect(added.seal).toBe('gold');
    expect(added.enhancement).toBe('mult');
    expect(added.points).toBe(11);
  });

  it('never leaves two cards sharing an id', () => {
    const deck = createStandardDeck();
    const clash = { ...createCard('spade', 5, 'foil'), id: deck[3].id };

    const next = replaceCardInRunDeck(deck, deck[9].id, clash);

    const ids = next.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(next).toHaveLength(40);
    // The card is still the one that was picked, only its id was re-issued.
    expect(next[9].suit).toBe('spade');
    expect(next[9].edition).toBe('foil');
  });
});

describe('the fallback only covers the paths with no screen to choose in', () => {
  it('an unknown id drops the weakest plain card instead of breaking the deck', () => {
    const deck = createStandardDeck();
    const weakest = fallbackWeakestCardId(deck)!;

    const next = replaceCardInRunDeck(deck, 'questa_carta_non_esiste', upgraded());

    expect(next).toHaveLength(40);
    expect(next.some((card) => card.id === weakest)).toBe(false);
    expect(next.some((card) => card.id === 'nuova')).toBe(true);
  });

  it('addCardToRunDeck still replaces rather than grows', () => {
    const deck = createStandardDeck();
    const next = addCardToRunDeck(deck, createCard('bastoni', 10, 'holo'));
    expect(next).toHaveLength(40);
  });

  it('the fallback spares an upgraded card while a plain one is around', () => {
    const deck = [
      createCard('denari', 2, 'polychrome', 'none', 'none', 'preziosa'),
      createCard('coppe', 4, 'standard', 'none', 'none', 'liscia'),
    ];
    const next = addCardToRunDeck(deck, createCard('spade', 1));
    expect(next.some((card) => card.id === 'preziosa')).toBe(true);
    expect(next.some((card) => card.id === 'liscia')).toBe(false);
  });

  it('but the player may still choose that upgraded card explicitly', () => {
    const deck = [
      createCard('denari', 2, 'polychrome', 'none', 'none', 'preziosa'),
      createCard('coppe', 4, 'standard', 'none', 'none', 'liscia'),
    ];
    const next = replaceCardInRunDeck(deck, 'preziosa', createCard('spade', 1, 'standard', 'none', 'none', 'nuova'));
    expect(next.some((card) => card.id === 'preziosa')).toBe(false);
    expect(next.some((card) => card.id === 'liscia')).toBe(true);
    expect(next).toHaveLength(2);
  });

  it('an empty run deck accepts the card rather than losing it', () => {
    expect(replaceCardInRunDeck([], null, upgraded())).toHaveLength(1);
    expect(fallbackWeakestCardId([])).toBeNull();
  });
});
