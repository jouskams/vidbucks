import React from "react";
import { interpolate, random } from "remotion";
import { CL, EASE } from "./theme";
import { getPose, lerpPose, POSES, type Pose } from "./Figure";
import type { Ctx } from "./Objs";

/* "Doomer-sketch" full-body character: big bald head, small droopy eyes with heavy lids and bags, stipple stubble,
   thin neck, line-art body whose build morphs continuously:  weight 0 (skinny) .. 1 (chubby),  muscle 0 .. 1 (built).
   Original drawing (inspired by the meme line-art language, not a copy of any meme character). */
type P = { o: Record<string, any>; f: number; a: number; ctx: Ctx };
const INK = "#141414";
const SKIN = "#f3f0e8";
const d2r = (a: number) => (a * Math.PI) / 180;
const vec = (a: number, l: number) => ({ x: Math.sin(d2r(a)) * l, y: Math.cos(d2r(a)) * l });
const add = (p: { x: number; y: number }, q: { x: number; y: number }) => ({ x: p.x + q.x, y: p.y + q.y });

/* extra gym / life poses (angles in degrees from straight down, + toward +x) */
const EXTRA: Record<string, Pose> = {
  stand: { torso: 0, lArm: [-8, -4], rArm: [8, 4], lLeg: [-5, -2], rLeg: [5, 2] },
  slouch: { torso: 8, lArm: [-2, 6], rArm: [6, 12], lLeg: [-5, -2], rLeg: [5, 2] },
  curlDown: { torso: 0, lArm: [-10, -6], rArm: [8, 14], lLeg: [-8, -3], rLeg: [8, 3] },
  curlUp: { torso: -2, lArm: [-10, -6], rArm: [6, 160], lLeg: [-8, -3], rLeg: [8, 3] },
  pressDown: { torso: 0, lArm: [-80, -170], rArm: [80, 170], lLeg: [-10, -4], rLeg: [10, 4] },
  pressUp: { torso: 0, lArm: [-165, -175], rArm: [165, 175], lLeg: [-10, -4], rLeg: [10, 4] },
  squatUp: { torso: 4, lArm: [-60, -80], rArm: [60, 80], lLeg: [-14, -6], rLeg: [14, 6] },
  squatDown: { torso: 22, lArm: [-80, -90], rArm: [80, 90], lLeg: [-70, 10], rLeg: [70, -10], drop: 150 },
  phone: { torso: 6, lArm: [-6, -2], rArm: [30, 150], lLeg: [-5, -2], rLeg: [5, 2] },
  wave: { torso: 0, lArm: [-8, -4], rArm: [140, 160], lLeg: [-5, -2], rLeg: [5, 2] },
  flex: { torso: 0, lArm: [-95, -175], rArm: [95, 175], lLeg: [-10, -4], rLeg: [10, 4] },
  couch: { torso: -14, lArm: [-30, -10], rArm: [40, 150], lLeg: [80, 6], rLeg: [86, 8] },
  tired: { torso: 18, lArm: [6, 10], rArm: [12, 16], lLeg: [-6, -2], rLeg: [6, 2] },
  pointself: { torso: 0, lArm: [-8, -4], rArm: [40, 200], lLeg: [-5, -2], rLeg: [5, 2] },
};
const poseOf = (name: string, f: number) => EXTRA[name] ? { ...EXTRA[name] } : POSES[name] ? getPose(name, f, "bob") : getPose(name, f);

const BROW: Record<string, [number, number]> = { neutral: [0, 0], smile: [-2, 2], grin: [-4, 2], sad: [-12, 8], cry: [-14, 8], tired: [4, 6], surprised: [-16, -10], angry: [12, -6], pained: [10, -8], determined: [8, -6], proud: [-2, -2] };

