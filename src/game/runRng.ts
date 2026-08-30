/**
 * The run's own random number generator.
 *
 * Save/Resume turns every `Math.random` in the gameplay path into a reroll: a
 * player who does not like the shop they were dealt closes the tab, reopens it
 * and gets a different one. So everything a save can be taken *before* draws
 * from here instead, and the generator's position travels inside the snapshot.
 *
 * Cosmetic randomness - particles, screen shake, sound grain, table banter -
 * deliberately stays on `Math.random`: it changes nothing a player could farm,
 * and putting it here would only make the stream depend on how many sparks were
 * drawn.
 *
 * The state is `{ seed, counter }` and the value is a pure function of the two,
 * so serialising it is exact: there is no internal accumulator that could drift
 * away from what was written to disk.
 */
export interface RunRngState {
  seed: number;
  counter: number;
}

/** mulberry32 over (seed + counter), so any position is reachable directly. */
function valueAt(seed: number, counter: number): number {
  let t = (seed + Math.imul(counter, 0x6d2b79f5)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** A standalone stream, for the shop shelf and for tests. */
export function createRunRng(seed: number) {
  let counter = 0;
  const random = () => valueAt(seed >>> 0, ++counter);
  return {
    random,
    shuffle: <T>(items: T[]) => shuffleWith(items, random),
    pick: <T>(items: T[]) => pickWith(items, random),
  };
}

export function shuffleWith<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function pickWith<T>(items: T[], random: () => number): T | null {
  return items.length === 0 ? null : items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}

let current: RunRngState = { seed: (Date.now() ^ 0x9e3779b9) >>> 0, counter: 0 };

/** Starts a fresh stream. Called once per run, and once per restored run. */
export function seedRunRng(seed: number = (Date.now() ^ 0x9e3779b9) >>> 0): RunRngState {
  current = { seed: seed >>> 0, counter: 0 };
  return { ...current };
}

export function getRunRngState(): RunRngState {
  return { ...current };
}

export function setRunRngState(state: RunRngState): void {
  current = { seed: state.seed >>> 0, counter: Math.max(0, Math.floor(state.counter)) };
}

export function isRunRngState(value: unknown): value is RunRngState {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.seed === 'number' &&
    Number.isFinite(candidate.seed) &&
    typeof candidate.counter === 'number' &&
    Number.isFinite(candidate.counter) &&
    candidate.counter >= 0
  );
}

/** The run stream. Every gameplay roll a save can precede goes through here. */
export function randomRun(): number {
  current = { seed: current.seed, counter: current.counter + 1 };
  return valueAt(current.seed, current.counter);
}

export function shuffleRun<T>(items: T[]): T[] {
  return shuffleWith(items, randomRun);
}

export function pickRun<T>(items: T[]): T | null {
  return pickWith(items, randomRun);
}
