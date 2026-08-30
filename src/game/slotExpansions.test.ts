import { describe, expect, it } from 'vitest';
import { ALL_DECKS } from '../data/decks';
import { ALL_VOUCHERS } from '../data/unoCards';
import {
  applyTavoloAllargato,
  CAMPAIGN_SLOT_RULES,
  getConsumableSlotCap,
  getJokerSlotCap,
  getNextConsumableExpansion,
  getNextJokerExpansion,
  isTavoloAllargatoUseful,
  purchaseSlotExpansion,
  SlotExpansionContext,
} from './slotExpansions';

/** No vouchers: the printed ladder, unmodified. */
const PLAIN: SlotExpansionContext = { hasTavoloAllargato: false, hasHouseDiscount: false };
const TAVOLO: SlotExpansionContext = { hasTavoloAllargato: true, hasHouseDiscount: false };
const SCONTO: SlotExpansionContext = { hasTavoloAllargato: false, hasHouseDiscount: true };
const BOTH: SlotExpansionContext = { hasTavoloAllargato: true, hasHouseDiscount: true };

describe('AMPLIA TAVOLO', () => {
  it('sale 5 -> 6 per $12 e 6 -> 7 per $24', () => {
    expect(getNextJokerExpansion(5, PLAIN)).toMatchObject({ fromSlots: 5, toSlots: 6, cost: 12 });
    expect(getNextJokerExpansion(6, PLAIN)).toMatchObject({ fromSlots: 6, toSlots: 7, cost: 24 });
  });

  it('e\' MAX al cap di campagna', () => {
    expect(getJokerSlotCap()).toBe(7);
    expect(getNextJokerExpansion(7, PLAIN)).toBeNull();
    expect(getNextJokerExpansion(8, PLAIN)).toBeNull();
  });
});

describe('ALLARGA TASCA', () => {
  it('sale 2 -> 3 per $7 e 3 -> 4 per $14', () => {
    expect(getNextConsumableExpansion(2, PLAIN)).toMatchObject({ fromSlots: 2, toSlots: 3, cost: 7 });
    expect(getNextConsumableExpansion(3, PLAIN)).toMatchObject({ fromSlots: 3, toSlots: 4, cost: 14 });
  });

  it('e\' MAX al cap di campagna', () => {
    expect(getConsumableSlotCap()).toBe(4);
    expect(getNextConsumableExpansion(4, PLAIN)).toBeNull();
  });

  it('il Mazzo delle Carte Sola parte da 3 e paga subito lo scalino da $14', () => {
    const deck = ALL_DECKS.find((d) => d.id === 'deck_uno')!;
    // Lo stesso calcolo che fa App all'avvio della run.
    const startingSlots = deck.specialDeckPerk === 'holo_figures' ? 3 : 2;
    expect(startingSlots).toBe(3);

    const first = getNextConsumableExpansion(startingSlots, PLAIN)!;
    expect(first).toMatchObject({ fromSlots: 3, toSlots: 4, cost: 14 });

    // Nessuno scalino regalato dall'offset: una sola espansione, poi MAX.
    expect(getNextConsumableExpansion(first.toSlots, PLAIN)).toBeNull();
  });

  it('il mazzo standard paga entrambi gli scalini, per un totale di $21', () => {
    const first = getNextConsumableExpansion(2, PLAIN)!;
    const second = getNextConsumableExpansion(first.toSlots, PLAIN)!;
    expect(first.cost + second.cost).toBe(21);
    expect(getNextConsumableExpansion(second.toSlots, PLAIN)).toBeNull();
  });

  it('non e\' toccata dallo sconto del Tavolo Allargato', () => {
    expect(getNextConsumableExpansion(2, TAVOLO)!.cost).toBe(7);
  });
});

describe('Tavolo Allargato', () => {
  it('regala uno slot senza superare il cap', () => {
    expect(applyTavoloAllargato(5)).toBe(6);
    expect(applyTavoloAllargato(6)).toBe(7);
    expect(applyTavoloAllargato(7)).toBe(7);
  });

  it('toglie il 25% alle espansioni Jolly successive, arrotondato per eccesso', () => {
    expect(getNextJokerExpansion(6, TAVOLO)!.cost).toBe(18); // 24 * 0.75
    expect(getNextJokerExpansion(5, TAVOLO)!.cost).toBe(9); // 12 * 0.75
  });

  it('non e\' acquistabile quando gli slot Jolly sono gia\' al cap', () => {
    expect(isTavoloAllargatoUseful(5)).toBe(true);
    expect(isTavoloAllargatoUseful(6)).toBe(true);
    expect(isTavoloAllargatoUseful(7)).toBe(false);
  });

  it('la descrizione del voucher dice cosa fa davvero', () => {
    const tavolo = ALL_VOUCHERS.find((v) => v.id === 'v_tavolo')!;
    expect(tavolo.description).toContain('+1 slot Jolly');
    expect(tavolo.description).toContain('25%');
    // La vecchia promessa di "6 slot" non e' piu' vera con il cap a 7.
    expect(tavolo.description).not.toContain('6 slot');
  });
});

