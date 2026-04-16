import { useSettings } from '@/state/settingsStore';

type Pattern = 'light' | 'medium' | 'heavy' | 'success' | 'warn';

const patterns: Record<Pattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [15, 40, 15],
  warn: [30, 60, 30, 60],
};

export function vibrate(p: Pattern): void {
  if (!useSettings.getState().haptics) return;
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    navigator.vibrate(patterns[p]);
  } catch {
    /* noop */
  }
}
