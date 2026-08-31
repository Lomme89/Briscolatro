import { useCallback, useEffect, useState } from 'react';
import {
  clearRunSnapshot,
  hasStoredRun,
  loadRunSnapshot,
  RestoredRun,
} from '../game/runPersistence';

/** Owns discovery and disposal of the single resumable run slot. */
export function useStoredRunSlot() {
  const [resumableRun, setResumableRun] = useState<RestoredRun | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  useEffect(() => {
    const hadStoredRun = hasStoredRun();
    const restored = loadRunSnapshot();
    setResumableRun(restored);
    if (hadStoredRun && !restored) {
      setSaveNotice('Salvataggio non valido. Avvia una nuova run.');
    }
  }, []);

  const hideStoredRun = useCallback(() => {
    setResumableRun(null);
    setSaveNotice(null);
  }, []);

  const clearStoredRun = useCallback(() => {
    clearRunSnapshot();
    setResumableRun(null);
    setSaveNotice(null);
  }, []);

  return { resumableRun, saveNotice, hideStoredRun, clearStoredRun };
}
