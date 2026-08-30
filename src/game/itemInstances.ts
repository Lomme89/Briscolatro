import { Joker, UnoCard } from '../types/game';

let nextInstanceSequence = 0;

function createInstanceId(prefix: string): string {
  nextInstanceSequence += 1;
  return `${prefix}_${Date.now().toString(36)}_${nextInstanceSequence.toString(36)}`;
}

/** Makes an owned Joker without changing its catalogue id. */
export function instantiateJoker(joker: Joker, instanceId = createInstanceId('joker')): Joker {
  return {
    ...joker,
    instanceId,
    stats: { ...(joker.stats || {}) },
  };
}

/** Makes an owned Carta Sola while preserving the dispatch/artwork definition id. */
export function instantiateUnoCard(
  card: UnoCard,
  instanceId = createInstanceId('sola')
): UnoCard {
  const definitionId = card.definitionId || card.id;
  return { ...card, id: definitionId, definitionId, instanceId };
}

export function getUnoDefinitionId(card: UnoCard): string {
  return card.definitionId || card.id;
}

export function sameUnoInstance(left: UnoCard, right: UnoCard): boolean {
  if (left.instanceId || right.instanceId) return left.instanceId === right.instanceId;
  return left === right || left.id === right.id;
}

/** The Sigillo Blu reward path, injectable so dispatch is regression-testable. */
export function createBlueSealReward(
  catalogue: UnoCard[],
  random: () => number = Math.random
): UnoCard | null {
  if (catalogue.length === 0) return null;
  const index = Math.min(catalogue.length - 1, Math.floor(random() * catalogue.length));
  return instantiateUnoCard(catalogue[index]);
}
