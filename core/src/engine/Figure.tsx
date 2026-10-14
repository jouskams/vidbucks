import { useContext } from "react";
import { InkContext, PAL, col } from "./theme";
import { Icon } from "./Icons";
import { Face2 } from "./Face2";

// Angles in degrees from "straight down", positive toward +x (facing direction).
export type Pose = { torso: number; lArm: [number, number]; rArm: [number, number]; lLeg: [number, number]; rLeg: [number, number]; drop?: number };
const L = { torso: 112, upper: 60, fore: 56, thigh: 80, shin: 78, head: 38 };
const d2r = (a: number) => (a * Math.PI) / 180;
const vec = (a: number, len: number) => ({ x: Math.sin(d2r(a)) * len, y: Math.cos(d2r(a)) * len });
const add = (p: { x: number; y: number }, q: { x: number; y: number }) => ({ x: p.x + q.x, y: p.y + q.y });

export const POSES: Record<string, Pose> = {
  idle: { torso: 0, lArm: [-14, -8], rArm: [14, 8], lLeg: [-7, -3], rLeg: [7, 3] },
  talk: { torso: 2, lArm: [-14, -8], rArm: [48, 100], lLeg: [-7, -3], rLeg: [7, 3] },
  point: { torso: 3, lArm: [-14, -8], rArm: [84, 88], lLeg: [-7, -3], rLeg: [7, 3] },
  pointup: { torso: 0, lArm: [-14, -8], rArm: [150, 168], lLeg: [-7, -3], rLeg: [7, 3] },
  think: { torso: 2, lArm: [-14, -8], rArm: [10, 172], lLeg: [-7, -3], rLeg: [7, 3] },
  cheer: { torso: 0, lArm: [-150, -168], rArm: [150, 168], lLeg: [-14, -8], rLeg: [14, 8] },
  shrug: { torso: 0, lArm: [-52, -105], rArm: [52, 105], lLeg: [-7, -3], rLeg: [7, 3] },
  tired: { torso: 12, lArm: [-4, -4], rArm: [4, 4], lLeg: [-5, -2], rLeg: [5, 2] },
  hold: { torso: 2, lArm: [38, 128], rArm: [52, 132], lLeg: [-7, -3], rLeg: [7, 3] },
  write: { torso: 8, lArm: [30, 100], rArm: [58, 96], lLeg: [-7, -3], rLeg: [7, 3] },
  stop: { torso: 0, lArm: [-14, -8], rArm: [96, 176], lLeg: [-7, -3], rLeg: [7, 3] },
  wave: { torso: 0, lArm: [-14, -8], rArm: [150, 150], lLeg: [-7, -3], rLeg: [7, 3] },
  sit: { torso: 4, lArm: [30, 100], rArm: [40, 100], lLeg: [84, 4], rLeg: [88, 6] },
  lean: { torso: 18, lArm: [-14, -8], rArm: [40, 120], lLeg: [-7, -3], rLeg: [7, 3] },
  // acting poses (v4)
  fist: { torso: -2, lArm: [-18, -10], rArm: [118, 150], lLeg: [-12, -6], rLeg: [12, 6] },
  slump: { torso: -30, lArm: [-40, -10], rArm: [70, 160], lLeg: [80, 8], rLeg: [86, 10] },
  hug: { torso: 18, lArm: [52, -20], rArm: [62, -12], lLeg: [128, 12], rLeg: [136, 16], drop: 132 },
  kneel: { torso: 12, lArm: [-10, -4], rArm: [20, 30], lLeg: [82, 2], rLeg: [4, -88], drop: 76 },
  lace: { torso: 38, lArm: [62, 20], rArm: [74, 28], lLeg: [84, 4], rLeg: [4, -88], drop: 76 },
  collapse: { torso: 34, lArm: [26, 6], rArm: [34, 10], lLeg: [8, -86], rLeg: [14, -84], drop: 78 },
  slouch: { torso: 16, lArm: [-2, 4], rArm: [6, 10], lLeg: [-4, -2], rLeg: [4, 2] },
  ready: { torso: 20, lArm: [-40, 50], rArm: [40, 120], lLeg: [-24, -20], rLeg: [26, 10] },
  stretch: { torso: -4, lArm: [-138, -158], rArm: [138, 158], lLeg: [-10, -4], rLeg: [10, 4] },
};

