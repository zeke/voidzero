import { createWriteStream, existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const token = process.env.REPLICATE_API_TOKEN;
if (!token) throw new Error("REPLICATE_API_TOKEN is not set");

const root = new URL("..", import.meta.url).pathname;
const v4Dir = join(root, "data", "candidates", "06-short-v4");
const v5Dir = join(root, "data", "candidates", "07-v5");
const v3Dir = join(root, "data", "candidates", "05-short-v3");
const v6Dir = join(root, "data", "candidates", "08-v6-focused");
const v7Dir = join(root, "data", "candidates", "09-v7-adapter");
const v8Dir = join(root, "data", "candidates", "10-v8-fund");
const audioDir = join(root, "data", "audio", "v5");
const tmpDir = join(root, "data", "tmp", "v5");
const videosDir = join(root, "data", "segments", "v5");
const proofDir = join(root, "data", "final");
const voiceCachePath = join(root, "data", "audio", "voices.json");
const outputPath = join(proofDir, "voidzero-v5.mp4");
const zekeVoiceId = "R8_JURR4DHK";

const selections = {
  "01-james-predawn-desk": "short v4:01-james-predawn-desk__style-19__geg9003mexrmt0cygnm9fbw958.jpeg",
  "01-zeke-bed-phone": "short v4:01-zeke-bed-phone__style-07__8efr40kmfdrmw0cygnm82pdkc4.jpeg",
  "02-james-kitchen-laptops": "short v4:02-james-kitchen-laptops__style-19__chpz6fvmdhrmw0cygnm9vzdgs8.jpeg",
  "02-zeke-bathroom-toothbrush": "v6 focused:02-zeke-bathroom-toothbrush__style-22__y50wrme8b5rmt0cyh648g9h9pc.jpeg",
  "05-james-vite-explainer": "v5:05-james-vite-explainer__style-19__yczmb8abh1rmt0cyh5psye8h9m.jpeg",
  "03-zeke-kitchen-coffee": "short v4:03-zeke-kitchen-coffee__style-11__2g24mavmq9rmw0cygnmb7em1j0.jpeg",
  "07-james-open-commitment": "short v4:03-james-standing-desk__style-22__s0q1ns3mj5rmw0cygnmb3v90gr.jpeg",
  "08-zeke-big-huh": "v5:08-zeke-big-huh__style-07__35acwnjbt9rmr0cyh5pvwx3cgc.jpeg",
  "09-james-fund": "v8 fund:09-james-fund__bank-vault__style-11__dpwyk2czqxrmy0cyh8m854ddqm.jpeg",
  "05-zeke-garden-awake": "short v3:05-zeke-garden-awake__style-14__nam0r37r6nrmr0cygngbf3nep8.jpeg",
  "11-james-adapter-dance": "v7 adapter:11-james-adapter-dance__style-22__p3vrf1qb3srmy0cyh6ftfvgbf8.jpeg",
  "12-zeke-finale": "short v4:06-zeke-garden-finale__style-19__rwd63wvmxhrmw0cygnmahfdwdg.jpeg",
};

const segments = [
  ["01-james-predawn-desk", "james", "Wake up babe. VoidZero just joined Cloudflare."],
  ["01-zeke-bed-phone", "zeke", "Ah. James. Good morning. You mean the veet people? Also did you just call me 'babe'?"],
  ["02-james-kitchen-laptops", "james", "Sorry, I got excited. Yes, the veet people. The team behind veet, Veet test, Rolldown, Oxc, Veet plus, all of it."],
  ["02-zeke-bathroom-toothbrush", "zeke", "Remind me. What’s veet again?"],
  ["05-james-vite-explainer", "james", "Have you been living under a rock, my guy? Veet is the de facto build tool of the JavaScript ecosystem. Fast dev server, fast feedback loop, used by frameworks like Vue, Astro, React Router, TanStack Start. Ring a bell?"],
  ["03-zeke-kitchen-coffee", "zeke", "Oh yeah. Sure. Sure. I know veet. Obviously. Use it all the time. Cool. So what happens now that they’ve joined Cloudflare?"],
  ["07-james-open-commitment", "james", "The tooling stays open source, MIT licensed, vendor agnostic, and community driven. Same team, same commitment: keep it that way."],
  ["08-zeke-big-huh", "zeke", "Oooh. Nice. Open source for the win. I love it."],
  ["09-james-fund", "james", "A million dollars is going into the veet ecosystem fund, run by the veet core team. That’s real support for the people keeping the lights on."],
  ["05-zeke-garden-awake", "zeke", "A million dollars for maintainers? Wow. Okay. Now I’m awake."],
  ["11-james-adapter-dance", "james", "Basically, Veet stays portable, and Cloudflare does the adapting. Which is good, because developers have already done enough adapting for one lifetime."],
  ["12-zeke-finale", "zeke", "Gotcha. Veet stays veet, maintainers get paid, the build tools are safe, and life keeps getting better. Thanks for the update, babe!"],
].map(([slug, speaker, text]) => ({ slug, speaker, text, imagePath: resolveSelection(selections[slug]) }));

function resolveSelection(value) {
  const [source, filename] = value.split(":");
  if (source === "short v3") return join(v3Dir, filename);
  if (source === "short v4") return join(v4Dir, filename);
  if (source === "v5") return join(v5Dir, filename);
  if (source === "v6 focused") return join(v6Dir, filename);
  if (source === "v7 adapter") return join(v7Dir, filename);
  if (source === "v8 fund") return join(v8Dir, filename);
  if (source === "existing v4") return join(v4Dir, filename);
  if (source === "new v5") return join(v5Dir, filename);
  if (source === "prior v5") return join(v5Dir, filename);
  if (source === "new v6") return join(v6Dir, filename);
  if (source === "new v7") return join(v7Dir, filename);
  throw new Error(`Unknown selection source: ${value}`);
}

async function api(path, options = {}) {
  const response = await fetch(`https://api.replicate.com/v1${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers ?? {}) },
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(body)}`);
  return body;
}

async function pollPrediction(id, timeoutMs = 1_800_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const prediction = await api(`/predictions/${id}`);
    if (prediction.status === "succeeded") return prediction;
    if (["failed", "canceled", "aborted"].includes(prediction.status)) throw new Error(`Prediction ${id} ${prediction.status}: ${prediction.error ?? "unknown error"}`);
    console.log(`${prediction.status} ${id}`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(`Prediction ${id} timed out`);
}

async function uploadFile(filePath, type = "application/octet-stream") {
  const form = new FormData();
  form.set("content", new Blob([await readFile(filePath)], { type }), filePath.split("/").pop());
  const response = await fetch("https://api.replicate.com/v1/files", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(body)}`);
  return body.urls.get;
}

async function download(url, path) {
  await mkdir(dirname(path), { recursive: true });
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Could not download ${url}: ${response.status} ${response.statusText}`);
  await finished(Readable.fromWeb(response.body).pipe(createWriteStream(path)));
}

async function getJamesVoiceId() {
  if (!existsSync(voiceCachePath)) throw new Error(`Missing James voice cache: ${voiceCachePath}`);
  const cache = JSON.parse(await readFile(voiceCachePath, "utf8"));
  if (!cache.jamesVoiceId) throw new Error(`Missing jamesVoiceId in ${voiceCachePath}`);
  return cache.jamesVoiceId;
}

// Per-segment TTS delivery overrides (minimax/speech-2.8-hd). Defaults: speed 1,
// pitch 0, emotion auto.
const ttsOverrides = {
  "01-zeke-bed-phone": { speed: 0.86, pitch: 0, emotion: "surprised" }, // just woken, sardonic
  "08-zeke-big-huh": { speed: 0.88 },
};

async function createTtsPrediction(segment, voiceId) {
  const o = ttsOverrides[segment.slug] ?? {};
  return api("/models/minimax/speech-2.8-hd/predictions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: { text: segment.text, voice_id: voiceId, speed: o.speed ?? 1, pitch: o.pitch ?? 0, volume: 1, emotion: o.emotion ?? "auto", audio_format: "mp3", sample_rate: 32000, english_normalization: true, subtitle_enable: false } }),
  });
}

