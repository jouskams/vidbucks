// Demo configurations with neutral placeholder content. COPY one, change the content (texts, times, images, colours, audio), register it in Root.tsx.
import type { IconStoryConfig } from "./IconStory";
import type { ObjectStoryConfig } from "./ObjectStory";
import type { KineticConfig } from "./KineticType";
import type { ParticleBloomConfig } from "./ParticleBloom";

export const iconStoryDemo: IconStoryConfig = {
  width: 1080, height: 1920, fps: 30, durationSec: 9,
  theme: { bg: "#000000", fg: "#FFFFFF", dim: "rgba(255,255,255,0.55)", accent: "#FFD400" },
  captionY: 0.61, iconY: 0.37, leadIn: 0.5,
  tag: { title: "YOUR BRAND", sub: "Studio line" },
  phrases: [
    { words: [["What", 0.0, 0.3], ["is", 0.3, 0.45], ["worth", 0.45, 0.8], ["more?", 0.8, 1.4]], end: 1.45 },
    { words: [["A", 1.72, 1.78], ["won", 1.78, 2.08], ["deal.", 2.08, 2.7]], end: 2.62 },
    { words: [["A", 2.88, 2.98], ["team", 2.98, 3.22], ["in", 3.22, 3.42], ["sync.", 3.42, 4.0]], end: 3.85 },
    { words: [["And", 4.1, 4.24], ["a", 4.24, 4.34], ["system", 4.34, 4.74], ["that", 4.74, 4.98], ["runs", 4.98, 5.24], ["itself.", 5.24, 6.0]], end: 8.1 },
  ],
  icons: [
    { type: "ballCoins", from: 0.2, coinsAt: 1.0, hopAt: 1.95, to: 3.9 },
    { type: "pendulum", from: 3.35, sync: 4.35, to: 6.2 },
    { type: "sphere", from: 5.4 },
  ],
  lockup: { text: "brand", sub: "STUDIO", at: 7.0 },
};

export const objectStoryDemo: ObjectStoryConfig = {
  width: 1080, height: 1920, fps: 30, durationSec: 14,
  paper: { center: "#dedcd8", mid: "#bdbbb7", edge: "#8f8d8a", ink: "#0b0b0b", small: "#6c6c6c" },
  stage: { bg: "#0a0a0a", glow: "#181817", fg: "#f1f1ef" },
  images: {
    portrait: "templates/portrait.png",
    objectA: { src: "templates/object-a.png", w: 780, h: 537 },
    objectB: { src: "templates/object-b.png", w: 620, h: 538 },
    stageObject: { src: "templates/stage-object.png", w: 780, h: 537 },
  },
  t: { frameIn: 0.25, split: 2.85, eyeIn: 5.0, cut: 7.85, lockupAt: 12.0 },
  captions: [
    { small: [["it", 3.1], ["runs", 3.22], ["on", 3.54], ["its", 3.8]], big: "mind", bigAt: 3.96, end: 4.95, on: "paper", x: 100, y: 0.29 },
    { small: [["it", 4.98], ["sees", 5.08], ["every", 5.36]], big: "detail", bigAt: 5.78, end: 7.8, on: "paper", x: 100, y: 0.245 },
    { small: [["not", 8.34], ["only", 8.7], ["the", 9.02]], big: "plan", bigAt: 9.16, end: 9.95, on: "stage", y: 0.29 },
    { small: [["but", 9.9], ["the", 9.94], ["whole", 10.1]], big: "field", bigAt: 10.3, end: 12.0, on: "stage", y: 0.22 },
  ],
  stageGrid: true,
  lockup: { text: "brand", sub: "STUDIO", accent: "#FFD400" },
};

export const kineticDemo: KineticConfig = {
  width: 1080, height: 1920, fps: 30, bpm: 128, endBeat: 36,
  palette: { dark: "#0A0A0A", light: "#F2F2EE", accent: "#4F7CFF" },
  hud: "YOUR BRAND",
  events: [
    { at: 0, kind: "word", text: "MAKING", bg: "dark", fx: "slam" },
    { at: 1, kind: "word", text: "A", bg: "dark", fx: "whip" },
    { at: 2, kind: "word", text: "VIDEO", bg: "light", fx: "stretch" },
    { at: 4, kind: "word", text: "IS", bg: "dark", fx: "slam" },
    { at: 5, kind: "word", text: "CHAOS.", bg: "accent", fx: "stretch" },
    { at: 7, kind: "glitch" },
    { at: 8, kind: "word", text: "UNLESS", bg: "dark", fx: "type" },
    { at: 9, kind: "word", text: "YOU", bg: "light", fx: "zoom" },
    { at: 10, kind: "orb" },
    { at: 11, kind: "logo", text: "brand", sub: "STUDIO" },
    { at: 15, kind: "word", text: "ONE", bg: "dark", fx: "slam" },
    { at: 16, kind: "word", text: "PLACE.", bg: "accent", fx: "stretch" },
    { at: 18, kind: "card", title: "IDEAS", sub: "captured." },
    { at: 23, kind: "card", title: "FILES", sub: "in order." },
    { at: 28, kind: "word", text: "READY", bg: "dark", fx: "slam" },
    { at: 29, kind: "word", text: "TO", bg: "light", fx: "whip" },
    { at: 30, kind: "word", text: "SHIP.", bg: "accent", fx: "zoom" },
    { at: 32, kind: "logo", text: "brand", sub: "STUDIO", tagline: "Make it simple." },
  ],
};

export const particleDemo: ParticleBloomConfig = {
  width: 1080, height: 1920, fps: 30, durationSec: 8, text: "brand",
  palette: { bg: "#D9DEE3", ink: [26, 26, 30], highlight: [90, 140, 255], rope: [239, 233, 226], glow: [255, 140, 50] },
  t: { dissolve: [1.0, 2.4], bloom: [2.4, 3.6], back1: [5.0, 6.1], back2: [6.1, 7.2] },
};
