// Generate several TTS variants of one line and write an audition HTML page.
// minimax/speech-2.8-hd. Used to pick delivery before the paid lip-sync step.
//
// Usage: node scripts/tts-variants.mjs

import { createWriteStream, existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";

const token = process.env.REPLICATE_API_TOKEN;
if (!token) throw new Error("REPLICATE_API_TOKEN is not set");

const VOICE_ID = "R8_JURR4DHK"; // zeke
const root = new URL("..", import.meta.url).pathname;
const outDir = `${root}data/tmp/v5-preview/variants-seg12`;
const htmlPath = `${root}site/tts-variants-seg12.html`;

// TTS pronunciation spelling ("veet"); captions will display "Vite".
const TEXT_1 = "Gotcha. veet stays awesome, maintainers get paid, and our beloved build tools are safe. Sounds like a sweet deal to me. Thanks for the update, babe.";
const TEXT_2 = "Gotcha. veet stays veet, and maintainers get paid. Sounds like a sweet deal to me. Thanks for the update, babe.";

// Seg 12 finale: two text options x a few emotions, base 0.86 / pitch 0.
const variants = [
  { key: "s12b-t1-happy", label: "Text 1 — happy / 0.86", text: TEXT_1, speed: 0.86, pitch: 0, emotion: "happy" },
  { key: "s12b-t1-auto", label: "Text 1 — auto / 0.86", text: TEXT_1, speed: 0.86, pitch: 0, emotion: "auto" },
  { key: "s12b-t1-surprised", label: "Text 1 — surprised / 0.86", text: TEXT_1, speed: 0.86, pitch: 0, emotion: "surprised" },
  { key: "s12b-t2-happy", label: "Text 2 — happy / 0.86", text: TEXT_2, speed: 0.86, pitch: 0, emotion: "happy" },
  { key: "s12b-t2-auto", label: "Text 2 — auto / 0.86", text: TEXT_2, speed: 0.86, pitch: 0, emotion: "auto" },
  { key: "s12b-t2-surprised", label: "Text 2 — surprised / 0.86", text: TEXT_2, speed: 0.86, pitch: 0, emotion: "surprised" },
];

async function api(path, options = {}) {
  const res = await fetch(`https://api.replicate.com/v1${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
  });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${JSON.stringify(body)}`);
  return body;
}

async function poll(id, timeoutMs = 600_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const p = await api(`/predictions/${id}`);
    if (p.status === "succeeded") return p;
    if (["failed", "canceled", "aborted"].includes(p.status)) {
      throw new Error(`Prediction ${id} ${p.status}: ${p.error ?? "unknown"}`);
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new Error(`Prediction ${id} timed out`);
}

async function download(url, path) {
  await mkdir(dirname(path), { recursive: true });
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  await finished(Readable.fromWeb(res.body).pipe(createWriteStream(path)));
}

console.log(`Generating ${variants.length} variants...`);
await Promise.all(
  variants.map(async (v) => {
    const dst = `${outDir}/${v.key}.mp3`;
    if (existsSync(dst)) { console.log(`  cached ${v.key}`); return; }
    const prediction = await api("/models/minimax/speech-2.8-hd/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: {
          text: v.text,
          voice_id: VOICE_ID,
          speed: v.speed,
          pitch: v.pitch,
          volume: 1,
          emotion: v.emotion,
          audio_format: "mp3",
          sample_rate: 32000,
          english_normalization: true,
          subtitle_enable: false,
        },
      }),
    });
    const result = await poll(prediction.id);
    const output = Array.isArray(result.output) ? result.output[0] : result.output;
    await download(output, dst);
    console.log(`  saved ${v.key}`);
  }),
);

const cards = variants
  .map(
    (v) => `
    <div class="card">
      <div class="name">${v.label}</div>
      <div class="meta">speed ${v.speed} · pitch ${v.pitch} · emotion ${v.emotion}${v.text.includes("<#") ? " · pauses" : ""}</div>
      <div class="text">${v.text.replace(/</g, "&lt;")}</div>
      <audio controls preload="none" src="../data/tmp/v5-preview/${outDir.split("/").pop()}/${v.key}.mp3"></audio>
    </div>`,
  )
  .join("");

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Segment 12 — TTS variants</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; padding:32px; font-family:system-ui,sans-serif; background:#2b4d43; color:#f3efe7; }
  h1 { margin:0 0 4px; }
  p.intro { color:#cfe0d8; max-width:760px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(340px,1fr)); gap:14px; margin-top:20px; }
  .card { background:rgba(0,0,0,.22); border:1px solid rgba(255,255,255,.12); border-radius:12px; padding:14px 16px; }
  .name { font-weight:700; }
  .meta { font-size:12px; color:#a9c2b7; margin:2px 0 8px; }
  .text { font-size:13px; color:#dfeae4; margin-bottom:10px; font-style:italic; }
  audio { width:100%; }
</style></head><body>
  <h1>Segment 12 — TTS variants (zeke)</h1>
  <p class="intro">minimax/speech-2.8-hd. Same voice (${VOICE_ID}); varying speed, pitch, emotion, and pause-marker phrasing. Tell me the variant key (e.g. <code>04-surprised</code>) you want and I'll bake it in.</p>
  <div class="grid">${cards}</div>
</body></html>`;

await mkdir(dirname(htmlPath), { recursive: true });
await writeFile(htmlPath, html);
console.log(`\nWrote ${htmlPath}`);
