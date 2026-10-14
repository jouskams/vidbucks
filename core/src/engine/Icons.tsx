import { useContext } from "react";
import { InkContext, PAL, col } from "./theme";

// Hand-drawn style icons in a 100x100 box.
const S = (ink: string) => ({ stroke: ink, strokeWidth: 5, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" }) as const;

const ICONS: Record<string, (c: string, ink: string) => React.ReactNode> = {
  book: (c, ink) => (<g><path d="M10 22 Q 30 14 50 24 Q 70 14 90 22 L 90 80 Q 70 72 50 82 Q 30 72 10 80 Z" {...S(ink)} fill={c} /><path d="M50 24 L50 82" {...S(ink)} /></g>),
  note: (c, ink) => (<g><rect x="20" y="10" width="60" height="80" rx="6" {...S(ink)} fill={c} /><path d="M32 30 h36 M32 44 h36 M32 58 h36 M32 72 h22" {...S(ink)} strokeWidth={4} /></g>),
  pencil: (c, ink) => (<g><path d="M18 82 L24 62 L72 14 L88 30 L40 78 Z" {...S(ink)} fill={c} /><path d="M62 24 L78 40 M18 82 L32 76" {...S(ink)} strokeWidth={4} /></g>),
  highlighter: (_c, ink) => (<g><path d="M24 70 L60 24 L80 40 L44 86 Z" {...S(ink)} fill={PAL.yellow} /><path d="M14 90 h40" {...S(ink)} stroke={PAL.yellow} strokeWidth={9} /></g>),
  clock: (c, ink) => (<g><circle cx="50" cy="52" r="38" {...S(ink)} fill={c} /><path d="M50 52 L50 28 M50 52 L68 60" {...S(ink)} /><path d="M40 10 h20" {...S(ink)} /></g>),
  hourglass: (c, ink) => (<g><path d="M24 10 h52 M24 90 h52 M28 10 Q 28 44 50 50 Q 72 44 72 10 M28 90 Q 28 56 50 50 Q 72 56 72 90" {...S(ink)} /><path d="M38 80 Q 50 66 62 80 Z" fill={c} stroke="none" /></g>),
  brain: (c, ink) => (<g><path d="M50 18 Q 34 6 22 22 Q 6 26 12 44 Q 4 58 20 66 Q 24 86 44 80 Q 50 86 56 80 Q 76 86 80 66 Q 96 58 88 44 Q 94 26 78 22 Q 66 6 50 18 Z" {...S(ink)} fill={c} /><path d="M50 18 L50 80 M30 40 q 10 4 20 -4 M70 44 q -10 4 -20 -4 M32 60 q 10 -4 18 4" {...S(ink)} strokeWidth={3.5} /></g>),
  bulb: (c, ink) => (<g><path d="M50 8 Q 20 12 24 44 Q 26 56 36 66 L36 76 L64 76 L64 66 Q 74 56 76 44 Q 80 12 50 8 Z" {...S(ink)} fill={c} /><path d="M38 84 h24 M42 92 h16" {...S(ink)} /></g>),
  calendar: (c, ink) => (<g><rect x="10" y="18" width="80" height="72" rx="8" {...S(ink)} fill={c} /><path d="M10 40 h80 M32 8 v18 M68 8 v18" {...S(ink)} /><path d="M24 54 h8 M46 54 h8 M68 54 h8 M24 70 h8 M46 70 h8" {...S(ink)} strokeWidth={6} /></g>),
  moon: (_c, ink) => (<g><path d="M62 10 Q 28 14 28 52 Q 28 86 66 90 Q 36 80 40 46 Q 42 24 62 10 Z" {...S(ink)} fill={PAL.yellow} /></g>),
  zzz: (_c, ink) => (<g fontFamily="Permanent Marker, cursive" fill={ink}><text x="10" y="80" fontSize="40">Z</text><text x="38" y="52" fontSize="32">z</text><text x="62" y="30" fontSize="24">z</text></g>),
  question: (_c, ink) => (<g><path d="M30 30 Q 30 10 50 10 Q 72 10 72 30 Q 72 44 54 52 Q 48 56 48 64" {...S(ink)} strokeWidth={9} /><circle cx="48" cy="84" r="5" fill={ink} stroke={ink} /></g>),
  exclaim: (_c, ink) => (<g><path d="M50 10 L50 62" {...S(ink)} strokeWidth={11} /><circle cx="50" cy="86" r="6" fill={ink} stroke={ink} /></g>),
  check: (_c, ink) => (<path d="M14 54 L40 80 L88 22" {...S(ink)} stroke={PAL.green} strokeWidth={13} />),
  cross: (_c, ink) => (<path d="M18 18 L82 82 M82 18 L18 82" {...S(ink)} stroke={PAL.red} strokeWidth={13} />),
  card: (c, ink) => (<g><rect x="8" y="22" width="84" height="58" rx="8" {...S(ink)} fill={c} /><path d="M24 44 h36 M24 60 h22" {...S(ink)} strokeWidth={4} /></g>),
  trophy: (_c, ink) => (<g><path d="M28 12 h44 v28 Q 72 62 50 64 Q 28 62 28 40 Z" {...S(ink)} fill={PAL.yellow} /><path d="M28 20 Q 8 20 12 36 Q 16 46 30 46 M72 20 Q 92 20 88 36 Q 84 46 70 46 M50 64 v16 M32 88 h36" {...S(ink)} /></g>),
  cap: (c, ink) => (<g><path d="M6 38 L50 18 L94 38 L50 58 Z" {...S(ink)} fill={c} /><path d="M26 50 v20 Q 50 86 74 70 v-20 M94 38 v26" {...S(ink)} /></g>),
  battery: (c, ink) => (<g><rect x="8" y="30" width="78" height="42" rx="8" {...S(ink)} fill="none" /><path d="M92 42 v18" {...S(ink)} strokeWidth={8} /><rect x="14" y="36" width="22" height="30" fill={c} stroke="none" /></g>),
  bed: (c, ink) => (<g><path d="M6 40 v44 M6 70 h88 v14 M94 70 v-18 Q 94 44 80 44 H40 v26" {...S(ink)} /><circle cx="24" cy="54" r="12" {...S(ink)} fill={c} /></g>),
  speaker: (_c, ink) => (<g><path d="M10 38 h18 L52 18 V82 L28 62 H10 Z" {...S(ink)} fill={PAL.paper2} /><path d="M66 36 Q 78 50 66 64 M76 26 Q 96 50 76 74" {...S(ink)} /></g>),
  magnifier: (_c, ink) => (<g><circle cx="42" cy="42" r="28" {...S(ink)} fill={PAL.paper2} /><path d="M64 64 L90 90" {...S(ink)} strokeWidth={10} /></g>),
  star: (c, ink) => (<path d="M50 8 L61 36 L92 38 L68 58 L76 88 L50 72 L24 88 L32 58 L8 38 L39 36 Z" {...S(ink)} fill={c} />),
  heart: (c, ink) => (<path d="M50 88 Q 8 56 12 32 Q 18 10 38 16 Q 46 18 50 28 Q 54 18 62 16 Q 82 10 88 32 Q 92 56 50 88 Z" {...S(ink)} fill={c} />),
  road: (_c, ink) => (<g><path d="M34 92 L44 10 L56 10 L66 92 Z" {...S(ink)} fill={PAL.grey} /><path d="M50 18 v10 M50 40 v12 M50 66 v14" {...S(ink)} stroke="#fff" strokeWidth={4} /></g>),
  grass: (_c, ink) => (<g {...S(ink)} stroke={PAL.green}><path d="M20 90 Q 22 60 14 40 M34 90 Q 36 56 40 30 M50 90 Q 52 64 62 44 M66 90 Q 68 66 80 52 M82 90 Q 82 74 92 62" /></g>),
  tree: (_c, ink) => (<g><path d="M50 92 v-34" {...S(ink)} strokeWidth={8} /><circle cx="50" cy="38" r="28" {...S(ink)} fill="#9ad49a" /></g>),
  phone: (c, ink) => (<g><rect x="28" y="6" width="44" height="88" rx="9" {...S(ink)} fill={c} /><path d="M44 84 h12" {...S(ink)} strokeWidth={4} /></g>),
  coffee: (_c, ink) => (<g><path d="M18 36 h50 v34 Q 68 88 44 88 Q 18 88 18 70 Z M68 44 h8 Q 90 44 86 60 Q 82 70 68 66" {...S(ink)} fill={PAL.paper2} /><path d="M30 16 q -6 8 0 14 M46 14 q -6 8 0 14" {...S(ink)} strokeWidth={4} /></g>),
  arrowr: (c, ink) => (<path d="M8 50 H88 M62 24 L90 50 L62 76" {...S(ink)} stroke={c} strokeWidth={9} />),
  loop: (c, ink) => (<g {...S(ink)} stroke={c} strokeWidth={8}><path d="M82 40 A 32 32 0 1 0 82 62" /><path d="M86 20 L84 42 L64 38" /></g>),
  sparkle: (_c, ink) => (<g {...S(ink)} stroke={PAL.orange} strokeWidth={6}><path d="M50 8 v24 M50 68 v24 M8 50 h24 M68 50 h24 M22 22 l14 14 M64 64 l14 14 M78 22 l-14 14 M36 64 l-14 14" /></g>),
};

const DEFAULT_FILL: Record<string, string> = {
  book: PAL.blue, clock: PAL.paper, brain: "#ffb3c7", bulb: PAL.yellow, calendar: PAL.paper, battery: PAL.green, note: "#fff", card: "#fff",
  pencil: PAL.orange, cap: PAL.ink, arrowr: PAL.orange, loop: PAL.blue, star: PAL.yellow, heart: PAL.red, bed: PAL.blue, phone: PAL.paper2,
};

export const ICON_NAMES = Object.keys(ICONS);
/** Icon in a 100x100 box scaled by s, placed with top-left (x,y). */
export const Icon: React.FC<{ n: string; s?: number; x?: number; y?: number; color?: string }> = ({ n, s = 1, x = 0, y = 0, color }) => {
  const draw = ICONS[n];
  if (!draw) throw new Error(`unknown icon ${n}. Known: ${ICON_NAMES.join(", ")}`);
  const ink = useContext(InkContext);
  const base = DEFAULT_FILL[n] ?? PAL.paper2;
  const darkMode = ink === PAL.paper;
  const c = color ? col(color) : darkMode && (base === PAL.paper || base === PAL.paper2 || base === "#fff") ? "#2e3a63" : base;
  return <g transform={`translate(${x} ${y}) scale(${s})`}>{draw(c, ink)}</g>;
};
export const IconSvg: React.FC<{ n: string; size?: number; color?: string }> = ({ n, size = 160, color }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ overflow: "visible" }}><Icon n={n} color={color} /></svg>
);
