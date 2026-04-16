import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '@/state/gameStore';
import { useSettings } from '@/state/settingsStore';
import { PhaserMount } from '@/ui/PhaserMount';
import { TitleScreen } from '@/ui/TitleScreen';
import { HUD } from '@/ui/HUD';
import { PortMenu } from '@/ui/PortMenu';
import { SettingsMenu } from '@/ui/SettingsMenu';
import { SaveLoadMenu } from '@/ui/SaveLoadMenu';
import { NewCareerModal } from '@/ui/NewCareerModal';
import { AchievementToast } from '@/ui/AchievementToast';
import { bus } from '@/game/EventBus';
import i18n from '@/i18n';

type Modal = 'settings' | 'save' | 'newcareer' | null;

export default function App(): JSX.Element {
  const { t } = useTranslation();
  const started = useGame((s) => s.started);
  const scene = useGame((s) => s.scene);
  const [modal, setModal] = useState<Modal>(null);
  const lang = useSettings((s) => s.lang);
  const theme = useSettings((s) => s.theme);
  const largeText = useSettings((s) => s.largeText);
  const reduceMotion = useSettings((s) => s.reduceMotion);
  const colorblind = useSettings((s) => s.colorblind);

  useEffect(() => {
    if (i18n.language !== lang) void i18n.changeLanguage(lang);
  }, [lang]);

  useEffect(() => {
    const cls = document.documentElement.classList;
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    cls.toggle('dark', theme === 'dark' || (theme === 'system' && sysDark));
    cls.toggle('text-lg', largeText);
    cls.toggle('reduce-motion', reduceMotion);
    cls.toggle('cb', colorblind);
  }, [theme, largeText, reduceMotion, colorblind]);

  useEffect(() => {
    const onReq = ({ kind }: { kind: 'pause' | 'settings' | 'menu' }) => {
      if (kind === 'settings') setModal('settings');
      if (kind === 'menu') setModal('save');
    };
    bus.on('ui:request', onReq);
    return () => bus.off('ui:request', onReq);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-sea-900 text-parchment-50 select-none">
      {started ? (
        <>
          <PhaserMount />
          {scene !== 'title' && <HUD onMenu={() => setModal('save')} onSettings={() => setModal('settings')} />}
          {scene === 'port' && <PortMenu />}
          <AchievementToast />
        </>
      ) : (
        <TitleScreen
          onNew={() => setModal('newcareer')}
          onSettings={() => setModal('settings')}
          onSaves={() => setModal('save')}
        />
      )}

      {modal === 'settings' && <SettingsMenu onClose={() => setModal(null)} />}
      {modal === 'save' && <SaveLoadMenu onClose={() => setModal(null)} />}
      {modal === 'newcareer' && <NewCareerModal onClose={() => setModal(null)} onStart={() => setModal(null)} />}

      <div className="hidden">{t('app.title')}</div>
    </div>
  );
}
