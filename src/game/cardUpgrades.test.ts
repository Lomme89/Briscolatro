import { describe, expect, it } from 'vitest';
import { rollCardUpgrade } from './cardUpgrades';
import { checkRunDeckIntegrity, createRunDeck, upgradeCardInRunDeck } from './gameState';
import { createCard } from './briscola';
import { ALL_DECKS } from '../data/decks';

const napoletano = () => createRunDeck(ALL_DECKS[0]);

describe('a booster offer is a card you already own', () => {
  it('never changes the identity of the card it is offering', () => {
    const deck = napoletano();
    for (const card of deck) {
      const offer = rollCardUpgrade(card);
      expect(offer.suit).toBe(card.suit);
      expect(offer.rank).toBe(card.rank);
      expect(offer.points).toBe(card.points);
      expect(offer.power).toBe(card.power);
    }
  });

  it('always changes something: an offer that does nothing is not an offer', () => {
    const plain = createCard('spade', 4);
    for (let i = 0; i < 200; i++) {
      const offer = rollCardUpgrade(plain);
      const changed =
        offer.edition !== plain.edition ||
        offer.enhancement !== plain.enhancement ||
        offer.seal !== plain.seal ||
        offer.special !== plain.special;
      expect(changed).toBe(true);
    }
  });

  it('never hands out more than one Azzardo, and never the old glass', () => {
    const plain = createCard('coppe', 7);
    for (let i = 0; i < 300; i++) {
      const offer = rollCardUpgrade(plain);
      expect(offer.enhancement).not.toBe('glass');
      // `special` is a single field: one Azzardo per card, by construction.
      expect(['none', 'segnata', 'vetro', 'debito', 'traditrice']).toContain(offer.special);
    }
  });

  it('a whole run of booster picks keeps the forty identities intact', () => {
    // The booster draws from the run deck, so there is no card to remove and
    // nothing that can go in twice, however many packs are opened.
    let deck = napoletano();
    for (let pack = 0; pack < 60; pack++) {
      const drawn = deck[Math.floor(Math.random() * deck.length)];
      deck = upgradeCardInRunDeck(deck, rollCardUpgrade(drawn));
      const integrity = checkRunDeckIntegrity(deck);
      expect(integrity.problems).toEqual([]);
    }
    expect(deck).toHaveLength(40);
  });
});