async function generateAudio(jamesVoiceId) {
  console.log("generating TTS audio...");
  const jobs = await Promise.all(segments.map(async (segment, index) => {
    const path = join(audioDir, `${String(index + 1).padStart(2, "0")}-${segment.slug}.mp3`);
    if (existsSync(path)) return { segment, index, path, skipped: true };
    const voiceId = segment.speaker === "james" ? jamesVoiceId : zekeVoiceId;
    const prediction = await createTtsPrediction(segment, voiceId);
    console.log(`audio ${index + 1}: ${prediction.id}`);
    return { segment, index, path, prediction };
  }));
  await Promise.all(jobs.map(async (job) => {
    if (job.skipped) return;
    const result = await pollPrediction(job.prediction.id);
    const output = Array.isArray(result.output) ? result.output[0] : result.output;
    await download(output, job.path);
    console.log(`saved audio ${job.path}`);
  }));
  return jobs.map((job) => job.path);
}

async function generateVideos(audioPaths) {
  console.log("uploading selected images and audio...");
  const uploaded = await Promise.all(segments.map(async (segment, index) => ({
    segment,
    index,
    imageUrl: await uploadFile(segment.imagePath, "image/jpeg"),
    audioUrl: await uploadFile(audioPaths[index], "audio/mpeg"),
  })));
  console.log("generating Fabric videos...");
  const jobs = await Promise.all(uploaded.map(async ({ segment, index, imageUrl, audioUrl }) => {
    const rawPath = join(tmpDir, `raw-${String(index + 1).padStart(2, "0")}-${segment.slug}.mp4`);
    if (existsSync(rawPath)) return { segment, index, rawPath, skipped: true };
    const prediction = await api("/models/veed/fabric-1.0/predictions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: { image: imageUrl, audio: audioUrl, resolution: "720p" } }) });
    console.log(`video ${index + 1}: ${prediction.id}`);
    return { segment, index, rawPath, prediction };
  }));
  await Promise.all(jobs.map(async (job) => {
    if (job.skipped) return;
    const result = await pollPrediction(job.prediction.id, 1_800_000);
    const output = Array.isArray(result.output) ? result.output[0] : result.output;
    await download(output, job.rawPath);
    console.log(`saved raw video ${job.rawPath}`);
  }));
  return jobs.map((job) => job.rawPath);
}

async function normalizeAndReplaceAudio(rawVideoPaths, audioPaths) {
  console.log("normalizing videos and replacing audio...");
  const finalPaths = [];
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const normPath = join(tmpDir, `norm-${String(index + 1).padStart(2, "0")}-${segment.slug}.mp4`);
    const finalPath = join(videosDir, `${String(index + 1).padStart(2, "0")}-${segment.slug}.mp4`);
    await execFileAsync("ffmpeg", ["-y", "-i", rawVideoPaths[index], "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,fps=25", "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-movflags", "+faststart", normPath], { maxBuffer: 50 * 1024 * 1024 });
    await execFileAsync("ffmpeg", ["-y", "-i", normPath, "-i", audioPaths[index], "-c:v", "copy", "-map", "0:v:0", "-map", "1:a:0", "-shortest", "-movflags", "+faststart", finalPath], { maxBuffer: 50 * 1024 * 1024 });
    finalPaths.push(finalPath);
  }
  return finalPaths;
}

async function stitch(finalPaths) {
  const listPath = join(tmpDir, "v5-concat.txt");
  await writeFile(listPath, finalPaths.map((path) => `file '${path}'`).join("\n"));
  await execFileAsync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", "-movflags", "+faststart", outputPath], { maxBuffer: 50 * 1024 * 1024 });
}

await Promise.all([audioDir, tmpDir, videosDir, proofDir].map((dir) => mkdir(dir, { recursive: true })));
for (const segment of segments) {
  if (!existsSync(segment.imagePath)) throw new Error(`Missing selected image: ${segment.imagePath}`);
}
await execFileAsync("ffmpeg", ["-version"]);
const jamesVoiceId = await getJamesVoiceId();
const audioPaths = await generateAudio(jamesVoiceId);
const rawVideoPaths = await generateVideos(audioPaths);
const finalPaths = await normalizeAndReplaceAudio(rawVideoPaths, audioPaths);
await stitch(finalPaths);
console.log(outputPath);
