#!/usr/bin/env node
// Fetch openly-licensed stock images/videos into public/stock and record the credits.
//   node tools/fetch-stock.mjs --q "american football stadium" --type image --n 3
//   node tools/fetch-stock.mjs --q "football training" --type video --n 2 --source pexels
// Sources: openverse (images, no key), wikimedia (images + video, no key),
//          pexels (PEXELS_API_KEY), pixabay (PIXABAY_API_KEY). Everything downloaded is logged in
//          public/stock/credits.json with license + creator + source URL.
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith("--") ? [...acc, [a.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : true]] : acc), []),
);
const q = args.q;
const type = args.type ?? "image";
const n = Number(args.n ?? 3);
const sources = (args.source ?? "all") === "all" ? ["openverse", "wikimedia", "pexels", "pixabay"] : String(args.source).split(",");
const outDir = path.resolve(args.out ?? "public/stock");
const MAX_BYTES = 40 * 1024 * 1024;
const UA = "vidbucks/2.0 (open-licence stock fetch)";
if (!q) { console.error('usage: --q "query" [--type image|video] [--n 3] [--source openverse,wikimedia,pexels,pixabay]'); process.exit(1); }

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const strip = (s = "") => s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const getJson = async (url, headers = {}) => {
  const r = await fetch(url, { headers: { "User-Agent": UA, ...headers } });
  if (!r.ok) throw new Error(`${r.status} ${url.slice(0, 80)}`);
  return r.json();
};

// Each finder returns [{url, title, creator, license, licenseUrl, pageUrl, ext, source}]
const finders = {
  async openverse() {
    if (type !== "image") return [];
    const d = await getJson(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license_type=commercial&page_size=${n * 3}`);
    return d.results.map((r) => ({
      url: r.url, title: r.title, creator: r.creator ?? "unknown", license: `CC ${r.license.toUpperCase()} ${r.license_version ?? ""}`.trim(),
      licenseUrl: r.license_url, pageUrl: r.foreign_landing_url, ext: path.extname(new URL(r.url).pathname) || ".jpg", source: `openverse/${r.source}`,
    }));
  },
  async wikimedia() {
    const filetype = type === "video" ? "video" : "bitmap";
    const d = await getJson(
      `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(q + " filetype:" + filetype)}&gsrlimit=${n * 3}&prop=imageinfo&iiprop=url|extmetadata|size|mime&iiurlwidth=1920&format=json`,
    );
    return Object.values(d.query?.pages ?? {}).map((p) => {
      const ii = p.imageinfo?.[0];
      const m = ii?.extmetadata ?? {};
      return {
        url: type === "video" ? ii.url : ii.thumburl ?? ii.url, title: p.title.replace(/^File:/, ""), creator: strip(m.Artist?.value) || "unknown",
        license: m.LicenseShortName?.value ?? "unknown", licenseUrl: m.LicenseUrl?.value ?? "", pageUrl: ii.descriptionurl, ext: path.extname(p.title) || ".jpg", source: "wikimedia",
      };
    });
  },
  async pexels() {
    const key = process.env.PEXELS_API_KEY;
    if (!key) return [];
    if (type === "video") {
      const d = await getJson(`https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&per_page=${n * 2}&orientation=landscape`, { Authorization: key });
      return d.videos.map((v) => {
        const f = v.video_files.filter((x) => x.file_type === "video/mp4").sort((a, b) => Math.abs(a.width - 1920) - Math.abs(b.width - 1920))[0];
        return { url: f.link, title: `pexels video ${v.id}`, creator: v.user.name, license: "Pexels License", licenseUrl: "https://www.pexels.com/license/", pageUrl: v.url, ext: ".mp4", source: "pexels" };
      });
    }
    const d = await getJson(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=${n * 2}&orientation=landscape`, { Authorization: key });
    return d.photos.map((p) => ({ url: p.src.large2x, title: p.alt || `pexels photo ${p.id}`, creator: p.photographer, license: "Pexels License", licenseUrl: "https://www.pexels.com/license/", pageUrl: p.url, ext: ".jpg", source: "pexels" }));
  },
  async pixabay() {
    const key = process.env.PIXABAY_API_KEY;
    if (!key) return [];
    if (type === "video") {
      const d = await getJson(`https://pixabay.com/api/videos/?key=${key}&q=${encodeURIComponent(q)}&per_page=${Math.max(3, n * 2)}`);
      return d.hits.map((v) => ({ url: (v.videos.large?.url || v.videos.medium.url), title: v.tags, creator: v.user, license: "Pixabay Content License", licenseUrl: "https://pixabay.com/service/license-summary/", pageUrl: v.pageURL, ext: ".mp4", source: "pixabay" }));
    }
    const d = await getJson(`https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(q)}&image_type=photo&per_page=${Math.max(3, n * 2)}`);
    return d.hits.map((p) => ({ url: p.largeImageURL, title: p.tags, creator: p.user, license: "Pixabay Content License", licenseUrl: "https://pixabay.com/service/license-summary/", pageUrl: p.pageURL, ext: ".jpg", source: "pixabay" }));
  },
};

// Only licenses that allow commercial reuse (attribution is logged for the ones that need it).
const OK = /(^cc0|public domain|^pd|cc by(-sa)? \d|cc by-sa|cc by |pexels|pixabay|^by(-sa)? )/i;
const NEEDS_ATTRIBUTION = /cc by|^by/i;

await mkdir(outDir, { recursive: true });
const creditsPath = path.join(outDir, "credits.json");
const credits = existsSync(creditsPath) ? JSON.parse(await readFile(creditsPath, "utf8")) : [];
let saved = 0;
for (const s of sources) {
  if (saved >= n) break;
  let found = [];
  try { found = await finders[s](); } catch (e) { console.warn(`[${s}] ${e.message}`); continue; }
  console.log(`[${s}] ${found.length} candidates`);
  for (const c of found) {
    if (saved >= n) break;
    if (!OK.test(c.license) || /nc|nd/i.test(c.license.replace(/(cc by)/i, ""))) continue; // skip NonCommercial / NoDerivs
    try {
      const r = await fetch(c.url, { headers: { "User-Agent": UA } });
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > MAX_BYTES || buf.length < 5000) continue;
      const name = `${slug(q)}-${credits.length + 1}${c.ext.toLowerCase()}`;
      await writeFile(path.join(outDir, name), buf);
      credits.push({ file: name, query: q, type, ...c, attribution: NEEDS_ATTRIBUTION.test(c.license), fetchedAt: new Date().toISOString().slice(0, 10) });
      console.log(`  saved ${name}  (${c.license}, ${c.creator.slice(0, 40)})`);
      saved++;
    } catch (e) { console.warn(`  skip: ${e.message}`); }
  }
}
await writeFile(creditsPath, JSON.stringify(credits, null, 2));
console.log(`done: ${saved}/${n} saved -> ${outDir}`);
if (saved) console.log("attribution lines (paste into the video description when 'attribution: true'):\n" + credits.slice(-saved).filter((x) => x.attribution).map((x) => `- "${x.title}" by ${x.creator} (${x.license}) ${x.pageUrl}`).join("\n"));
