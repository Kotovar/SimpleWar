import { useMemo } from 'react';
import {
  getParticipantPalette,
  getParticipantStyles,
  type Owner,
} from '@shared/config';
import { useGameLoopStore } from './gameLoopStore';

export const useParticipantPalette = (owner: Owner) =>
  useGameLoopStore(state => getParticipantPalette(owner, state.participants));

export const useParticipantStyles = () => {
  const participants = useGameLoopStore(state => state.participants);
  return useMemo(() => getParticipantStyles(participants), [participants]);
};