/** the head, centred on (0,0); width ~300 */
export const DoomerHead: React.FC<{ expr: string; age: number; look?: [number, number]; f: number; seed: number; hat?: string; hatColor?: string; glasses?: boolean; sweat?: boolean; tears?: boolean; fill?: string; chub?: number }> = ({ expr, age, look = [0, 0], f, seed, hat, hatColor, glasses, sweat, tears, fill = SKIN, chub = 0 }) => {
  const e = expr;
  const br = BROW[e] ?? [0, 0];
  const blink = !["cry", "pained"].includes(e) && (f + seed * 23) % 126 > 121;
  const lid = e === "surprised" ? 0.2 : e === "tired" ? 0.75 : e === "angry" || e === "determined" || e === "pained" ? 0.6 : 0.5;
  const dots: React.ReactNode[] = [];
  const n = 150 + age * 60;
  for (let k = 0; k < n; k++) {
    const x = (random(`d${seed}x${k}`) * 2 - 1) * 128, y = 52 + random(`d${seed}y${k}`) * 110;
    const inside = (x * x) / (138 * 138) + ((y - 40) * (y - 40)) / (128 * 128) < 1 && y < 150 - Math.abs(x) * 0.35;
    if (!inside || (Math.abs(x) < 30 && y > 88 && y < 118) || (Math.abs(x) < 20 && y < 74)) continue;
    dots.push(<circle key={k} cx={x} cy={y} r={1.3 + random(`d${seed}r${k}`) * 1.4} fill={age >= 2 ? "#8a8a8a" : "#2e2e2e"} opacity={0.85} />);
  }
  const eye = (side: number) => {
    const cx = side * 50, cy = 18;
    if (blink) return <path key={side} d={`M${cx - 22} ${cy} Q${cx} ${cy + 6} ${cx + 22} ${cy}`} stroke={INK} strokeWidth={4.5} fill="none" strokeLinecap="round" />;
    return (
      <g key={side}>
        <path d={`M${cx - 24} ${cy + 18} Q${cx} ${cy + 40} ${cx + 26} ${cy + 16} Q${cx} ${cy + 26} ${cx - 24} ${cy + 18} Z`} fill="#8f86a8" opacity={0.5 + age * 0.12} />
        <path d={`M${cx - 22} ${cy + 26} Q${cx} ${cy + 38} ${cx + 24} ${cy + 24}`} stroke={INK} strokeWidth={2.6} fill="none" opacity={0.8} />
        {age >= 1 && <path d={`M${cx - 16} ${cy + 36} Q${cx} ${cy + 44} ${cx + 18} ${cy + 34}`} stroke={INK} strokeWidth={2} fill="none" opacity={0.5} />}
        <ellipse cx={cx} cy={cy + 4} rx={21} ry={e === "surprised" ? 13 : 10} fill="#fff" stroke={INK} strokeWidth={3.5} />
        <circle cx={cx + look[0] * 7} cy={cy + 5 + look[1] * 3} r={e === "surprised" ? 4 : 5.5} fill={INK} />
        {/* heavy droopy upper lid */}
        <path d={`M${cx - 26} ${cy + 2 - 6 * (1 - lid)} Q${cx} ${cy - 14 + 18 * lid} ${cx + 26} ${cy + 6 - 4 * (1 - lid)}`} stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />
        <path d={`M${cx - 26} ${cy - 8} Q${cx} ${cy - 16 + 16 * lid} ${cx + 26} ${cy - 4} L ${cx + 26} ${cy + 4 - 4 * (1 - lid)} Q${cx} ${cy - 12 + 18 * lid} ${cx - 26} ${cy + 2 - 6 * (1 - lid)} Z`} fill={fill} />
        <path d={`M${cx + side * 24} ${cy + 6} l ${side * 8} 6`} stroke={INK} strokeWidth={3} strokeLinecap="round" />
        {(e === "cry" || tears) && <path d={`M${cx - 4} ${cy + 22} C ${cx - 10} ${cy + 70} ${cx + 2} ${cy + 100} ${cx - 8} ${cy + 140 + Math.sin(f * 0.2) * 5}`} stroke="#5aa8e8" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.9} />}
      </g>
    );
  };
  const mouth = () => {
    const y = 104;
    switch (e) {
      case "smile": case "proud": return <path d={`M-30 ${y} Q0 ${y + 18} 30 ${y - 2}`} stroke={INK} strokeWidth={4.5} fill="none" strokeLinecap="round" />;
      case "grin": return <g><path d={`M-38 ${y - 4} Q0 ${y + 40} 38 ${y - 4} Z`} fill="#3a1d1d" stroke={INK} strokeWidth={4} /><path d={`M-32 ${y - 2} L32 ${y - 2} L28 ${y + 8} L-28 ${y + 8} Z`} fill="#fff" /></g>;
      case "sad": return <path d={`M-26 ${y + 10} Q0 ${y - 8} 26 ${y + 10}`} stroke={INK} strokeWidth={4.5} fill="none" strokeLinecap="round" />;
      case "cry": return <path d={`M-34 ${y + 6} q 8.5 -10 17 0 t 17 0 t 17 0 t 17 0`} stroke={INK} strokeWidth={4.5} fill="none" strokeLinecap="round" />;
      case "surprised": return <ellipse cx={0} cy={y + 6} rx={11} ry={15} fill="#3a1d1d" stroke={INK} strokeWidth={3.5} />;
      case "pained": case "angry": return <g><rect x={-34} y={y - 8} width={68} height={22} rx={6} fill="#fff" stroke={INK} strokeWidth={4} />{[-17, 0, 17].map((x) => <path key={x} d={`M${x} ${y - 8} v22`} stroke={INK} strokeWidth={2} />)}<path d={`M-34 ${y + 3} h68`} stroke={INK} strokeWidth={2} /></g>;
      case "determined": return <path d={`M-24 ${y + 2} L24 ${y}`} stroke={INK} strokeWidth={5} strokeLinecap="round" />;
      case "tired": return <path d={`M-20 ${y + 4} Q0 ${y} 20 ${y + 6}`} stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />;
      default: return <path d={`M-24 ${y + 2} Q0 ${y - 1} 24 ${y + 3}`} stroke={INK} strokeWidth={4.5} fill="none" strokeLinecap="round" />;
    }
  };
  return (
    <g>
      <path d="M-148 22 C -170 14 -176 66 -142 76" fill={fill} stroke={INK} strokeWidth={5} />
      <path d="M148 22 C 170 14 176 66 142 76" fill={fill} stroke={INK} strokeWidth={5} />
      <path d={`M0 -168 C 116 -168 154 -96 152 -6 C ${150 + 20 * chub} 64 ${122 + 40 * chub} ${118 + 14 * chub} ${70 + 30 * chub} ${150 + 12 * chub} C 40 ${168 + 16 * chub} -40 ${168 + 16 * chub} ${-70 - 30 * chub} ${150 + 12 * chub} C ${-122 - 40 * chub} ${118 + 14 * chub} ${-150 - 20 * chub} 64 -152 -6 C -154 -96 -116 -168 0 -168 Z`} fill={fill} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      {chub > 0.45 && <path d={`M-60 ${150 + 8 * chub} Q0 ${186 + 10 * chub} 60 ${150 + 8 * chub}`} stroke={INK} strokeWidth={3.5} fill="none" opacity={Math.min(1, (chub - 0.45) * 2.5)} />}
      <path d="M152 -6 C 150 64 122 118 70 150 C 104 112 126 60 128 -6 C 130 -76 112 -132 70 -158 C 124 -140 154 -84 152 -6 Z" fill="rgba(60,55,70,0.09)" />
      {[-62, -44, -26].map((y, k) => (age >= 1 || k === 0 || e === "sad" || e === "cry") && <path key={y} d={`M${-56 + k * 4} ${y - 30} Q0 ${y - 40 + (e === "sad" || e === "cry" ? -6 : 0)} ${56 - k * 4} ${y - 30}`} stroke={INK} strokeWidth={2.4} fill="none" opacity={k === 0 && age === 0 ? 0.35 : 0.55} />)}
      <g>{dots}</g>
      <path d={`M-74 ${-20 + br[1]} Q-50 ${-30 + br[0]} -24 ${-26 + br[0]}`} stroke={INK} strokeWidth={4.5} fill="none" strokeLinecap="round" />
      <path d={`M24 ${-26 + br[0]} Q50 ${-30 + br[0]} 74 ${-20 + br[1]}`} stroke={INK} strokeWidth={4.5} fill="none" strokeLinecap="round" />
      {eye(-1)}{eye(1)}
      <path d="M4 24 C 0 50 -12 66 -10 76 C -6 86 10 86 16 80" stroke={INK} strokeWidth={4.5} fill="none" strokeLinecap="round" />
      <path d="M-20 74 Q-26 80 -16 84" stroke={INK} strokeWidth={3} fill="none" />
      <path d="M-34 78 Q-52 96 -44 122" stroke={INK} strokeWidth={2.6} fill="none" opacity={0.6} />
      <path d="M34 78 Q52 96 44 122" stroke={INK} strokeWidth={2.6} fill="none" opacity={0.6} />
      {mouth()}
      {glasses && <g stroke={INK} strokeWidth={5} fill="rgba(255,255,255,0.1)"><rect x={-84} y={-4} width={66} height={44} rx={12} /><rect x={18} y={-4} width={66} height={44} rx={12} /><path d="M-18 14 Q0 8 18 14" fill="none" /></g>}
      {sweat && [0, 1].map((k) => <path key={k} d={`M${-118 + k * 230} ${-40 + ((f * 2 + k * 40) % 60)} q 9 16 0 24 q -9 -8 0 -24 z`} fill="#7cc4f2" stroke={INK} strokeWidth={2} />)}
      {hat === "beanie" && <g stroke={INK} strokeWidth={5}><path d="M-150 -40 C -150 -150 -80 -190 0 -190 C 80 -190 150 -150 150 -40 Z" fill={hatColor ?? "#3a3f4f"} /><rect x={-158} y={-62} width={316} height={46} rx={10} fill={hatColor ?? "#3a3f4f"} /></g>}
      {hat === "cap" && <g stroke={INK} strokeWidth={5}><path d="M-146 -56 C -146 -150 -76 -184 0 -184 C 76 -184 146 -150 146 -56 Z" fill={hatColor ?? "#c0392b"} /><path d="M-146 -60 C -40 -74 120 -70 230 -40 C 200 -22 120 -30 40 -38 C -40 -46 -100 -46 -146 -40 Z" fill={hatColor ?? "#c0392b"} /></g>}
    </g>
  );
};

