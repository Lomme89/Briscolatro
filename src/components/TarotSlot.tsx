import React from 'react';
import { UnoCardSlot } from './UnoCardSlot';
import { UnoCard } from '../types/game';

interface TarotSlotProps {
  tarot: UnoCard | null;
  onUse?: () => void;
  onSell?: () => void;
  isShopItem?: boolean;
  onBuy?: () => void;
  canAfford?: boolean;
  buyCost?: number;
  canUse?: boolean;
  isSelected?: boolean;
}

export const TarotSlot: React.FC<TarotSlotProps> = (props) => {
  return <UnoCardSlot unoCard={props.tarot} {...props} />;
};

export { UnoCardSlot };
