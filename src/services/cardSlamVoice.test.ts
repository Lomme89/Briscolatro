import { describe, expect, it } from 'vitest';
import { cardSlamVoice } from './soundEngine';

/**
 * The whole point of the curve is that you can hear what a card is worth
 * without reading it. That only holds if heavier really is lower, longer and
 * louder, all the way up.
 */

// Due/Quattro/Cinque..., Fante, Cavallo, Re, Tre, Asso.
const POINTS = [0, 2, 3, 4, 10, 11];

describe('peso della carta', () => {
  it('piu pesa, piu bassa lunga e forte diventa', () => {
    const voices = POINTS.map((p) => cardSlamVoice(p));
    for (let i = 1; i < voices.length; i++) {
      expect(voices[i].startFreq).toBeLessThan(voices[i - 1].startFreq);
      expect(voices[i].endFreq).toBeLessThan(voices[i - 1].endFreq);
      expect(voices[i].release).toBeGreaterThan(voices[i - 1].release);
      expect(voices[i].gain).toBeGreaterThan(voices[i - 1].gain);
    }
  });

  it('il sub arriva coi carichi, non con le lisce', () => {
    expect(cardSlamVoice(0).hasSub).toBe(false);
    expect(cardSlamVoice(2).hasSub).toBe(false);
    expect(cardSlamVoice(10).hasSub).toBe(true);
    expect(cardSlamVoice(11).hasSub).toBe(true);
  });

  it('una liscia mantiene il bordo di carta, un carico no', () => {
    expect(cardSlamVoice(0).type).toBe('triangle');
    expect(cardSlamVoice(11).type).toBe('sawtooth');
  });

  it('la briscola pesa piu dei suoi punti', () => {
    expect(cardSlamVoice(0, true).weight).toBeGreaterThan(cardSlamVoice(0).weight);
    // A liscia di briscola still has something under it: it takes the trick.
    expect(cardSlamVoice(0, true).hasSub).toBe(false);
    expect(cardSlamVoice(4, true).hasSub).toBe(true);
  });

  it('resta nei limiti anche fuori scala', () => {
    expect(cardSlamVoice(999, true).weight).toBe(1);
    expect(cardSlamVoice(-5).weight).toBe(0);
  });
});
