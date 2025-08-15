import { useContext } from 'react';
import { HoneycombContext } from '../services/honeycomb/HoneycombProvider';

export const useHoneycomb = () => {
  const context = useContext(HoneycombContext);
  if (context === undefined) {
    throw new Error('useHoneycomb must be used within a HoneycombProvider');
  }
  return context;
};