const walkPose = (ph: number): Pose => {
  const s = Math.sin(ph);
  return { torso: 4, lArm: [-s * 28, -s * 28 + 12], rArm: [s * 28, s * 28 + 12], lLeg: [s * 30, s * 30 - 14 - Math.max(0, Math.cos(ph)) * 18], rLeg: [-s * 30, -s * 30 - 14 - Math.max(0, -Math.cos(ph)) * 18] };
};
const runPose = (ph: number): Pose => {
  const s = Math.sin(ph), c = Math.cos(ph);
  const leg = (k: number): [number, number] => { const th = k * s * 46 + 8; const bend = 22 + Math.max(0, -k * c) * 78; return [th, th - bend]; };
  return { torso: 16 + Math.sin(ph * 2) * 1.5, lArm: [-s * 58 + 6, -s * 58 + 96], rArm: [s * 58 + 6, s * 58 + 96], lLeg: leg(1), rLeg: leg(-1) };
};
export const lerpPose = (a: Pose, b: Pose, t: number): Pose => {
  const m = (x: number, y: number) => x + (y - x) * t;
  const m2 = (x: [number, number], y: [number, number]): [number, number] => [m(x[0], y[0]), m(x[1], y[1])];
  return { torso: m(a.torso, b.torso), lArm: m2(a.lArm, b.lArm), rArm: m2(a.rArm, b.rArm), lLeg: m2(a.lLeg, b.lLeg), rLeg: m2(a.rLeg, b.rLeg), drop: m(a.drop ?? 0, b.drop ?? 0) };
};
export const getPose = (name: string, f: number, anim?: string): Pose => {
  if (name === "walk") return walkPose(f * 0.34);
  if (name === "run") return runPose(f * 0.46);
  if (name === "jog") return runPose(f * 0.36);
  const base = POSES[name] ?? POSES.idle;
  const p: Pose = { ...base, lArm: [...base.lArm], rArm: [...base.rArm] };
  const t = f / 30;
  if (anim === "wave" || name === "wave") p.rArm = [150 + Math.sin(t * 9) * 12, 150 + Math.sin(t * 9 + 1) * 34];
  else if (anim === "bob") { p.torso += Math.sin(t * 3) * 1.6; p.lArm = [p.lArm[0] + Math.sin(t * 2.2) * 2, p.lArm[1] + Math.sin(t * 2.2) * 3]; p.rArm = [p.rArm[0] - Math.sin(t * 2.2) * 2, p.rArm[1] - Math.sin(t * 2.2) * 3]; }
  else if (anim === "talk") p.rArm = [base.rArm[0] + Math.sin(t * 5) * 8, base.rArm[1] + Math.sin(t * 5 + 1) * 14];
  else if (anim === "nod") p.torso += Math.sin(t * 4) * 3;
  else if (anim === "shake") p.torso += Math.sin(t * 22) * 2;
  return p;
};

export const joints = (p: Pose) => {
  const hip = { x: 0, y: 0 };
  const sh = { x: Math.sin(d2r(p.torso)) * L.torso, y: -Math.cos(d2r(p.torso)) * L.torso };
  const lElbow = add(sh, vec(p.lArm[0], L.upper)); const lHand = add(lElbow, vec(p.lArm[1], L.fore));
  const rElbow = add(sh, vec(p.rArm[0], L.upper)); const rHand = add(rElbow, vec(p.rArm[1], L.fore));
  const lKnee = add(hip, vec(p.lLeg[0], L.thigh)); const lFoot = add(lKnee, vec(p.lLeg[1], L.shin));
  const rKnee = add(hip, vec(p.rLeg[0], L.thigh)); const rFoot = add(rKnee, vec(p.rLeg[1], L.shin));
  const head = add(sh, { x: Math.sin(d2r(p.torso)) * (L.head + 6), y: -Math.cos(d2r(p.torso)) * (L.head + 6) });
  return { hip, sh, lElbow, lHand, rElbow, rHand, lKnee, lFoot, rKnee, rFoot, head };
};

