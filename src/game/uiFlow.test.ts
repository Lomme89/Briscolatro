import { describe, expect, it, vi } from 'vitest';
import { once } from './uiFlow';

describe('once', () => {
  it('completa il tally una volta anche con piu richieste di skip', () => {
    const callback = vi.fn();
    const complete = once(callback);
    complete();
    complete();
    complete();
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
