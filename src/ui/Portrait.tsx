interface Props {
  who: 'pegya' | 'aniko' | 'csillag' | 'boroka';
  size?: number;
}

// Stilizált pixeles portrék. Pegya egyedi rajz a referencia fotó alapján:
// szakállas, erős állú férfi, délvidéki kalóz jelmezben.
export function Portrait({ who, size = 64 }: Props): JSX.Element {
  if (who === 'pegya') return <PegyaPortrait size={size} />;
  const cfg = PORTRAITS[who];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className="rounded ring-1 ring-parchment-200/40"
      style={{ background: cfg.bg, imageRendering: 'pixelated' }}
    >
      {size >= 64 && (
        <>
          <circle cx={10} cy={10} r={3} fill="#f2c94c" opacity="0.6" />
          <circle cx={54} cy={10} r={3} fill="#f2c94c" opacity="0.4" />
          <circle cx={12} cy={54} r={2} fill="#c0392b" opacity="0.5" />
        </>
      )}
      <rect x={28} y={46} width={8} height={8} fill={cfg.skin} />
      <rect x={26} y={52} width={12} height={12} fill={cfg.clothes} />
      <rect x={20} y={18} width={24} height={28} fill={cfg.skin} />
      {cfg.hairStyle === 'short' && (
        <>
          <rect x={18} y={14} width={28} height={10} fill={cfg.hair} />
          <rect x={18} y={24} width={4} height={8} fill={cfg.hair} />
          <rect x={42} y={24} width={4} height={8} fill={cfg.hair} />
        </>
      )}
      {cfg.hairStyle === 'long' && (
        <>
          <rect x={16} y={14} width={32} height={12} fill={cfg.hair} />
          <rect x={14} y={20} width={6} height={28} fill={cfg.hair} />
          <rect x={44} y={20} width={6} height={28} fill={cfg.hair} />
        </>
      )}
      {cfg.hairStyle === 'braid' && (
        <>
          <rect x={18} y={14} width={28} height={10} fill={cfg.hair} />
          <rect x={30} y={46} width={4} height={14} fill={cfg.hair} />
          <rect x={28} y={50} width={8} height={2} fill={cfg.hair} />
          <rect x={29} y={54} width={6} height={2} fill={cfg.hair} />
        </>
      )}
      <rect x={24} y={28} width={3} height={3} fill={cfg.eye} />
      <rect x={37} y={28} width={3} height={3} fill={cfg.eye} />
      <rect x={31} y={33} width={2} height={4} fill={cfg.noseShadow} />
      <rect x={27} y={40} width={10} height={2} fill={cfg.mouth} />
      {cfg.earring && (
        <>
          <rect x={18} y={34} width={2} height={2} fill="#f2c94c" />
          <rect x={44} y={34} width={2} height={2} fill="#f2c94c" />
        </>
      )}
      {cfg.headwear === 'kendo' && (
        <>
          <rect x={14} y={14} width={36} height={6} fill="#c0392b" />
          <rect x={14} y={14} width={3} height={3} fill="#f2c94c" />
          <rect x={47} y={14} width={3} height={3} fill="#f2c94c" />
        </>
      )}
      <rect x={20} y={56} width={24} height={8} fill={cfg.collar ?? cfg.clothes} />
      <rect x={0} y={0} width={64} height={64} fill="none" stroke="#04141a" strokeWidth={2} />
    </svg>
  );
}

