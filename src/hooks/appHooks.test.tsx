import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEFAULT_GAME_SETTINGS, useGameSettings } from './useGameSettings';
import { DEFAULT_UNLOCKED_DECKS, MetaProgression, useMetaProgression } from './useMetaProgression';

function installMemoryStorage(entries: Record<string, string> = {}) {
  const values = new Map(Object.entries(entries));
  const storage: Storage = {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
}

afterEach(() => {
  delete (globalThis as { localStorage?: Storage }).localStorage;
});

describe('app storage hooks', () => {
  it('starts settings from the established defaults', () => {
    installMemoryStorage();
    let settings = DEFAULT_GAME_SETTINGS;

    function Probe() {
      settings = useGameSettings().settings;
      return null;
    }

    renderToStaticMarkup(<Probe />);
    expect(settings).toEqual(DEFAULT_GAME_SETTINGS);
  });

  it('restores settings and permanent progression from their own storage boundary', () => {
    installMemoryStorage({
      briscolatro_settings: JSON.stringify({ ...DEFAULT_GAME_SETTINGS, fastMode: true }),
      briscolatro_unlocked_decks: JSON.stringify(['deck_napoletano', 'deck_sola']),
      briscolatro_sola_used: '12',
      briscolatro_victory_mode: 'traditional',
      briscolatro_highscore: '8765',
      briscolatro_mode_wins: JSON.stringify({ traditional: 3 }),
      briscolatro_mode_ante: JSON.stringify({ traditional: 7 }),
      briscolatro_mode_endless: JSON.stringify({ traditional: 11 }),
    });

    let settings = DEFAULT_GAME_SETTINGS;
    let progression: MetaProgression | null = null;

    function Probe() {
      settings = useGameSettings().settings;
      progression = useMetaProgression();
      return null;
    }

    renderToStaticMarkup(<Probe />);
    expect(settings.fastMode).toBe(true);
    expect(progression).toMatchObject({
      unlockedDeckIds: ['deck_napoletano', 'deck_sola'],
      solaCardsUsed: 12,
      victoryMode: 'traditional',
      highScore: 8765,
      modeWins: { traditional: 3 },
      modeBestAnte: { traditional: 7 },
      modeBestEndlessAnte: { traditional: 11 },
    });
  });

  it('falls back safely when persisted JSON is corrupt', () => {
    installMemoryStorage({
      briscolatro_settings: '{broken',
      briscolatro_unlocked_decks: '{broken',
      briscolatro_mode_wins: '{broken',
    });

    let settings = DEFAULT_GAME_SETTINGS;
    let progression: MetaProgression | null = null;

    function Probe() {
      settings = useGameSettings().settings;
      progression = useMetaProgression();
      return null;
    }

    renderToStaticMarkup(<Probe />);
    const restored = progression as unknown as MetaProgression;
    expect(settings).toEqual(DEFAULT_GAME_SETTINGS);
    expect(restored.unlockedDeckIds).toEqual(DEFAULT_UNLOCKED_DECKS);
    expect(restored.modeWins).toEqual({
      briscolatro: 0,
      sbaraglio: 0,
      traditional: 0,
      double_challenge: 0,
    });
  });
});
