import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/state/settingsStore';
import type { SupportedLanguage } from '@/i18n';
import type { Theme } from '@/state/settingsStore';

interface Props {
  onClose: () => void;
}

export function SettingsMenu({ onClose }: Props): JSX.Element {
  const { t } = useTranslation();
  const s = useSettings();

  return (
    <div className="dialog-backdrop z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="pixel-card w-full max-w-sm"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-pixel text-gold text-sm">{t('settings.title')}</h2>
          <button className="pixel-btn ghost !text-[9px]" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="space-y-3 text-xs">
          <Row label={t('settings.language')}>
            <Segmented<SupportedLanguage>
              value={s.lang}
              options={[
                { v: 'hu', label: t('settings.hungarian') },
                { v: 'en', label: t('settings.english') },
              ]}
              onChange={s.setLang}
            />
          </Row>
          <Row label={t('settings.theme')}>
            <Segmented<Theme>
              value={s.theme}
              options={[
                { v: 'dark', label: t('settings.dark') },
                { v: 'light', label: t('settings.light') },
                { v: 'system', label: t('settings.system') },
              ]}
              onChange={s.setTheme}
            />
          </Row>
          <Row label={t('settings.music')}>
            <input type="range" min={0} max={1} step={0.05} value={s.music} onChange={(e) => s.setMusic(+e.target.value)} />
          </Row>
          <Row label={t('settings.sfx')}>
            <input type="range" min={0} max={1} step={0.05} value={s.sfx} onChange={(e) => s.setSfx(+e.target.value)} />
          </Row>
          <Row label={t('settings.haptics')}>
            <Toggle checked={s.haptics} onChange={s.setHaptics} />
          </Row>
          <Row label={t('settings.colorblind')}>
            <Toggle checked={s.colorblind} onChange={s.setColorblind} />
          </Row>
          <Row label={t('settings.reduceMotion')}>
            <Toggle checked={s.reduceMotion} onChange={s.setReduceMotion} />
          </Row>
          <Row label={t('settings.largeText')}>
            <Toggle checked={s.largeText} onChange={s.setLargeText} />
          </Row>
          <button className="pixel-btn ghost w-full mt-2" onClick={s.reset}>
            {t('settings.reset')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="opacity-80">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}): JSX.Element {
  return (
    <div className="flex rounded-md overflow-hidden ring-1 ring-parchment-200/30">
      {options.map((o) => (
        <button
          key={o.v}
          className={`px-2 py-1 text-[10px] ${value === o.v ? 'bg-gold text-sea-900' : 'bg-sea-800/60'}`}
          onClick={() => onChange(o.v)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }): JSX.Element {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full transition ${checked ? 'bg-gold' : 'bg-sea-700'} relative`}
      aria-pressed={checked}
    >
      <span className={`block w-4 h-4 bg-parchment-50 rounded-full absolute top-0.5 transition-all ${checked ? 'left-5' : 'left-0.5'}`} />
    </button>
  );
}
