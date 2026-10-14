// Final-video gate.   node tools/qa.mjs <file.mp4> [--minutes 8] [--tol 30] [--maxmb 400]
// Checks with ffprobe/ffmpeg: duration vs target, 1080p, audio stream, integrated loudness (-16 LUFS target), true peak, silence gaps, black frames, file size.
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const f = process.argv[2];
if (!f || !fs.existsSync(f)) { console.error("usage: node tools/qa.mjs <file.mp4> [--minutes N] [--tol S] [--maxmb N]"); process.exit(1); }
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const minutes = parseFloat(arg("--minutes", "0")), tol = parseFloat(arg("--tol", "30")), maxmb = parseFloat(arg("--maxmb", "500"));
const sh = (c, a) => spawnSync(c, a, { encoding: "utf8", maxBuffer: 1 << 28 });
const probe = JSON.parse(sh("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", f]).stdout);
const v = probe.streams.find((s) => s.codec_type === "video"), a = probe.streams.find((s) => s.codec_type === "audio");
const dur = parseFloat(probe.format.duration), mb = fs.statSync(f).size / 1048576;
const res = [];
const chk = (name, ok, detail) => res.push({ name, ok, detail });
chk("video stream", !!v, v ? `${v.width}x${v.height} ${v.codec_name} ${v.r_frame_rate}` : "missing");
chk("1080p", !!v && v.height >= 1080, v ? `${v.height}p` : "-");
chk("audio stream", !!a, a ? `${a.codec_name} ${a.sample_rate} Hz` : "missing");
if (minutes) chk("duration", Math.abs(dur - minutes * 60) <= tol, `${dur.toFixed(1)} s vs ${minutes * 60} s +-${tol}`);
else chk("duration", dur > 5, `${dur.toFixed(1)} s`);
chk("file size", mb <= maxmb, `${mb.toFixed(0)} MB (max ${maxmb})`);
const ln = sh("ffmpeg", ["-hide_banner", "-nostats", "-i", f, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-vn", "-f", "null", "-"]).stderr;
const m = ln.match(/\{[\s\S]*?"input_i"[\s\S]*?\}/);
if (m) { const j = JSON.parse(m[0]); const I = parseFloat(j.input_i), tp = parseFloat(j.input_tp); chk("loudness", Math.abs(I + 16) <= 1.5, `${I} LUFS (target -16 +-1.5)`); chk("true peak", tp <= -1, `${tp} dBTP (<= -1)`); }
else chk("loudness", false, "could not measure");
const sil = sh("ffmpeg", ["-hide_banner", "-nostats", "-i", f, "-af", "silencedetect=n=-45dB:d=2.5", "-vn", "-f", "null", "-"]).stderr.match(/silence_duration: [0-9.]+/g) ?? [];
chk("no long silence (>2.5 s)", sil.length <= 1, `${sil.length} gap(s)`);
const blk = sh("ffmpeg", ["-hide_banner", "-nostats", "-i", f, "-vf", "blackdetect=d=0.8:pix_th=0.06", "-an", "-f", "null", "-"]).stderr.match(/black_start:[0-9.]+/g) ?? [];
chk("no black frames (>0.8 s)", blk.length === 0, `${blk.length} segment(s)`);
for (const r of res) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name.padEnd(26)} ${r.detail}`);
const bad = res.filter((r) => !r.ok);
console.log(bad.length ? `\n${bad.length} check(s) failed` : "\nALL CHECKS PASSED");
process.exit(bad.length ? 1 : 0);
