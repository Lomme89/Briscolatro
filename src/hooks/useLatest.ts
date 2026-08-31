import { useRef } from 'react';

/** A stable ref that always exposes the value from the latest render. */
export function useLatest<T>(value: T) {
  const latest = useRef(value);
  latest.current = value;
  return latest;
}