function PegyaPortrait({ size }: { size: number }): JSX.Element {
  // Paletta — napbarnított arcbőr, sötétbarna-gesztenye haj és szakáll,
  // jégszürke-zöldes szem, piros-sárga kendő, kék tengerészmellény.
  const skin = '#c98f63';
  const skinDark = '#a67147';
  const skinShadow = '#6b4426';
  const hair = '#4a2a12';
  const hairDark = '#2a1510';
  const hairLight = '#6b3e1f';
  const beard = '#3a2010';
  const beardDark = '#2a1510';
  const eye = '#3a5a4a';
  const mouth = '#6b3e1f';
  const bandanaRed = '#c0392b';
  const bandanaDark = '#7a2e0e';
  const bandanaYellow = '#f2c94c';
  const vest = '#14213a';
  const vestLight = '#2d4466';
  const shirt = '#ede0c6';
  const shirtShadow = '#c9b894';
  const gold = '#e0b24f';
  const bg = '#182830';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className="rounded ring-1 ring-parchment-200/40"
      style={{ background: bg, imageRendering: 'pixelated' }}
    >
      {/* Háttér — finom napraforgó + ködös ég */}
      <rect x={0} y={0} width={64} height={34} fill="#243a44" />
      <rect x={0} y={34} width={64} height={30} fill="#182830" />
      <circle cx={8} cy={8} r={3} fill={bandanaYellow} opacity="0.5" />
      <circle cx={56} cy={10} r={2.5} fill={bandanaYellow} opacity="0.4" />
      <circle cx={54} cy={56} r={2} fill={bandanaRed} opacity="0.5" />

      {/* Vállak / mellkas — tengerészmellény */}
      <rect x={6} y={52} width={52} height={12} fill={vest} />
      <rect x={6} y={52} width={52} height={2} fill={vestLight} />
      {/* Mellény nyílás (V alak) fehér inggel */}
      <polygon points="22,52 32,62 42,52" fill={shirt} />
      <polygon points="24,52 32,60 40,52" fill={shirt} />
      <rect x={30} y={58} width={4} height={4} fill={shirtShadow} />
      {/* Arany gombok a mellényen */}
      <rect x={14} y={56} width={2} height={2} fill={gold} />
      <rect x={14} y={60} width={2} height={2} fill={gold} />
      <rect x={48} y={56} width={2} height={2} fill={gold} />
      <rect x={48} y={60} width={2} height={2} fill={gold} />

      {/* Nyak — vaskos */}
      <rect x={26} y={44} width={12} height={10} fill={skin} />
      <rect x={26} y={44} width={12} height={2} fill={skinDark} />
      <rect x={26} y={52} width={12} height={2} fill={skinShadow} />

      {/* Koponya alap — széles arc */}
      <rect x={18} y={16} width={28} height={30} fill={skin} />
      {/* Állkapocs, szakáll vonal előkészítése */}
      <rect x={18} y={32} width={2} height={14} fill={skinDark} />
      <rect x={44} y={32} width={2} height={14} fill={skinDark} />
      {/* Halánték árnyék */}
      <rect x={20} y={20} width={2} height={10} fill={skinDark} />
      <rect x={42} y={20} width={2} height={10} fill={skinDark} />

      {/* Haj — rövid, oldalra fésült, barna */}
      <rect x={18} y={12} width={28} height={8} fill={hair} />
      <rect x={16} y={14} width={32} height={4} fill={hair} />
      {/* Oldalsó hajszálak — halántékra */}
      <rect x={16} y={18} width={4} height={8} fill={hair} />
      <rect x={44} y={18} width={4} height={8} fill={hair} />
      {/* Fényfolt (oldal választék) */}
      <rect x={32} y={14} width={6} height={2} fill={hairLight} />
      <rect x={36} y={12} width={4} height={2} fill={hairLight} />
      {/* Haj sötét árnyék a tarkón */}
      <rect x={18} y={20} width={28} height={2} fill={hairDark} />

      {/* Piros-sárga kendő a homlokon */}
      <rect x={16} y={10} width={32} height={4} fill={bandanaRed} />
      <rect x={16} y={13} width={32} height={1} fill={bandanaYellow} />
      <rect x={16} y={10} width={32} height={1} fill={bandanaDark} />
      {/* Kendő oldal-csomó */}
      <rect x={46} y={14} width={4} height={3} fill={bandanaRed} />
      <rect x={48} y={17} width={3} height={4} fill={bandanaRed} />
      <rect x={47} y={14} width={1} height={3} fill={bandanaDark} />

      {/* Szemöldök — sűrű, eltökélt */}
      <rect x={22} y={24} width={7} height={2} fill={hairDark} />
      <rect x={35} y={24} width={7} height={2} fill={hairDark} />
      <rect x={22} y={23} width={2} height={1} fill={hairDark} />
      <rect x={40} y={23} width={2} height={1} fill={hairDark} />

      {/* Szemek */}
      <rect x={22} y={27} width={6} height={3} fill="#fbf5e3" />
      <rect x={36} y={27} width={6} height={3} fill="#fbf5e3" />
      <rect x={24} y={27} width={3} height={3} fill={eye} />
      <rect x={38} y={27} width={3} height={3} fill={eye} />
      <rect x={25} y={28} width={1} height={1} fill="#04141a" />
      <rect x={39} y={28} width={1} height={1} fill="#04141a" />
      {/* Szem alatti fénycsík — életteli tekintet */}
      <rect x={22} y={30} width={6} height={1} fill={skinDark} />
      <rect x={36} y={30} width={6} height={1} fill={skinDark} />

      {/* Orr — szélesebb, férfias */}
      <rect x={30} y={30} width={4} height={7} fill={skin} />
      <rect x={30} y={36} width={4} height={1} fill={skinDark} />
      <rect x={29} y={36} width={1} height={1} fill={skinDark} />
      <rect x={34} y={36} width={1} height={1} fill={skinDark} />
      <rect x={31} y={32} width={2} height={4} fill={skinDark} />

      {/* Bajusz — vaskos, szakállal összenőve */}
      <rect x={24} y={37} width={16} height={3} fill={beard} />
      <rect x={22} y={38} width={20} height={2} fill={beard} />
      <rect x={24} y={37} width={4} height={1} fill={beardDark} />
      <rect x={36} y={37} width={4} height={1} fill={beardDark} />

      {/* Száj — alig látszik a bajusz alatt */}
      <rect x={28} y={40} width={8} height={1} fill={mouth} />

      {/* Szakáll — sűrű, teljes, az arc oldalán kétoldalt fölfut */}
      <rect x={20} y={34} width={4} height={12} fill={beard} />
      <rect x={40} y={34} width={4} height={12} fill={beard} />
      <rect x={22} y={40} width={20} height={6} fill={beard} />
      <rect x={24} y={44} width={16} height={4} fill={beard} />
      <rect x={26} y={46} width={12} height={2} fill={beardDark} />
      {/* Szakáll textúra (csíkok) */}
      <rect x={23} y={42} width={1} height={3} fill={beardDark} />
      <rect x={27} y={42} width={1} height={4} fill={beardDark} />
      <rect x={31} y={42} width={1} height={4} fill={beardDark} />
      <rect x={35} y={42} width={1} height={4} fill={beardDark} />
      <rect x={39} y={42} width={1} height={3} fill={beardDark} />

      {/* Arcpír (napbarnított orcák) */}
      <rect x={20} y={34} width={2} height={2} fill={skinShadow} opacity="0.6" />
      <rect x={42} y={34} width={2} height={2} fill={skinShadow} opacity="0.6" />

      {/* Fülek (alig kilátszanak) */}
      <rect x={16} y={28} width={2} height={5} fill={skin} />
      <rect x={46} y={28} width={2} height={5} fill={skin} />
      {/* Arany karika-fülbevaló bal fülben */}
      <rect x={46} y={33} width={2} height={1} fill={gold} />
      <rect x={47} y={34} width={1} height={2} fill={gold} />
      <rect x={46} y={36} width={2} height={1} fill={gold} />
      <rect x={45} y={34} width={1} height={2} fill={gold} />

      {/* Keret */}
      <rect x={0} y={0} width={64} height={64} fill="none" stroke="#04141a" strokeWidth={2} />
    </svg>
  );
}