type Look = { weight: number; muscle: number };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const Doomer: React.FC<P> = ({ o, f, ctx }) => {
  // pose: pose / poses[{at,to}] / cycle {a,b,period}
  let cur = o.pose ?? "stand", prev = cur, tch = -999;
  for (const q of (o.poses ?? []) as { at: any; to: string }[]) { const fr = ctx.T.at(ctx.i, q.at, 0); if (f >= fr) { prev = cur; cur = q.to; tch = fr; } }
  let pose: Pose;
  if (o.cycle && cur === "cycle") {
    const c = o.cycle; const per = (c.period ?? 1.2) * 30; const u = (1 - Math.cos((f / per) * Math.PI * 2)) / 2;
    pose = lerpPose(poseOf(c.a, f), poseOf(c.b, f), u);
  } else {
    const bl = interpolate(f - tch, [0, 9], [0, 1], { ...CL, easing: EASE });
    pose = bl >= 1 ? poseOf(cur, f) : lerpPose(poseOf(prev, f), poseOf(cur, f), bl);
  }
  let expr = o.expr ?? "neutral";
  for (const q of (o.exprs ?? []) as { at: any; to: string }[]) if (f >= ctx.T.at(ctx.i, q.at, 0)) expr = q.to;
  // build (can morph)
  const mq = o.morph ? interpolate(f - ctx.T.at(ctx.i, o.morph.at ?? 0, 0), [0, (o.morph.dur ?? 2) * 30], [0, 1], { ...CL, easing: EASE }) : 0;
  const L: Look = { weight: lerp(o.weight ?? 0.25, o.morph?.weight ?? o.weight ?? 0.25, mq), muscle: lerp(o.muscle ?? 0, o.morph?.muscle ?? o.muscle ?? 0, mq) };
  const w = L.weight, m = L.muscle;
  const SH = 150 + 50 * w + 105 * m, WA = 112 + 230 * w - 6 * m, AW = 34 + 18 * w + 26 * m, LW = 46 + 22 * w + 22 * m;
  const T = 300, UA = 165, FA = 150, TH = 190, SN = 190;
  const drop = pose.drop ?? 0;
  const hip = { x: 350, y: 1060 + drop * 1.4 };
  const sh = add(hip, { x: Math.sin(d2r(pose.torso)) * T, y: -Math.cos(d2r(pose.torso)) * T });
  const side = (s: number) => ({ x: Math.cos(d2r(pose.torso)) * s, y: Math.sin(d2r(pose.torso)) * s });
  const lS = add(sh, side(-SH / 2 + AW * 0.35)), rS = add(sh, side(SH / 2 - AW * 0.35));
  const lH = add(hip, side(-WA / 2 + LW * 0.45)), rH = add(hip, side(WA / 2 - LW * 0.45));
  const lE = add(lS, vec(pose.lArm[0], UA)), lW = add(lE, vec(pose.lArm[1], FA));
  const rE = add(rS, vec(pose.rArm[0], UA)), rW = add(rE, vec(pose.rArm[1], FA));
  const lK = add(lH, vec(pose.lLeg[0], TH)), lF = add(lK, vec(pose.lLeg[1], SN));
  const rK = add(rH, vec(pose.rLeg[0], TH)), rF = add(rK, vec(pose.rLeg[1], SN));
  const clothes = o.clothes ?? "hoodie", top = o.top ?? "#2e3440", pants = o.pants ?? "#3b4a63";
  const skinArms = clothes === "tee" || clothes === "tank" || clothes === "shirtless";
  const P = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const tube = (pts: { x: number; y: number }[], width: number, color: string, key: string) => (
    <g key={key}>
      <path d={P(pts)} stroke={INK} strokeWidth={width + 11} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={P(pts)} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
  const arm = (S: any, E: any, W: any, k: string) => {
    const up = AW * (1 + 0.32 * m), fo = AW * (0.98 + 0.08 * m);   // muscular: thick upper arm tapering to the forearm
    const col = skinArms ? SKIN : top;
    const sleeve = clothes === "tee" ? { x: S.x + (E.x - S.x) * 0.55, y: S.y + (E.y - S.y) * 0.55 } : null;
    return (
      <g key={k}>
        <path d={P([S, E])} stroke={INK} strokeWidth={up + 11} strokeLinecap="round" />
        <path d={P([E, W])} stroke={INK} strokeWidth={fo + 11} strokeLinecap="round" />
        <path d={P([S, E])} stroke={col} strokeWidth={up} strokeLinecap="round" />
        <path d={P([E, W])} stroke={col} strokeWidth={fo} strokeLinecap="round" />
        {sleeve && tube([S, sleeve], up + 8, top, k + "s")}
        <circle cx={W.x} cy={W.y} r={fo * 0.6 + 4} fill={SKIN} stroke={INK} strokeWidth={5} />
      </g>
    );
  };
  const leg = (H: any, K: any, F: any, k: string) => (
    <g key={k}>
      {tube([H, K, F], LW, o.shorts ? SKIN : pants, k + "l")}
      {o.shorts && tube([H, { x: H.x + (K.x - H.x) * 0.75, y: H.y + (K.y - H.y) * 0.75 }], LW + 10, pants, k + "sh")}
      <ellipse cx={F.x + 14} cy={F.y + 6} rx={LW * 0.8 + 8} ry={18} fill={o.shoes ?? "#1d1f26"} stroke={INK} strokeWidth={5} />
    </g>
  );
  // torso polygon in torso space
  const tp = (x: number, y: number) => ({ x: hip.x + Math.cos(d2r(pose.torso)) * x - Math.sin(d2r(pose.torso)) * y * -1 * 0 + Math.sin(d2r(pose.torso)) * -y, y: hip.y + Math.sin(d2r(pose.torso)) * x + Math.cos(d2r(pose.torso)) * y });
  const belly = w;
  const torsoD = (() => {
    const a = tp(-SH / 2, -T + 14), b = tp(-SH / 2 - 6 * w, -T + 120), c = tp(-WA / 2 - 70 * belly, -90), d = tp(-WA / 2, 16), e = tp(WA / 2, 16), g = tp(WA / 2 + 70 * belly, -90), h = tp(SH / 2 + 6 * w, -T + 120), i = tp(SH / 2, -T + 14), top_ = tp(0, -T - 4);
    return `M${a.x} ${a.y} C ${b.x} ${b.y} ${c.x} ${c.y} ${d.x} ${d.y} L ${e.x} ${e.y} C ${g.x} ${g.y} ${h.x} ${h.y} ${i.x} ${i.y} Q ${top_.x} ${top_.y} ${a.x} ${a.y} Z`;
  })();
  const torsoFill = clothes === "shirtless" ? SKIN : top;
  const neckTop = tp(0, -T - 60), neckBot = tp(0, -T + 10);
  const headC = tp(0, -T - 50 - 150);
  const det: React.ReactNode[] = [];
  if (clothes === "shirtless") {
    if (m > 0.2) { // pecs + abs
      const k = m;
      det.push(<path key="pl" d={`M${tp(-SH * 0.36, -T + 60).x} ${tp(-SH * 0.36, -T + 60).y} Q ${tp(-SH * 0.2, -T + 130 + 20 * k).x} ${tp(-SH * 0.2, -T + 130 + 20 * k).y} ${tp(0, -T + 110).x} ${tp(0, -T + 110).y}`} stroke={INK} strokeWidth={3 + 2 * k} fill="none" opacity={k} />);
      det.push(<path key="pr" d={`M${tp(SH * 0.36, -T + 60).x} ${tp(SH * 0.36, -T + 60).y} Q ${tp(SH * 0.2, -T + 130 + 20 * k).x} ${tp(SH * 0.2, -T + 130 + 20 * k).y} ${tp(0, -T + 110).x} ${tp(0, -T + 110).y}`} stroke={INK} strokeWidth={3 + 2 * k} fill="none" opacity={k} />);
      if (m > 0.55) for (let r = 0; r < 3; r++) for (const s of [-1, 1]) { const p0 = tp(s * 6, -T + 150 + r * 46), p1 = tp(s * 34, -T + 150 + r * 46 + 4); det.push(<path key={`ab${r}${s}`} d={`M${p0.x} ${p0.y} L ${p1.x} ${p1.y}`} stroke={INK} strokeWidth={3} opacity={(m - 0.55) * 2.2} />); }
      if (m > 0.55) { const a0 = tp(0, -T + 120), a1 = tp(0, -T + 270); det.push(<path key="ln" d={`M${a0.x} ${a0.y} L ${a1.x} ${a1.y}`} stroke={INK} strokeWidth={3} opacity={(m - 0.55) * 2.2} />); }
    } else if (w > 0.5) { // soft chest
      for (const s of [-1, 1]) { const p0 = tp(s * SH * 0.4, -T + 90), p1 = tp(s * SH * 0.18, -T + 140), p2 = tp(s * 4, -T + 112); det.push(<path key={`ch${s}`} d={`M${p0.x} ${p0.y} Q ${p1.x} ${p1.y} ${p2.x} ${p2.y}`} stroke={INK} strokeWidth={3} fill="none" opacity={0.7} />); }
    }
    for (const s of [-1, 1]) { const n_ = tp(s * SH * 0.22, -T + 112 + 10 * w); det.push(<circle key={`n${s}`} cx={n_.x} cy={n_.y} r={4} fill={INK} opacity={0.75} />); }
    if (w > 0.35) { const b0 = tp(-WA * 0.42, -60), b1 = tp(0, -12 + 20 * w), b2 = tp(WA * 0.42, -60), nv = tp(0, -84); det.push(<path key="bl" d={`M${b0.x} ${b0.y} Q ${b1.x} ${b1.y} ${b2.x} ${b2.y}`} stroke={INK} strokeWidth={3} fill="none" opacity={Math.min(1, (w - 0.35) * 2.5)} />); det.push(<ellipse key="nv" cx={nv.x} cy={nv.y} rx={5} ry={8} fill={INK} opacity={0.7} />); }
  } else {
    if (clothes === "hoodie") { const p0 = tp(-WA * 0.36, -120), p1 = tp(WA * 0.36, -120), p2 = tp(WA * 0.42, -30), p3 = tp(-WA * 0.42, -30); det.push(<path key="pk" d={`M${p0.x} ${p0.y} L ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} Z`} fill="rgba(0,0,0,0.12)" stroke={INK} strokeWidth={3.5} />); for (const s of [-1, 1]) { const q0 = tp(s * 20, -T + 20), q1 = tp(s * 26, -T + 110); det.push(<path key={`st${s}`} d={`M${q0.x} ${q0.y} L ${q1.x} ${q1.y}`} stroke="#ddd" strokeWidth={4} />); } }
    if (w > 0.4) for (let r = 0; r < 2; r++) { const p0 = tp(-WA * 0.3, -150 + r * 40), p1 = tp(0, -140 + r * 40 + 10), p2 = tp(WA * 0.3, -150 + r * 40); det.push(<path key={`fold${r}`} d={`M${p0.x} ${p0.y} Q ${p1.x} ${p1.y} ${p2.x} ${p2.y}`} stroke={INK} strokeWidth={2.5} fill="none" opacity={(w - 0.4) * 1.6} />); }
    const s0 = tp(-SH * 0.42, -T + 30), s1 = tp(-SH * 0.3, -T + 120); det.push(<path key="shade" d={`M${s0.x} ${s0.y} Q ${s1.x} ${s1.y} ${s0.x + 6} ${s0.y + 160}`} stroke="rgba(0,0,0,0.15)" strokeWidth={18} fill="none" />);
  }
  const prop = o.prop;
  const propEl = prop === "dumbbell" ? (
    <g transform={`translate(${rW.x} ${rW.y}) rotate(${pose.rArm[1] > 90 ? 0 : 0})`}>
      <rect x={-46} y={-7} width={92} height={14} rx={5} fill="#9aa0aa" stroke={INK} strokeWidth={4} />
      {[-1, 1].map((s) => <rect key={s} x={s * 46 - 14} y={-30} width={28} height={60} rx={6} fill="#30343c" stroke={INK} strokeWidth={4} />)}
    </g>
  ) : prop === "phone" ? <rect x={rW.x - 22} y={rW.y - 62} width={44} height={78} rx={8} fill="#111" stroke={INK} strokeWidth={4} /> : prop === "card" ? <rect x={rW.x - 40} y={rW.y - 52} width={86} height={56} rx={8} fill="#e8913d" stroke={INK} strokeWidth={4} /> : null;
  const breathe = Math.sin(f * 0.08 + (o.seed ?? 0)) * 2;
  return (
    <svg width={700} height={1500} viewBox="0 0 700 1500" style={{ overflow: "visible" }}>
      <g transform={`translate(0 ${breathe})`}>
        {clothes === "hoodie" && <path d={`M${tp(-90, -T - 10).x} ${tp(-90, -T - 10).y} Q ${tp(0, -T - 90).x} ${tp(0, -T - 90).y} ${tp(90, -T - 10).x} ${tp(90, -T - 10).y} Z`} fill={top} stroke={INK} strokeWidth={5} />}
        {leg(lH, lK, lF, "ll")}{leg(rH, rK, rF, "rl")}
        {arm(lS, lE, lW, "la")}
        <path d={torsoD} fill={torsoFill} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
        {det}
        {!o.shorts && clothes !== "shirtless" && null}
        {(() => { const a_ = tp(-WA / 2 + 4, 0), b_ = tp(WA / 2 - 4, 0); return <path d={`M${a_.x} ${a_.y} L ${b_.x} ${b_.y}`} stroke={INK} strokeWidth={4} opacity={0.6} />; })()}
        <path d={`M${neckBot.x} ${neckBot.y} L ${neckTop.x} ${neckTop.y}`} stroke={INK} strokeWidth={50 + 10 * w + 18 * m} strokeLinecap="round" />
        <path d={`M${neckBot.x} ${neckBot.y} L ${neckTop.x} ${neckTop.y}`} stroke={SKIN} strokeWidth={40 + 10 * w + 18 * m} strokeLinecap="round" />
        {clothes !== "shirtless" && <path d={torsoD} fill="none" stroke="none" />}
        {clothes !== "shirtless" && (() => { const c0 = tp(-46, -T + 6), c1 = tp(0, -T + 40), c2 = tp(46, -T + 6); return <path d={`M${c0.x} ${c0.y} Q ${c1.x} ${c1.y} ${c2.x} ${c2.y}`} fill={torsoFill} stroke={INK} strokeWidth={5} />; })()}
        {arm(rS, rE, rW, "ra")}
        {propEl}
        <g transform={`translate(${headC.x} ${headC.y}) rotate(${pose.torso * 0.5 + (o.tilt ?? 0)}) scale(${o.headScale ?? 1})`}>
          <DoomerHead chub={w} expr={expr} age={o.age ?? 1} look={o.look} f={f} seed={o.seed ?? 0} hat={o.hat} hatColor={o.hatColor} glasses={o.glasses} sweat={o.sweat} tears={o.tears} />
        </g>
      </g>
    </svg>
  );
};
