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
import { BackstoryModal } from '@/ui/BackstoryModal';
import { AchievementToast } from '@/ui/AchievementToast';
import { Objectives } from '@/ui/Objectives';
import { TutorialOverlay } from '@/ui/TutorialOverlay';
import { NavalTutorial } from '@/ui/NavalTutorial';
import { Toasts } from '@/ui/Toasts';
import { bus } from '@/game/EventBus';
import { Audio } from '@/audio/AudioManager';
import i18n from '@/i18n';

type Modal = 'settings' | 'save' | 'newcareer' | 'backstory' | null;

export default function App(): JSX.Element {
  const { t } = useTranslation();
  const started = useGame((s) => s.started);
  const scene = useGame((s) => s.scene);
  const storyShown = useGame((s) => s.family?.storyShown ?? false);
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
    const unlock = () => {
      Audio.init();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      bus.off('ui:request', onReq);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-sea-900 text-parchment-50 select-none">
      {started ? (
        <>
          <PhaserMount />
          {scene !== 'title' && <HUD onMenu={() => setModal('save')} onSettings={() => setModal('settings')} />}
          {scene === 'world' && <Objectives />}
          {scene === 'world' && <TutorialOverlay />}
          {scene === 'naval' && <NavalTutorial />}
          {scene === 'port' && <PortMenu />}
          <AchievementToast />
          <Toasts />
        </>
      ) : (
        <TitleScreen
          onNew={() => setModal('newcareer')}
          onSettings={() => setModal('settings')}
          onSaves={() => setModal('save')}
        />
      )}

      {modal === 'settings' && <SettingsMenu onClose={() => setModal(null)} />}
      {modal === 'save' && (
        <SaveLoadMenu
          onClose={() => setModal(null)}
          onNewGame={started ? () => setModal('newcareer') : undefined}
        />
      )}
      {modal === 'newcareer' && (
        <NewCareerModal onClose={() => setModal(null)} onStart={() => setModal('backstory')} />
      )}
      {modal === 'backstory' && <BackstoryModal onClose={() => setModal(null)} />}
      {started && scene !== 'title' && !storyShown && modal === null && (
        <BackstoryModal onClose={() => useGame.getState().markStoryShown()} />
      )}

      <div className="hidden">{t('app.title')}</div>
    </div>
  );
}