type Cfg = {
  bg: string;
  skin: string;
  hair: string;
  hairStyle: 'short' | 'long' | 'braid';
  eye: string;
  mouth: string;
  noseShadow: string;
  clothes: string;
  collar?: string;
  earring?: boolean;
  headwear?: 'bandana' | 'kendo';
};

const PORTRAITS: Record<'aniko' | 'csillag' | 'boroka', Cfg> = {
  aniko: {
    bg: '#4a2b3a', skin: '#e0b89a', hair: '#8a4a20', hairStyle: 'long',
    eye: '#3a2010', mouth: '#c0392b', noseShadow: '#c9a079',
    clothes: '#c0392b', collar: '#fbf5e3', earring: true, headwear: 'kendo',
  },
  csillag: {
    bg: '#2d4466', skin: '#efc9a4', hair: '#e0b24f', hairStyle: 'braid',
    eye: '#145f65', mouth: '#c0392b', noseShadow: '#d9a98a',
    clothes: '#3470d6', collar: '#fbf5e3',
  },
  boroka: {
    bg: '#355833', skin: '#efc9a4', hair: '#6b3e1f', hairStyle: 'short',
    eye: '#3a2010', mouth: '#c0392b', noseShadow: '#d9a98a',
    clothes: '#88e07b', collar: '#fbf5e3',
  },
};
