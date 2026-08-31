import { useCallback, useEffect, useState } from 'react';
import { RunSnapshotPhase } from '../game/runPersistence';
import { useLatest } from './useLatest';

interface PendingSave {
  revision: number;
  phase: RunSnapshotPhase;
}

/**
 * Defers a save until React has committed the whole boundary transition.
 * Several requests in one batch intentionally collapse to the latest phase.
 */
export function useAutosaveBoundary(writeSnapshot: (phase: RunSnapshotPhase) => void) {
  const writerRef = useLatest(writeSnapshot);
  const [pending, setPending] = useState<PendingSave | null>(null);

  const requestSave = useCallback((phase: RunSnapshotPhase) => {
    setPending((previous) => ({
      revision: (previous?.revision ?? 0) + 1,
      phase,
    }));
  }, []);

  useEffect(() => {
    if (pending) writerRef.current(pending.phase);
  }, [pending, writerRef]);

  return requestSave;
}
