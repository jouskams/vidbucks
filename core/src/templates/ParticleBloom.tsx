// TEMPLATE "ParticleBloom": a word (any text) made of ~40k 3D particles dissolves into a bundle of ropes with glowing tips, which curls into a
// glowing rope bloom, then returns. Pure canvas (no WebGL), deterministic. Typical reference: a 6-10 s loop with a "3D scroll-site" look.
// A photoreal subject (a real head, a room) cannot be matched with this - use it for logos/words/abstract shapes.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";
import { loadFont as loadSans } from "@remotion/google-fonts/InterTight";
import { AudioCfg, AudioLayer, GrainVignette, lerp, sstep } from "./kit";

const { fontFamily: SANS } = loadSans("normal", { weights: ["800"], subsets: ["latin", "latin-ext"] });
type V3 = [number, number, number];
type RGB = [number, number, number];

export type ParticleBloomConfig = {
  width: number; height: number; fps: number; durationSec: number;
  text: string;                                   // the word that is built from particles (2-6 letters look best)
  palette: { bg: string; ink: RGB; highlight: RGB; rope: RGB; glow: RGB };   // particle shadow, particle highlight, rope colour, glow colour
  // seconds: hold, dissolve into ropes, curl into the bloom, hold, then the reverse (so the clip loops)
  t: { dissolve: [number, number]; bloom: [number, number]; back1: [number, number]; back2: [number, number] };
  audio?: AudioCfg;
  caption?: { text: string; at: number; color: string };    // optional small line, e.g. a tagline
};

const N = 40000, K = 380, M = 17;
type Geo = { head: Float32Array; nrm: Float32Array; pos1: Float32Array; pos2: Float32Array; delay: Float32Array; delay2: Float32Array; turb: Float32Array; B1: Float32Array; B2: Float32Array; kdel: Float32Array; kw: Float32Array };
const mul = (a: number) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

