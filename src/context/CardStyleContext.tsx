import React, { createContext, useContext } from 'react';
import { CardStyle } from '../types/game';

const CardStyleContext = createContext<CardStyle>('classic');

export const CardStyleProvider: React.FC<{
  style: CardStyle;
  children: React.ReactNode;
}> = ({ style, children }) => {
  return (
    <CardStyleContext.Provider value={style}>
      {children}
    </CardStyleContext.Provider>
  );
};

export const useCardStyle = (): CardStyle => {
  return useContext(CardStyleContext);
};
