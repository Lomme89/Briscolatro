/** Returns an idempotent callback for UI transitions that may be skipped. */
export function once(callback: () => void): () => void {
  let completed = false;
  return () => {
    if (completed) return;
    completed = true;
    callback();
  };
}
