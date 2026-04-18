interface Props {
  who: 'pegya' | 'aniko' | 'csillag' | 'boroka';
  size?: number;
}

// Egyszerű, stilizált SVG portré — pixeles keret, vajdasági színek.
// Nem fényképrealisztikus, csak hangulatos avatar.
export function Portrait({ who, size = 64 }: Props): JSX.Element {
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
      {/* Háttér napraforgó minta — csak nagy arcoknál */}
      {size >= 64 && (
        <>
          <circle cx={10} cy={10} r={3} fill="#f2c94c" opacity="0.6" />
          <circle cx={54} cy={10} r={3} fill="#f2c94c" opacity="0.4" />
          <circle cx={12} cy={54} r={2} fill="#c0392b" opacity="0.5" />
        </>
      )}
      {/* Nyak */}
      <rect x={28} y={46} width={8} height={8} fill={cfg.skin} />
      <rect x={26} y={52} width={12} height={12} fill={cfg.clothes} />
      {/* Fej */}
      <rect x={20} y={18} width={24} height={28} fill={cfg.skin} />
      {/* Haj */}
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
      {/* Szemek */}
      <rect x={24} y={28} width={3} height={3} fill={cfg.eye} />
      <rect x={37} y={28} width={3} height={3} fill={cfg.eye} />
      {/* Orr */}
      <rect x={31} y={33} width={2} height={4} fill={cfg.noseShadow} />
      {/* Száj */}
      <rect x={27} y={40} width={10} height={2} fill={cfg.mouth} />
      {/* Szakáll (csak Pegya) */}
      {cfg.beard && <rect x={22} y={42} width={20} height={4} fill={cfg.hair} />}
      {/* Fülbevaló (Anikó) */}
      {cfg.earring && (
        <>
          <rect x={18} y={34} width={2} height={2} fill="#f2c94c" />
          <rect x={44} y={34} width={2} height={2} fill="#f2c94c" />
        </>
      )}
      {/* Kendő / fejfedő */}
      {cfg.headwear === 'bandana' && (
        <>
          <rect x={18} y={14} width={28} height={6} fill="#c0392b" />
          <rect x={18} y={18} width={28} height={2} fill="#f2c94c" />
        </>
      )}
      {cfg.headwear === 'kendo' && (
        <>
          <rect x={14} y={14} width={36} height={6} fill="#c0392b" />
          <rect x={14} y={14} width={3} height={3} fill="#f2c94c" />
          <rect x={47} y={14} width={3} height={3} fill="#f2c94c" />
        </>
      )}
      {/* Gallér */}
      <rect x={20} y={56} width={24} height={8} fill={cfg.collar ?? cfg.clothes} />
      {/* Név keret */}
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
  beard?: boolean;
  earring?: boolean;
  headwear?: 'bandana' | 'kendo';
};

const PORTRAITS: Record<'pegya' | 'aniko' | 'csillag' | 'boroka', Cfg> = {
  pegya: {
    bg: '#1a3a5a', skin: '#c9a079', hair: '#3a2010', hairStyle: 'short',
    eye: '#1a1a1a', mouth: '#6b3e1f', noseShadow: '#8a6a5a',
    clothes: '#6b3e1f', collar: '#fbf5e3', beard: true, headwear: 'bandana',
  },
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
