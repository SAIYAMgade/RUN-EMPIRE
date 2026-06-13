import { create } from 'zustand';
import type { ActivityEvent } from '../types';

interface ActivityStoreState {
  activities: ActivityEvent[];
  addActivity: (event: ActivityEvent) => void;
}

export const useActivityStore = create<ActivityStoreState>((set) => ({
  activities: [],
  addActivity: (event) => set((state) => {
    // Keep last 50 events
    const updated = [event, ...state.activities].slice(0, 50);
    return { activities: updated };
  }),
}));
