// One-off: regenerate ONLY segment 2 (01-zeke-bed-phone) lip-sync video from its
// existing image + (already-rendered) audio, without touching the other 11.
// veed/fabric-1.0 -> normalize to 1280x720/25fps -> swap in the clean TTS audio.
//
// Usage: node scripts/rebuild-segment-02.mjs

import { createWriteStream } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const token = process.env.REPLICATE_API_TOKEN;
if (!token) throw new Error("REPLICATE_API_TOKEN is not set");

const root = new URL("..", import.meta.url).pathname;
const IMAGE = join(root, "data/candidates/06-short-v4/01-zeke-bed-phone__style-07__8efr40kmfdrmw0cygnm82pdkc4.jpeg");
const AUDIO = join(root, "data/audio/v5/02-01-zeke-bed-phone.mp3");
const RAW = join(root, "data/tmp/v5/raw-02-01-zeke-bed-phone.mp4");
const NORM = join(root, "data/tmp/v5/norm-02-01-zeke-bed-phone.mp4");
const FINAL = join(root, "data/segments/v5/02-01-zeke-bed-phone.mp4");

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

async function poll(id, timeoutMs = 1_800_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const p = await api(`/predictions/${id}`);
    if (p.status === "succeeded") return p;
    if (["failed", "canceled", "aborted"].includes(p.status)) {
      throw new Error(`Prediction ${id} ${p.status}: ${p.error ?? "unknown"}`);
    }
    console.log(`${p.status} ${id}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`Prediction ${id} timed out`);
}

async function uploadFile(filePath, type) {
  const form = new FormData();
  form.set("content", new Blob([await readFile(filePath)], { type }), filePath.split("/").pop());
  const res = await fetch("https://api.replicate.com/v1/files", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
  const body = JSON.parse(await res.text());
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(body)}`);
  return body.urls.get;
}

async function download(url, path) {
  await mkdir(dirname(path), { recursive: true });
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  await finished(Readable.fromWeb(res.body).pipe(createWriteStream(path)));
}

await mkdir(dirname(RAW), { recursive: true });
await mkdir(dirname(FINAL), { recursive: true });

console.log("uploading image + audio...");
const [imageUrl, audioUrl] = await Promise.all([
  uploadFile(IMAGE, "image/jpeg"),
  uploadFile(AUDIO, "audio/mpeg"),
]);

console.log("generating Fabric lip-sync video...");
const prediction = await api("/models/veed/fabric-1.0/predictions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ input: { image: imageUrl, audio: audioUrl, resolution: "720p" } }),
});
console.log(`prediction ${prediction.id}`);
const result = await poll(prediction.id);
const output = Array.isArray(result.output) ? result.output[0] : result.output;
await download(output, RAW);
console.log(`saved raw ${RAW}`);

console.log("normalizing + replacing audio...");
await execFileAsync("ffmpeg", ["-y", "-i", RAW, "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,fps=25", "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-movflags", "+faststart", NORM], { maxBuffer: 50 * 1024 * 1024 });
await execFileAsync("ffmpeg", ["-y", "-i", NORM, "-i", AUDIO, "-c:v", "copy", "-map", "0:v:0", "-map", "1:a:0", "-shortest", "-movflags", "+faststart", FINAL], { maxBuffer: 50 * 1024 * 1024 });
console.log(`done: ${FINAL}`);
