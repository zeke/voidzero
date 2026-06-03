// Standalone TTS preview: render one line with minimax/speech-2.8-hd and save an mp3.
// Used to audition new dialogue before committing to the (paid) lip-sync video step.
//
// Usage: node scripts/tts-preview.mjs
// Edit TEXT / VOICE_ID / SPEED / PITCH below to taste.

import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";

const token = process.env.REPLICATE_API_TOKEN;
if (!token) throw new Error("REPLICATE_API_TOKEN is not set");

// --- what to render -------------------------------------------------------
const TEXT = "Ah. James. Good morning. You mean the veet people? And did you just call me 'babe'?";
const VOICE_ID = "R8_JURR4DHK"; // zeke
const SPEED = 0.72; // sleepy (matches 01-zeke-bed-phone in build-v5-video.mjs)
const PITCH = -1; // sleepy
const OUT = new URL("../data/tmp/v5-preview/02-zeke-bed-phone.mp3", import.meta.url).pathname;
// --------------------------------------------------------------------------

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
    console.log(`${p.status} ${id}`);
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new Error(`Prediction ${id} timed out`);
}

const prediction = await api("/models/minimax/speech-2.8-hd/predictions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    input: {
      text: TEXT,
      voice_id: VOICE_ID,
      speed: SPEED,
      pitch: PITCH,
      volume: 1,
      emotion: "auto",
      audio_format: "mp3",
      sample_rate: 32000,
      english_normalization: true,
      subtitle_enable: false,
    },
  }),
});
console.log(`prediction ${prediction.id}`);
const result = await poll(prediction.id);
const output = Array.isArray(result.output) ? result.output[0] : result.output;

await mkdir(dirname(OUT), { recursive: true });
const res = await fetch(output, { headers: { Authorization: `Bearer ${token}` } });
if (!res.ok) throw new Error(`download failed: ${res.status}`);
await finished(Readable.fromWeb(res.body).pipe(createWriteStream(OUT)));
console.log(`saved ${OUT}`);