const Face: React.FC<{ x: number; y: number; face: string; f: number }> = ({ x, y, face, f }) => {
  const blink = f % 110 > 104 || face === "sleep";
  const ey = y - 4;
  const eye = (cx: number) =>
    blink ? <path d={`M${cx - 6} ${ey} l12 0`} stroke={PAL.ink} strokeWidth={4} strokeLinecap="round" /> : <circle cx={cx} cy={ey} r={face === "shock" ? 6.5 : 4.6} fill={PAL.ink} />;
  const mouth: Record<string, string> = {
    smile: `M${x - 3} ${y + 14} q 14 14 28 0`, flat: `M${x} ${y + 18} l 24 0`, sad: `M${x} ${y + 24} q 12 -14 26 0`, open: `M${x + 2} ${y + 14} q 12 24 24 0 z`,
    worry: `M${x} ${y + 22} q 6 -8 12 0 q 6 8 12 0`, shock: `M${x + 12} ${y + 16} a 8 10 0 1 0 0.1 0 z`, think: `M${x + 2} ${y + 18} l 20 -2`, sleep: `M${x + 4} ${y + 18} q 10 8 20 0`,
  };
  return (
    <g>
      {eye(x - 8)}{eye(x + 18)}
      {(face === "worry" || face === "sad") && <path d={`M${x - 16} ${ey - 11} l 16 4 M${x + 28} ${ey - 11} l -16 4`} stroke={PAL.ink} strokeWidth={3.5} strokeLinecap="round" />}
      {face === "think" && <path d={`M${x - 16} ${ey - 10} l 16 -3 M${x + 10} ${ey - 10} l 16 3`} stroke={PAL.ink} strokeWidth={3.5} strokeLinecap="round" />}
      <path d={mouth[face] ?? mouth.smile} stroke={PAL.ink} strokeWidth={4} fill={face === "open" || face === "shock" ? PAL.ink : "none"} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
};

/** Stick figure; the hip is at (260,360) inside a 520x560 box. */
export const Figure: React.FC<{
  pose: Pose; face?: string; shirt?: string; prop?: string; f: number; glasses?: boolean; label?: string; sweat?: boolean; headFill?: string; headband?: string; eyeColor?: string; grin?: boolean; wind?: number;
  big?: boolean; expr?: string; exprPrev?: string; exprBlend?: number; look?: [number, number]; tilt?: number; alive?: boolean;
}> = ({ pose, face = "smile", shirt = "blue", prop, f, glasses, label, sweat, headFill, headband, eyeColor, grin, wind = 0.15, big, expr, exprPrev, exprBlend, look, tilt = 0, alive = true }) => {
  const j = joints(pose);
  const O = { x: 260, y: 360 + (pose.drop ?? 0) };
  const P = (p: { x: number; y: number }) => `${O.x + p.x} ${O.y + p.y}`;
  const limb = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) => `M${P(a)} L${P(b)} L${P(c)}`;
  const sw = 14;
  const R = big ? L.head * 1.5 : L.head;
  const hd = big ? { x: j.sh.x + Math.sin(d2r(pose.torso)) * (R + 3), y: j.sh.y - Math.cos(d2r(pose.torso)) * (R + 3) } : j.head;
  const hx = O.x + hd.x, hy = O.y + hd.y;
  const sway = alive && big ? Math.sin(f * 0.07) * 1.6 : 0;
  const ink = useContext(InkContext);
  return (
    <svg width={520} height={560} viewBox="0 0 520 560" style={{ overflow: "visible" }}>
      <path d={limb(j.hip, j.lKnee, j.lFoot)} stroke={ink} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.78} />
      <path d={limb(j.sh, j.lElbow, j.lHand)} stroke={ink} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.78} />
      <path d={`M${P(j.hip)} L${P(j.sh)}`} stroke={ink} strokeWidth={50} strokeLinecap="round" />
      <path d={`M${P(j.hip)} L${P(j.sh)}`} stroke={col(shirt)} strokeWidth={38} strokeLinecap="round" />
      <path d={limb(j.hip, j.rKnee, j.rFoot)} stroke={ink} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={limb(j.sh, j.rElbow, j.rHand)} stroke={ink} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {prop && (
        <g transform={`translate(${O.x + j.rHand.x} ${O.y + j.rHand.y})`}>
          <Icon n={prop} s={0.9} x={-30} y={-62} />
        </g>
      )}
      <g transform={`rotate(${tilt + sway} ${hx} ${hy + R * 0.8})`}>
        <circle cx={hx} cy={hy} r={R} fill={headFill ?? PAL.paper} stroke={ink} strokeWidth={sw - 2} />
        {headband && [0, 1].map((k) => {
          const bx = hx - R * 0.92, by = hy - R * 0.44 + k * 6, L2 = R * (1.25 - k * 0.25);
          const w1 = Math.sin(f * (0.35 + wind * 0.4) + k * 1.3) * (6 + wind * 16), w2 = Math.sin(f * (0.35 + wind * 0.4) + k * 1.3 + 1.6) * (8 + wind * 20);
          return <path key={k} d={`M${bx} ${by} Q${bx - L2 * 0.5} ${by + w1 + 14 * (1 - wind)} ${bx - L2 * (0.55 + 0.45 * wind)} ${by + w2 + 46 * (1 - wind)}`} stroke={col(headband)} strokeWidth={big ? 9 : 7} fill="none" strokeLinecap="round" />;
        })}
        {headband && <path d={`M${hx - R + 2} ${hy - R * 0.38} Q${hx} ${hy - R * 0.58} ${hx + R - 2} ${hy - R * 0.38}`} stroke={col(headband)} strokeWidth={big ? 11 : 9} fill="none" strokeLinecap="round" />}
        {eyeColor ? (
          <g>
            <ellipse cx={hx - 15 * R / L.head} cy={hy - 6 * R / L.head} rx={7 * R / L.head} ry={5 * R / L.head} fill={col(eyeColor)} style={{ filter: `drop-shadow(0 0 6px ${col(eyeColor)})` }} />
            <ellipse cx={hx + 11 * R / L.head} cy={hy - 6 * R / L.head} rx={7 * R / L.head} ry={5 * R / L.head} fill={col(eyeColor)} style={{ filter: `drop-shadow(0 0 6px ${col(eyeColor)})` }} />
            {grin && <path d={`M${hx - 20 * R / L.head} ${hy + 12 * R / L.head} l8 8 l8 -8 l8 8 l8 -8 l8 8`} stroke={col(eyeColor)} strokeWidth={4} fill="none" strokeLinejoin="round" />}
          </g>
        ) : (big || expr) ? <Face2 cx={hx} cy={hy} r={R} expr={expr ?? face} prev={exprPrev} blend={exprBlend} look={look} f={f} ink="#1d1d22" fill={headFill ?? PAL.paper} /> : <Face x={hx - 5} y={hy} face={face} f={f} />}
      </g>
      {glasses && (
        <g stroke={ink} strokeWidth={3.5} fill="none"><circle cx={hx - 13} cy={hy - 4} r={11} /><circle cx={hx + 13} cy={hy - 4} r={11} /><path d={`M${hx - 2} ${hy - 4} l 4 0`} /></g>
      )}
      {sweat && <path d={`M${hx + 40} ${hy - 30} q 8 14 0 20 q -8 -6 0 -20 z`} fill="#6ec6ff" stroke={ink} strokeWidth={2.5} />}
      {label && (
        <text x={O.x} y={O.y + 215} textAnchor="middle" fontFamily="Permanent Marker, cursive" fontSize={34} fill={ink}>{label}</text>
      )}
    </svg>
  );
};