describe('Sconto della Casa', () => {
  it('vale anche sui due servizi, con il minimo di $1', () => {
    expect(getNextJokerExpansion(5, SCONTO)!.cost).toBe(10);
    expect(getNextJokerExpansion(6, SCONTO)!.cost).toBe(22);
    expect(getNextConsumableExpansion(2, SCONTO)!.cost).toBe(5);
    expect(getNextConsumableExpansion(3, SCONTO)!.cost).toBe(12);
  });

  it('si somma al Tavolo Allargato: prima il 25%, poi i $2', () => {
    expect(getNextJokerExpansion(6, BOTH)!.cost).toBe(16); // ceil(24*0.75) - 2
    expect(getNextJokerExpansion(5, BOTH)!.cost).toBe(7); // ceil(12*0.75) - 2
  });

  it('non scende mai sotto $1', () => {
    const offer = getNextConsumableExpansion(2, SCONTO)!;
    expect(offer.cost).toBeGreaterThanOrEqual(1);
  });

  it('il prezzo mostrato e quello addebitato vengono dalla stessa funzione', () => {
    const offer = getNextJokerExpansion(6, BOTH)!;
    const till = purchaseSlotExpansion(offer, 100, 6);
    expect(100 - till.money).toBe(offer.cost);
  });
});

describe('atomicita\' dell\'acquisto', () => {
  it('addebita il costo esatto e alza di uno solo lo slot', () => {
    const offer = getNextJokerExpansion(5, PLAIN)!;
    const till = purchaseSlotExpansion(offer, 20, 5);
    expect(till).toEqual({ bought: true, money: 8, slots: 6 });
  });

  it('rifiuta con saldo insufficiente e non tocca nulla', () => {
    const offer = getNextJokerExpansion(5, PLAIN)!;
    const till = purchaseSlotExpansion(offer, 11, 5);
    expect(till).toEqual({ bought: false, money: 11, slots: 5 });
  });

  it('una seconda pressione con la stessa offerta non compra un secondo livello', () => {
    const offer = getNextJokerExpansion(5, PLAIN)!;
    const first = purchaseSlotExpansion(offer, 40, 5);
    expect(first).toEqual({ bought: true, money: 28, slots: 6 });

    // Stessa offerta, stato gia' avanzato: rifiutata, non riprezzata.
    const second = purchaseSlotExpansion(offer, first.money, first.slots);
    expect(second).toEqual({ bought: false, money: 28, slots: 6 });
  });

  it('non salta un livello: dopo 5 -> 6 il prossimo scalino costa $24', () => {
    const first = purchaseSlotExpansion(getNextJokerExpansion(5, PLAIN), 40, 5);
    const next = getNextJokerExpansion(first.slots, PLAIN)!;
    expect(next).toMatchObject({ fromSlots: 6, toSlots: 7, cost: 24 });
    const second = purchaseSlotExpansion(next, first.money, first.slots);
    expect(second).toEqual({ bought: true, money: 4, slots: 7 });
  });

  it('non porta mai il saldo sotto zero, nemmeno a raffica', () => {
    let money = 30;
    let slots = 5;
    for (let press = 0; press < 10; press++) {
      const till = purchaseSlotExpansion(getNextJokerExpansion(slots, PLAIN), money, slots);
      money = till.money;
      slots = till.slots;
      expect(money).toBeGreaterThanOrEqual(0);
      expect(slots).toBeLessThanOrEqual(getJokerSlotCap());
    }
    // $12 + $24 = $36 > $30: il secondo scalino non e' pagabile e resta al palo.
    expect(slots).toBe(6);
    expect(money).toBe(18);
  });

  it('rifiuta un\'offerta assente (cap raggiunto)', () => {
    const till = purchaseSlotExpansion(getNextJokerExpansion(7, PLAIN), 100, 7);
    expect(till).toEqual({ bought: false, money: 100, slots: 7 });
  });
});

describe('i cap sono un parametro, non una costante sparsa', () => {
  it('la campagna dichiara 7 e 4', () => {
    expect(CAMPAIGN_SLOT_RULES).toEqual({ jokerCap: 7, consumableCap: 4 });
  });

  it('regole diverse spostano il cap senza toccare i call site', () => {
    const endlessish = { jokerCap: 9, consumableCap: 6 };
    expect(getJokerSlotCap(endlessish)).toBe(9);
    expect(getConsumableSlotCap(endlessish)).toBe(6);
    // La scala non ha ancora pioli oltre il cap campagna: nessun prezzo, nessuna offerta.
    expect(getNextJokerExpansion(7, PLAIN, endlessish)).toBeNull();
    expect(isTavoloAllargatoUseful(7, endlessish)).toBe(true);
  });
});
