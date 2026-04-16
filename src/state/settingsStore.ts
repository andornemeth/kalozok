import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SupportedLanguage } from '@/i18n';

export type Theme = 'dark' | 'light' | 'system';

interface SettingsState {
  lang: SupportedLanguage;
  music: number;
  sfx: number;
  haptics: boolean;
  theme: Theme;
  colorblind: boolean;
  reduceMotion: boolean;
  largeText: boolean;
  setLang: (l: SupportedLanguage) => void;
  setMusic: (v: number) => void;
  setSfx: (v: number) => void;
  setHaptics: (v: boolean) => void;
  setTheme: (t: Theme) => void;
  setColorblind: (v: boolean) => void;
  setReduceMotion: (v: boolean) => void;
  setLargeText: (v: boolean) => void;
  reset: () => void;
}

const defaults = {
  lang: 'hu' as SupportedLanguage,
  music: 0.5,
  sfx: 0.7,
  haptics: true,
  theme: 'system' as Theme,
  colorblind: false,
  reduceMotion: false,
  largeText: false,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      setLang: (lang) => set({ lang }),
      setMusic: (music) => set({ music }),
      setSfx: (sfx) => set({ sfx }),
      setHaptics: (haptics) => set({ haptics }),
      setTheme: (theme) => set({ theme }),
      setColorblind: (colorblind) => set({ colorblind }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setLargeText: (largeText) => set({ largeText }),
      reset: () => set({ ...defaults }),
    }),
    {
      name: 'kalozok:settings',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
