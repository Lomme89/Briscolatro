import { useState } from 'react';
import { sound } from '../services/soundEngine';
import { GameSettings } from '../types/game';

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  sfxVolume: 80,
  musicVolume: 50,
  crtScanlines: false,
  screenShake: true,
  fastMode: false,
  showCardChips: true,
};

function readSettings(): GameSettings {
  try {
    const saved = localStorage.getItem('briscolatro_settings');
    return saved ? JSON.parse(saved) : DEFAULT_GAME_SETTINGS;
  } catch {
    return DEFAULT_GAME_SETTINGS;
  }
}

/** Owns the settings storage boundary and keeps audio gains in sync. */
export function useGameSettings() {
  const [settings, setSettings] = useState<GameSettings>(readSettings);

  const updateSettings = (patch: Partial<GameSettings>) => {
    setSettings((previous) => {
      const updated = { ...previous, ...patch };
      try {
        localStorage.setItem('briscolatro_settings', JSON.stringify(updated));
      } catch {}

      sound.setSfxVolume(updated.soundEnabled ? updated.sfxVolume / 100 : 0);
      sound.setMusicVolume(updated.musicEnabled ? updated.musicVolume / 100 : 0);
      return updated;
    });
  };

  return { settings, updateSettings };
}
