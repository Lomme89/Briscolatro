import React, { createContext, useContext } from 'react';

/**
 * Whether the cards wear their chips: the rank pill and the point value drawn
 * on top of the illustration.
 *
 * The finished deck already says what every card is - a player who reads
 * Napoletane does not need the pills, and the title screen never did. They stay
 * on by default because the point value is what the scoring runs on, and go off
 * from the settings.
 */
const CardChipsContext = createContext<boolean>(true);

export const CardChipsProvider: React.FC<{
  enabled: boolean;
  children: React.ReactNode;
}> = ({ enabled, children }) => (
  <CardChipsContext.Provider value={enabled}>{children}</CardChipsContext.Provider>
);

export const useCardChips = (): boolean => useContext(CardChipsContext);
