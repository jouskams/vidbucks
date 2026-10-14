import type React from "react";
import { createContext } from "react";
import { Easing, interpolate } from "remotion";
import { loadFont as loadMarker } from "@remotion/google-fonts/PermanentMarker";
import { loadFont as loadHand } from "@remotion/google-fonts/PatrickHand";
import { loadFont as loadBrush } from "@remotion/google-fonts/CaveatBrush";

const { fontFamily: PERMANENT_MARKER } = loadMarker();
const { fontFamily: CAVEAT_BRUSH } = loadBrush("normal", { subsets: ["latin", "latin-ext"] });
/** The marker font is a CSS variable so a video can switch it (video.json "marker": "brush" for Turkish/latin-ext text). */
export const MARKER = "var(--mk)";
export const markerVar = (name?: string): React.CSSProperties => ({ ["--mk" as any]: name === "brush" ? CAVEAT_BRUSH : PERMANENT_MARKER });
export const { fontFamily: HAND } = loadHand();

export const FPS = 30;
export const PAL = {
  paper: "#f6f1e4",
  paper2: "#efe8d4",
  ink: "#1d1d22",
  blue: "#2b6cff",
  orange: "#ff7a1a",
  green: "#2fa84f",
  red: "#e5383b",
  yellow: "#ffd23f",
  purple: "#7b5cff",
  grey: "#8a8a92",
} as const;
export const col = (c?: string) => (c && (PAL as Record<string, string>)[c]) || c || PAL.ink;

export const EASE = Easing.bezier(0.16, 1, 0.3, 1);
export const POP = Easing.bezier(0.34, 1.56, 0.64, 1);
export const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const prog = (f: number, from: number, dur = 12, easing = EASE) => interpolate(f, [from, from + dur], [0, 1], { ...CL, easing });

export const InkContext = createContext<string>(PAL.ink);
