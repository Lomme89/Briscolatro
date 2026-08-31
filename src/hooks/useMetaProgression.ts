import { Dispatch, SetStateAction, useState } from 'react';
import {
  DEFAULT_VICTORY_MODE,
  parseVictoryMode,
  VICTORY_MODES,
  VictoryMode,
} from '../game/victoryModes';

export const DEFAULT_UNLOCKED_DECKS = ['deck_napoletano', 'deck_bastoni'];

type ModeRecord = Record<VictoryMode, number>;

const EMPTY_MODE_RECORD: ModeRecord = {
  briscolatro: 0,
  sbaraglio: 0,
  traditional: 0,
  double_challenge: 0,
};

function readNumber(key: string): number {
  try {
    return parseInt(localStorage.getItem(key) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

function readModeRecord(key: string): ModeRecord {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '{}');
    return {
      briscolatro: raw.briscolatro ?? 0,
      sbaraglio: raw.sbaraglio ?? 0,
      traditional: raw.traditional ?? 0,
      double_challenge: raw.double_challenge ?? 0,
    };
  } catch {
    return { ...EMPTY_MODE_RECORD };
  }
}

function readUnlockedDecks(): string[] {
  try {
    const saved = localStorage.getItem('briscolatro_unlocked_decks');
    return saved ? JSON.parse(saved) : DEFAULT_UNLOCKED_DECKS;
  } catch {
    return DEFAULT_UNLOCKED_DECKS;
  }
}

function readVictoryMode(): VictoryMode {
  try {
    return parseVictoryMode(localStorage.getItem('briscolatro_victory_mode'));
  } catch {
    return DEFAULT_VICTORY_MODE;
  }
}

export interface MetaProgression {
  unlockedDeckIds: string[];
  setUnlockedDeckIds: Dispatch<SetStateAction<string[]>>;
  bossesDefeated: number;
  setBossesDefeated: Dispatch<SetStateAction<number>>;
  solaCardsUsed: number;
  setSolaCardsUsed: Dispatch<SetStateAction<number>>;
  victoryMode: VictoryMode;
  setVictoryMode: Dispatch<SetStateAction<VictoryMode>>;
  highScores: ModeRecord;
  setHighScores: Dispatch<SetStateAction<ModeRecord>>;
  modeWins: ModeRecord;
  setModeWins: Dispatch<SetStateAction<ModeRecord>>;
  modeBestAnte: ModeRecord;
  setModeBestAnte: Dispatch<SetStateAction<ModeRecord>>;
  modeBestEndlessAnte: ModeRecord;
  setModeBestEndlessAnte: Dispatch<SetStateAction<ModeRecord>>;
  highScore: number;
  setHighScore: Dispatch<SetStateAction<number>>;
  resetProgress: () => void;
}

/** Owns permanent progression and all of its local-storage keys. */
export function useMetaProgression(): MetaProgression {
  const [unlockedDeckIds, setUnlockedDeckIds] = useState<string[]>(readUnlockedDecks);
  const [bossesDefeated, setBossesDefeated] = useState(0);
  const [solaCardsUsed, setSolaCardsUsed] = useState(() =>
    readNumber('briscolatro_sola_used')
  );
  const [victoryMode, setVictoryMode] = useState<VictoryMode>(readVictoryMode);
  const [highScores, setHighScores] = useState<ModeRecord>(() => ({
    briscolatro: readNumber(VICTORY_MODES.briscolatro.highScoreKey),
    sbaraglio: readNumber(VICTORY_MODES.sbaraglio.highScoreKey),
    traditional: readNumber(VICTORY_MODES.traditional.highScoreKey),
    double_challenge: readNumber(VICTORY_MODES.double_challenge.highScoreKey),
  }));
  const [modeWins, setModeWins] = useState<ModeRecord>(() =>
    readModeRecord('briscolatro_mode_wins')
  );
  const [modeBestAnte, setModeBestAnte] = useState<ModeRecord>(() =>
    readModeRecord('briscolatro_mode_ante')
  );
  const [modeBestEndlessAnte, setModeBestEndlessAnte] = useState<ModeRecord>(() =>
    readModeRecord('briscolatro_mode_endless')
  );
  const [highScore, setHighScore] = useState(() => readNumber('briscolatro_highscore'));

  const resetProgress = () => {
    setHighScore(0);
    setUnlockedDeckIds(DEFAULT_UNLOCKED_DECKS);
    setSolaCardsUsed(0);
    setHighScores({ ...EMPTY_MODE_RECORD });
    setModeWins({ ...EMPTY_MODE_RECORD });
    setModeBestAnte({ ...EMPTY_MODE_RECORD });
    setModeBestEndlessAnte({ ...EMPTY_MODE_RECORD });
    try {
      localStorage.removeItem('briscolatro_unlocked_decks');
      localStorage.removeItem('briscolatro_sola_used');
      localStorage.removeItem('briscolatro_mode_wins');
      localStorage.removeItem('briscolatro_mode_ante');
      localStorage.removeItem('briscolatro_mode_endless');
      for (const info of Object.values(VICTORY_MODES)) {
        localStorage.removeItem(info.highScoreKey);
      }
    } catch {}
  };

  return {
    unlockedDeckIds,
    setUnlockedDeckIds,
    bossesDefeated,
    setBossesDefeated,
    solaCardsUsed,
    setSolaCardsUsed,
    victoryMode,
    setVictoryMode,
    highScores,
    setHighScores,
    modeWins,
    setModeWins,
    modeBestAnte,
    setModeBestAnte,
    modeBestEndlessAnte,
    setModeBestEndlessAnte,
    highScore,
    setHighScore,
    resetProgress,
  };
}
