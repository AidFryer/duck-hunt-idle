/** A little picture of the lodge at each level (inline SVG, no assets). */
const WOOD = '#8a5a3b';
const WOOD_DARK = '#6b4a2f';
const ROOF = '#b5562b';
const ROOF_DARK = '#8f4220';
const GLASS = '#f6d98a';
const STONE = '#9e8f8a';
const WATER = '#7f9fb0';
const GRASS = '#7c8f5a';

function Window({ x, y, w = 9, h = 8 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={1} fill={GLASS} />
      <path d={`M${x + w / 2} ${y}v${h}M${x} ${y + h / 2}h${w}`} stroke={WOOD_DARK} stroke-width={1} />
    </g>
  );
}

function Logs({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const lines = [];
  for (let yy = y + 4; yy < y + h; yy += 4) lines.push(<path d={`M${x} ${yy}h${w}`} stroke={WOOD_DARK} stroke-width={0.8} opacity={0.6} />);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={WOOD} />
      {lines}
    </g>
  );
}

export function LodgeArt({ level, size = 160 }: { level: number; size?: number }) {
  return (
    <svg class="lodge-art" viewBox="0 0 160 90" width={size} height={(size * 90) / 160} aria-hidden="true">
      <rect x={0} y={70} width={160} height={20} fill={WATER} opacity={0.6} />
      <path d="M0 72 Q40 64 80 70 T160 68 V76 H0Z" fill={GRASS} />
      {level <= 1 && (
        <g>
          <Logs x={58} y={50} w={36} h={22} />
          <path d="M54 52 L76 38 L98 52Z" fill={ROOF_DARK} />
          <path d="M60 46 l6 -3 M80 40 l8 5" stroke={WOOD_DARK} stroke-width={1.5} />
          <rect x={72} y={58} width={8} height={14} fill={WOOD_DARK} />
          <rect x={88} y={40} width={4} height={10} fill={STONE} />
        </g>
      )}
      {level === 2 && (
        <g>
          <Logs x={50} y={46} w={56} h={26} />
          <path d="M44 48 L78 28 L112 48Z" fill={ROOF} />
          <path d="M44 48 L78 28 L112 48" fill="none" stroke={ROOF_DARK} stroke-width={2} />
          <rect x={94} y={26} width={7} height={16} fill={STONE} />
          <Window x={56} y={54} />
          <Window x={91} y={54} />
          <rect x={73} y={56} width={10} height={16} rx={1} fill={WOOD_DARK} />
        </g>
      )}
      {level === 3 && (
        <g>
          <Logs x={36} y={40} w={84} h={32} />
          <path d="M30 42 L78 18 L126 42Z" fill={ROOF} />
          <path d="M30 42 L78 18 L126 42" fill="none" stroke={ROOF_DARK} stroke-width={2} />
          <rect x={104} y={18} width={8} height={18} fill={STONE} />
          <Window x={44} y={50} />
          <Window x={58} y={50} />
          <Window x={90} y={50} />
          <Window x={104} y={50} />
          <Window x={74} y={28} w={8} h={7} />
          <rect x={73} y={54} width={10} height={18} rx={1} fill={WOOD_DARK} />
          <rect x={30} y={64} width={96} height={3} fill={WOOD_DARK} />
          <path d="M34 64v8M60 64v8M96 64v8M122 64v8" stroke={WOOD_DARK} stroke-width={1.5} />
        </g>
      )}
      {level === 4 && (
        <g>
          <Logs x={18} y={48} w={34} h={24} />
          <path d="M14 50 L35 36 L56 50Z" fill={ROOF} />
          <Logs x={46} y={30} w={74} h={42} />
          <path d="M40 32 L83 10 L126 32Z" fill={ROOF} />
          <path d="M40 32 L83 10 L126 32" fill="none" stroke={ROOF_DARK} stroke-width={2} />
          <rect x={106} y={10} width={9} height={18} fill={STONE} />
          <Window x={54} y={38} />
          <Window x={68} y={38} />
          <Window x={92} y={38} />
          <Window x={106} y={38} />
          <Window x={54} y={54} />
          <Window x={106} y={54} />
          <Window x={26} y={56} />
          <rect x={76} y={52} width={14} height={20} rx={1} fill={WOOD_DARK} />
          <rect x={40} y={64} width={86} height={3} fill={WOOD_DARK} />
          <rect x={120} y={60} width={30} height={4} fill={WOOD_DARK} />
        </g>
      )}
      {level >= 5 && (
        <g>
          <Logs x={8} y={44} w={36} h={28} />
          <path d="M4 46 L26 30 L48 46Z" fill={ROOF} />
          <Logs x={116} y={44} w={36} h={28} />
          <path d="M112 46 L134 30 L156 46Z" fill={ROOF} />
          <Logs x={40} y={26} w={80} h={46} />
          <path d="M34 28 L80 4 L126 28Z" fill={ROOF} />
          <path d="M34 28 L80 4 L126 28" fill="none" stroke={ROOF_DARK} stroke-width={2} />
          <rect x={56} y={4} width={10} height={20} fill={STONE} />
          <path d="M80 4v-6" stroke={WOOD_DARK} stroke-width={1} />
          <path d="M80 -2 l9 2.5 l-9 2.5Z" fill={ROOF} />
          {[46, 60, 92, 106].map((x) => <Window x={x} y={34} />)}
          {[46, 106].map((x) => <Window x={x} y={52} />)}
          <Window x={16} y={52} />
          <Window x={128} y={52} />
          <rect x={72} y={50} width={16} height={22} rx={2} fill={WOOD_DARK} />
          <rect x={34} y={64} width={92} height={3} fill={WOOD_DARK} />
          <circle cx={30} cy={66} r={2} fill={GLASS} />
          <circle cx={130} cy={66} r={2} fill={GLASS} />
        </g>
      )}
    </svg>
  );
}
