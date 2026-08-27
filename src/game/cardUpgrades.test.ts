import { describe, expect, it } from 'vitest';
import {
  allowedEnhancementsFor,
  allowedSpecialsFor,
  isCardModifierCombinationValid,
  rollCardUpgrade,
} from './cardUpgrades';
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

  it('never hands out more than one Azzardo, and never the retired glass', () => {
    const plain = createCard('coppe', 7);
    for (let i = 0; i < 300; i++) {
      const offer = rollCardUpgrade(plain);
      // 'glass' is gone from the Enhancement type entirely; nothing may
      // resurrect it through a cast or a stale literal.
      expect(offer.enhancement as string).not.toBe('glass');
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

describe('combinations that cancel each other out are never offered', () => {
  it('Acciaio and an Azzardo are refused together', () => {
    for (const special of ['segnata', 'vetro', 'debito', 'traditrice'] as const) {
      const verdict = isCardModifierCombinationValid(
        createCard('spade', 5, 'standard', 'none', 'steel', undefined, special)
      );
      expect(verdict.valid).toBe(false);
      expect(verdict.reason).toMatch(/Acciaio/);
    }
  });

  it('a Pietra Segnata is refused, because the Segnata would cost nothing', () => {
    const verdict = isCardModifierCombinationValid(
      createCard('coppe', 6, 'standard', 'none', 'stone', undefined, 'segnata')
    );
    expect(verdict.valid).toBe(false);
    expect(verdict.reason).toMatch(/Pietra/);
  });

  it('a Pietra with any other Azzardo is fine: both sides can still happen', () => {
    for (const special of ['vetro', 'debito', 'traditrice'] as const) {
      expect(
        isCardModifierCombinationValid(
          createCard('coppe', 6, 'standard', 'none', 'stone', undefined, special)
        ).valid
      ).toBe(true);
    }
  });

  it('the ordinary combinations are all still allowed', () => {
    const editions = ['standard', 'foil', 'holo', 'polychrome', 'gold'] as const;
    const seals = ['none', 'red', 'gold', 'blue', 'purple'] as const;
    const specials = ['none', 'segnata', 'vetro', 'debito', 'traditrice'] as const;
    for (const edition of editions) {
      for (const seal of seals) {
        for (const special of specials) {
          // Edition and Seal never conflict with anything: they are the safe
          // half of the system and this pins that down.
          expect(
            isCardModifierCombinationValid(
              createCard('denari', 7, edition, seal, 'bonus', undefined, special)
            ).valid
          ).toBe(true);
        }
      }
    }
  });

  it('an Acciaio card is offered upgrades, just never an Azzardo', () => {
    const steel = createCard('bastoni', 2, 'standard', 'none', 'steel');
    expect(allowedSpecialsFor(steel)).toEqual([]);

    let sawAChange = false;
    for (let i = 0; i < 300; i++) {
      const offer = rollCardUpgrade(steel);
      expect(isCardModifierCombinationValid(offer).valid).toBe(true);
      if (offer.special !== 'none') expect(offer.enhancement).not.toBe('steel');
      if (
        offer.edition !== steel.edition ||
        offer.seal !== steel.seal ||
        offer.enhancement !== steel.enhancement
      ) {
        sawAChange = true;
      }
    }
    // It is not stuck: it still gets real offers, they are just never Azzardi.
    expect(sawAChange).toBe(true);
  });

  it('a Segnata card is never offered Pietra on top', () => {
    const marked = createCard('spade', 9, 'standard', 'none', 'none', undefined, 'segnata');
    expect(allowedEnhancementsFor(marked)).not.toContain('stone');
    expect(allowedEnhancementsFor(marked)).not.toContain('steel');
    for (let i = 0; i < 300; i++) {
      expect(isCardModifierCombinationValid(rollCardUpgrade(marked)).valid).toBe(true);
    }
  });

  it('every offer the booster can make is a legal combination', () => {
    // Sweep the whole starting space: plain cards, every enhancement, every
    // Azzardo, and roll on each of them many times over.
    const bases = [
      createCard('denari', 1),
      createCard('coppe', 4, 'foil', 'red', 'bonus'),
      createCard('spade', 8, 'holo', 'gold', 'steel'),
      createCard('bastoni', 10, 'polychrome', 'blue', 'stone'),
      createCard('denari', 3, 'gold', 'purple', 'mult', undefined, 'vetro'),
      createCard('coppe', 7, 'standard', 'none', 'stone', undefined, 'traditrice'),
    ];
    for (const base of bases) {
      for (let i = 0; i < 200; i++) {
        const offer = rollCardUpgrade(base);
        const verdict = isCardModifierCombinationValid(offer);
        expect({ base: base.id, reason: verdict.reason }).toEqual({
          base: base.id,
          reason: undefined,
        });
      }
    }
  });
});
