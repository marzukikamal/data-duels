import { create } from 'zustand';

type AppState = {
  title: string;
};

export const useAppStore = create<AppState>(() => ({
  title: 'Data Duels',
}));