function buildGeo(text: string): Geo {
  const r = mul(7);
  // 1) rasterise the word and keep the opaque pixels
  const cw = 1400, ch = 520, c = document.createElement("canvas"); c.width = cw; c.height = ch; const g = c.getContext("2d")!;
  let size = 360; g.font = `800 ${size}px ${SANS}, sans-serif`; while (g.measureText(text).width > cw * 0.9 && size > 40) { size -= 10; g.font = `800 ${size}px ${SANS}, sans-serif`; }
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff"; g.fillText(text, cw / 2, ch / 2);
  const d = g.getImageData(0, 0, cw, ch).data; const px: number[] = []; let x0 = cw, x1 = 0, y0 = ch, y1 = 0;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (d[(y * cw + x) * 4 + 3] > 128) { px.push(x, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < cw && y < ch && d[(Math.round(y) * cw + Math.round(x)) * 4 + 3] > 128;
  const scale = 3.0 / Math.max(1, x1 - x0), midx = (x0 + x1) / 2, midy = (y0 + y1) / 2;
  const head = new Float32Array(N * 3), nrm = new Float32Array(N * 3), pos1 = new Float32Array(N * 3), pos2 = new Float32Array(N * 3);
  const delay = new Float32Array(N), delay2 = new Float32Array(N), turb = new Float32Array(N * 3);
  const B1 = new Float32Array(K * M * 3), B2 = new Float32Array(K * M * 3), kdel = new Float32Array(K), kw = new Float32Array(K);
  const alpha = new Float32Array(K), RR = new Float32Array(K), R0 = new Float32Array(K), lay = new Float32Array(K), th = new Float32Array(K), wph = new Float32Array(K);
  const bez = (s: number): [V3, V3] => { const P0: V3 = [0.7, 0.45, -0.5], P1: V3 = [-0.1, 1.0, 0.4], P2: V3 = [-1.1, 0.5, 1.0], P3: V3 = [-2.1, -0.85, 0.6]; const u = 1 - s; const cc: V3 = [0, 0, 0], dd: V3 = [0, 0, 0];
    for (let i = 0; i < 3; i++) { cc[i] = u * u * u * P0[i] + 3 * u * u * s * P1[i] + 3 * u * s * s * P2[i] + s * s * s * P3[i]; dd[i] = 3 * u * u * (P1[i] - P0[i]) + 6 * u * s * (P2[i] - P1[i]) + 3 * s * s * (P3[i] - P2[i]); } return [cc, dd]; };
  const bundle = (k: number, s: number): V3 => { const [cc, dd] = bez(s); const T = norm(dd); const up: V3 = Math.abs(T[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0]; const N1 = norm(cross(T, up)), N2 = cross(T, N1);
    const rho = 0.05 + 0.5 * Math.pow(s, 1.25) * (0.55 + 0.45 * ((k * 0.618) % 1)); const w = 0.04 * Math.sin(s * 13 + wph[k]) * (0.3 + s); const ca = Math.cos(alpha[k] + s * 0.8), sa = Math.sin(alpha[k] + s * 0.8);
    return [cc[0] + rho * (ca * N1[0] + sa * N2[0]) + w * N1[0], cc[1] + rho * (ca * N1[1] + sa * N2[1]) + w * N1[1], cc[2] + rho * (ca * N1[2] + sa * N2[2]) + w * N1[2]]; };
  const bloom = (k: number, s: number): V3 => { const rr = RR[k] * (1 - s) + R0[k] * s; const wig = 0.055 * Math.sin(s * 15 + wph[k]) * (0.4 + (1 - s)); const t = th[k]; const z = -0.62 * Math.pow(s, 1.4) + 0.2 * Math.sin(Math.PI * s) * lay[k];
    return [rr * Math.cos(t) - wig * Math.sin(t), rr * Math.sin(t) + wig * Math.cos(t), z]; };
  for (let k = 0; k < K; k++) { alpha[k] = r() * 6.28; RR[k] = 1.22 + r() * 0.3; R0[k] = 0.15 + r() * 0.07; lay[k] = r() * 2 - 1; th[k] = (k / K) * 6.2832 + (r() - 0.5) * 0.02; wph[k] = r() * 6.28; kdel[k] = r() * 0.5; kw[k] = 0.8 + r() * 0.5;
    for (let m = 0; m < M; m++) { const s = m / (M - 1); B1.set(bundle(k, s), (k * M + m) * 3); B2.set(bloom(k, s), (k * M + m) * 3); } }
  // 2) extruded word: points on the faces and sides
  for (let i = 0; i < N; i++) {
    const j = Math.floor(r() * (px.length / 2)) * 2; const x = px[j] + r() - 0.5, y = px[j + 1] + r() - 0.5; const e = 4;
    const gx = (inside(x + e, y) ? 1 : 0) - (inside(x - e, y) ? 1 : 0), gy = (inside(x, y + e) ? 1 : 0) - (inside(x, y - e) ? 1 : 0); const edge = Math.min(1, Math.hypot(gx, gy)); const side = r() < 0.5 ? 1 : -1; const zf = 0.17 * (r() < 0.7 ? 1 : r() * 2 - 1) * side; const nl = Math.hypot(gx, gy) || 1;
    const nv = norm([-gx / nl * edge * 0.9, gy / nl * edge * 0.9, side * (1 - edge * 0.85)]);
    const wx = (x - midx) * scale, wy = -(y - midy) * scale; head.set([wx, wy, zf * 1.1], i * 3); nrm.set(nv, i * 3);
    delay[i] = Math.min(1, Math.max(0, wx / 3 + 0.5)) * 0.5 + r() * 0.25; delay2[i] = r() * 0.45; turb.set([(r() - 0.5) * 1.6, (r() - 0.5) * 1.6, (r() - 0.5) * 1.6], i * 3);
    const k = Math.floor(r() * K) | 0, s = Math.pow(r(), 0.85); pos1.set(bundle(k, s), i * 3); pos2.set(bloom(k, s), i * 3);
  }
  return { head, nrm, pos1, pos2, delay, delay2, turb, B1, B2, kdel, kw };
}

const rgbStr = (c: RGB, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const makeGlow = (c: RGB) => { const cv = document.createElement("canvas"); cv.width = cv.height = 128; const g = cv.getContext("2d")!; const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,252,235,1)"); gr.addColorStop(0.18, rgbStr([Math.min(255, c[0] + 20), Math.min(255, c[1] + 70), Math.min(255, c[2] + 40)], 0.95)); gr.addColorStop(0.45, rgbStr(c, 0.5)); gr.addColorStop(1, rgbStr(c, 0)); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return cv; };

export const ParticleBloom: React.FC<{ cfg: ParticleBloomConfig }> = ({ cfg }) => {
  const f = useCurrentFrame(); const { width: W, height: H, fps, palette: PAL } = cfg; const cv = useRef<HTMLCanvasElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null); const [glow, setGlow] = useState<HTMLCanvasElement | null>(null);
  const [handle] = useState(() => delayRender("particle geometry"));
  useEffect(() => { (async () => { try { await document.fonts.load(`800 120px ${SANS}`); } catch { /* fallback font */ } setGeo(buildGeo(cfg.text)); setGlow(makeGlow(PAL.glow)); continueRender(handle); })(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const t = f / fps; const T = cfg.t;
  const P = Math.max(0, Math.min(2, sstep(T.dissolve[0], T.dissolve[1], t) + sstep(T.bloom[0], T.bloom[1], t) - sstep(T.back1[0], T.back1[1], t) - sstep(T.back2[0], T.back2[1], t)));
  const S0 = 0.185 * Math.min(W, H) * (W > H ? 1.1 : 1);

  useLayoutEffect(() => {
    const canvas = cv.current; if (!canvas || !geo) return; const ctx = canvas.getContext("2d")!; ctx.clearRect(0, 0, W, H);
    const keyI = (a: number, b: number, c: number) => (P < 1 ? lerp(a, b, sstep(0, 1, P)) : lerp(b, c, sstep(0, 1, P - 1)));
    const yaw = keyI(0.32 * Math.sin(t * 1.3), -1.0, 0.05) + 0.07 * Math.sin(t * 1.6), pit = keyI(0.04, 0.2, -0.5), roll = (P > 1 ? P - 1 : 0) * 0.5 * Math.sin(t * 0.5);
    const cy_ = Math.cos(yaw), sy_ = Math.sin(yaw), cp_ = Math.cos(pit), sp_ = Math.sin(pit), cr_ = Math.cos(roll), sr_ = Math.sin(roll); const cx = W * 0.5, cyy = H * 0.5;
    const proj = (x: number, y: number, z: number): [number, number, number, number] => { const x0 = x * cr_ - y * sr_, y0 = x * sr_ + y * cr_; const x1 = x0 * cy_ + z * sy_, z1 = -x0 * sy_ + z * cy_; const y2 = y0 * cp_ - z1 * sp_, z2 = y0 * sp_ + z1 * cp_; const s = 6 / (6 - z2); return [cx + x1 * S0 * s, cyy - y2 * S0 * s, z2, s]; };
    const rotN = (x: number, y: number, z: number): V3 => { const x0 = x * cr_ - y * sr_, y0 = x * sr_ + y * cr_; const x1 = x0 * cy_ + z * sy_, z1 = -x0 * sy_ + z * cy_; return [x1, y0 * cp_ - z1 * sp_, y0 * sp_ + z1 * cp_]; };
    const img = ctx.createImageData(W, H); const buf = new Uint32Array(img.data.buffer); const partVis = 1 - sstep(1.05, 1.5, P); const gA = sstep(0, 1, Math.min(1, P)), gB = sstep(0, 1, Math.max(0, P - 1));
    const L: V3 = [-0.75, 0.5, 0.55]; const ll = Math.hypot(...L);
    if (partVis > 0.01) {
      for (let i = 0; i < N; i++) {
        if (partVis < 1 && ((i * 2654435761) >>> 0) / 4294967296 > partVis) continue;
        const q1 = sstep(0, 1, (gA - geo.delay[i] * 0.6) / 0.45), q2 = sstep(0, 1, (gB - geo.delay2[i] * 0.6) / 0.5); const i3 = i * 3;
        let x = lerp(geo.head[i3], geo.pos1[i3], q1), y = lerp(geo.head[i3 + 1], geo.pos1[i3 + 1], q1), z = lerp(geo.head[i3 + 2], geo.pos1[i3 + 2], q1);
        x = lerp(x, geo.pos2[i3], q2); y = lerp(y, geo.pos2[i3 + 1], q2); z = lerp(z, geo.pos2[i3 + 2], q2);
        const tb = Math.sin(Math.PI * q1) * 0.9 + Math.sin(Math.PI * q2) * 0.7; x += geo.turb[i3] * tb + Math.sin(t * 3 + i * 0.37) * 0.03 * tb; y += geo.turb[i3 + 1] * tb; z += geo.turb[i3 + 2] * tb;
        const nv = rotN(geo.nrm[i3], geo.nrm[i3 + 1], geo.nrm[i3 + 2]); const br = 0.16 + 0.95 * Math.max(0, (nv[0] * L[0] + nv[1] * L[1] + nv[2] * L[2]) / ll); const hl = Math.min(1, Math.max(0, (br - 0.4) * 1.7)); const m = sstep(0, 0.8, q1); const cm = lerp(1, br, m);
        const cr = lerp(lerp(PAL.ink[0], PAL.highlight[0], hl), PAL.rope[0], m) * cm, cg = lerp(lerp(PAL.ink[1], PAL.highlight[1], hl), PAL.rope[1], m) * cm, cb = lerp(lerp(PAL.ink[2], PAL.highlight[2], hl), PAL.rope[2], m) * cm;
        const [X, Y, , s] = proj(x, y, z); const sz = Math.max(2, Math.round(2.5 * s * (W / 1080) * (0.8 + 0.2 * (1 - q1)))); const px = Math.round(X - sz / 2), py = Math.round(Y - sz / 2);
        if (px < 0 || py < 0 || px + sz >= W || py + sz >= H) continue; const col = (255 << 24) | (Math.min(255, cb) << 16) | (Math.min(255, cg) << 8) | Math.min(255, cr);
        for (let yy = 0; yy < sz; yy++) { const row = (py + yy) * W + px; for (let xx = 0; xx < sz; xx++) buf[row + xx] = col; }
      }
      ctx.putImageData(img, 0, 0);
    }
    const wRope = sstep(0.5, 1.0, P);
    if (wRope > 0.01) {
      const order: { k: number; z: number }[] = []; const pts = new Float32Array(K * M * 3);
      for (let k = 0; k < K; k++) { const e = sstep(0, 1, (gB - geo.kdel[k] * 0.5) / 0.55);
        for (let m = 0; m < M; m++) { const j = (k * M + m) * 3; const sw = Math.sin(Math.PI * e) * 0.3 * Math.sin(m * 0.5 + k); pts[j] = lerp(geo.B1[j], geo.B2[j], e) + sw; pts[j + 1] = lerp(geo.B1[j + 1], geo.B2[j + 1], e) + sw * 0.6; pts[j + 2] = lerp(geo.B1[j + 2], geo.B2[j + 2], e); }
        const mid = (k * M + (M >> 1)) * 3; order.push({ k, z: proj(pts[mid], pts[mid + 1], pts[mid + 2])[2] }); }
      order.sort((a, b) => a.z - b.z); ctx.lineCap = "round"; ctx.lineJoin = "round"; const grow = sstep(0.55, 1.0, P);
      for (const { k } of order) { const lim = Math.max(2, Math.round(M * Math.min(1, grow * 1.25 + 0.05)));
        for (let a = 0; a < lim - 1; a += 6) { const b2 = Math.min(a + 6, lim - 1); const sMid = ((a + b2) / 2) / (M - 1); const mj = (k * M + Math.min(M - 1, Math.round((a + b2) / 2))) * 3; const [, , zz, ss] = proj(pts[mj], pts[mj + 1], pts[mj + 2]);
          const depth = Math.max(0.55, Math.min(1.05, 0.85 + zz * 0.22)); const warm = Math.pow(sMid, 3.2) * (0.35 + 0.65 * gB) * 0.9;
          const cr = lerp(PAL.rope[0], PAL.glow[0], warm) * depth, cg = lerp(PAL.rope[1], PAL.glow[1], warm) * depth, cb = lerp(PAL.rope[2], PAL.glow[2], warm) * depth;
          ctx.beginPath(); for (let m = a; m <= b2; m++) { const [X, Y] = proj(pts[(k * M + m) * 3], pts[(k * M + m) * 3 + 1], pts[(k * M + m) * 3 + 2]); if (m === a) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); }
          const w = (5.4 + 5.2 * (1 - sMid)) * ss * geo.kw[k] * (0.55 + 0.45 * wRope) * (W / 1080); ctx.strokeStyle = `rgba(120,108,100,${0.55 * wRope})`; ctx.lineWidth = w + 2.4; ctx.stroke(); ctx.strokeStyle = `rgba(${cr | 0},${cg | 0},${cb | 0},${wRope})`; ctx.lineWidth = w; ctx.stroke(); } }
      if (glow) { const ga = ctx.globalAlpha; const tipA = sstep(0.75, 1.0, P) * (1 - gB * 0.7);
        if (tipA > 0.02) for (let k = 0; k < K; k += 3) { const j = (k * M + M - 1) * 3; const [X, Y, , s] = proj(pts[j], pts[j + 1], pts[j + 2]); const rr = 15 * s * (W / 1080) * (0.8 + 0.4 * Math.sin(t * 5 + k)); ctx.globalAlpha = tipA; ctx.drawImage(glow, X - rr, Y - rr, rr * 2, rr * 2); }
        if (gB > 0.05) { const [X, Y, , s] = proj(0, 0, -0.55); const pulse = 1 + 0.08 * Math.sin(t * 4); const rr = (70 + 130 * gB) * s * pulse * (W / 1080); ctx.globalAlpha = Math.min(1, gB * 1.3); ctx.drawImage(glow, X - rr, Y - rr, rr * 2, rr * 2); const r2 = 70 * s * gB * pulse * (W / 1080); ctx.globalAlpha = Math.min(1, gB * 1.4); ctx.drawImage(glow, X - r2, Y - r2, r2 * 2, r2 * 2); }
        ctx.globalAlpha = ga; }
    }
  });
  const cap = cfg.caption;
  return (
    <AbsoluteFill style={{ background: cfg.palette.bg }}>
      <AudioLayer cfg={cfg.audio} fps={fps} duration={Math.round(cfg.durationSec * fps)} />
      <canvas ref={cv} width={W} height={H} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />
      {cap && t >= cap.at && <div style={{ position: "absolute", left: 0, right: 0, bottom: H * 0.12, textAlign: "center", fontFamily: SANS, fontWeight: 800, fontSize: 48 * (Math.min(W, H) / 1080), color: cap.color, opacity: sstep(cap.at, cap.at + 0.5, t) }}>{cap.text}</div>}
      <GrainVignette frame={f} w={W} h={H} grain={0.06} vignette={0.18} />
    </AbsoluteFill>
  );
};
