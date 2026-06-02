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
const imagesDir = join(root, "data", "candidates", "06-short-v4");
const audioDir = join(root, "data", "audio", "short-v4");
const tmpDir = join(root, "data", "tmp", "short-v4");
const videosDir = join(root, "data", "segments", "short-v4");
const proofDir = join(root, "data", "final");
const voiceCachePath = join(root, "data", "audio", "voices.json");
const outputPath = join(proofDir, "voidzero-short-v4.mp4");
const zekeVoiceId = "R8_JURR4DHK";

const segments = [
  {
    slug: "01-james-predawn-desk",
    speaker: "james",
    image: "01-james-predawn-desk__style-19__geg9003mexrmt0cygnm9fbw958.jpeg",
    text: "Wake up babe. VoidZero just joined Cloudflare.",
  },
  {
    slug: "01-zeke-bed-phone",
    speaker: "zeke",
    image: "01-zeke-bed-phone__style-07__8efr40kmfdrmw0cygnm82pdkc4.jpeg",
    text: "Hey James. Good morning. You mean the veet guys? And why are you calling me babe?",
  },
  {
    slug: "02-james-kitchen-laptops",
    speaker: "james",
    image: "02-james-kitchen-laptops__style-19__chpz6fvmdhrmw0cygnm9vzdgs8.jpeg",
    text: "Sorry, I just got excited. Yes, the veet people. Veet, Veet test, Rolldown, Oxc, Veet plus, the whole team.",
  },
  {
    slug: "02-zeke-bathroom-toothbrush",
    speaker: "zeke",
    image: "02-zeke-bathroom-toothbrush__style-15__ssj4h3vmphrmt0cygnm82gct58.jpeg",
    text: "Huh. That’s actually big. Huh.",
  },
  {
    slug: "03-james-standing-desk",
    speaker: "james",
    image: "03-james-standing-desk__style-19__j27as7bn0nrmw0cygnma16qfs4.jpeg",
    text: "The main thing they’re saying is: veet stays veet. MIT licensed, open source, vendor agnostic, community driven.",
  },
  {
    slug: "03-zeke-kitchen-coffee",
    speaker: "zeke",
    image: "03-zeke-kitchen-coffee__style-11__2g24mavmq9rmw0cygnmb7em1j0.jpeg",
    text: "Good. Because the fastest way to make JavaScript people nervous is to touch their build tool.",
  },
  {
    slug: "04-james-train-laptop",
    speaker: "james",
    image: "04-james-train-laptop__style-19__8c6jz3vn0nrmw0cygnma9e6f4w.jpeg",
    text: "Veet is kind of the shared road now. Vue, SvelteKit, Nuxt, Astro, Solid, Qwik, Angular, React Router, TanStack Start, a lot of people are building on it.",
  },
  {
    slug: "04-zeke-garden-coffee",
    speaker: "zeke",
    image: "04-zeke-garden-coffee__style-22__es998kvn2hrmw0cygnm9vx8v40.jpeg",
    text: "Right. Not the same framework. Just the same road. Ideally one without potholes made of Webpack config.",
  },
  {
    slug: "05-james-coworking-fund",
    speaker: "james",
    image: "05-james-coworking-fund__style-04__9hzwr03mw1rmw0cygnmb84m3dr.jpeg",
    text: "And they’re putting a million dollars into the veet ecosystem fund. Not a swag budget. Actual maintainer support, run by the veet core team.",
  },
  {
    slug: "05-zeke-garden-awake",
    speaker: "zeke",
    image: "05-zeke-garden-awake__style-13__a55x4mbmz9rmt0cygnm9q4c694.jpeg",
    text: "A million dollars for maintainers. Okay, now I’m awake.",
  },
  {
    slug: "06-james-daylight-desk",
    speaker: "james",
    image: "06-james-daylight-desk__style-05__mvg0kskmp1rmr0cygnmbnqtb5m.jpeg",
    text: "That’s the opportunity: keep veet portable, make Cloudflare’s app tooling feel more like veet, and build better primitives for full-stack apps and agents.",
  },
  {
    slug: "06-zeke-garden-finale",
    speaker: "zeke",
    image: "06-zeke-garden-finale__style-04__y0mf0bkn0hrmy0cygnmahr0s0r.jpeg",
    text: "Great. The coffee is kicking in, our precious build tools are safe, and I'm your babe. Not a bad start to the day.",
  },
];

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

async function pollPrediction(id, timeoutMs = 1_500_000) {
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
  if (!existsSync(voiceCachePath)) throw new Error(`Missing James voice cache: ${voiceCachePath}. Run scripts/build-proof-video.mjs once first.`);
  const cache = JSON.parse(await readFile(voiceCachePath, "utf8"));
  if (!cache.jamesVoiceId) throw new Error(`Missing jamesVoiceId in ${voiceCachePath}`);
  return cache.jamesVoiceId;
}

async function createTtsPrediction(segment, voiceId) {
  return api("/models/minimax/speech-2.8-hd/predictions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: { text: segment.text, voice_id: voiceId, speed: 1, pitch: 0, volume: 1, emotion: "auto", audio_format: "mp3", sample_rate: 32000, english_normalization: true, subtitle_enable: false } }),
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
    imageUrl: await uploadFile(join(imagesDir, segment.image), "image/jpeg"),
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
  const listPath = join(tmpDir, "short-v4-concat.txt");
  await writeFile(listPath, finalPaths.map((path) => `file '${path}'`).join("\n"));
  await execFileAsync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", "-movflags", "+faststart", outputPath], { maxBuffer: 50 * 1024 * 1024 });
}

await Promise.all([audioDir, tmpDir, videosDir, proofDir].map((dir) => mkdir(dir, { recursive: true })));
for (const segment of segments) {
  const imagePath = join(imagesDir, segment.image);
  if (!existsSync(imagePath)) throw new Error(`Missing selected image: ${imagePath}`);
}
await execFileAsync("ffmpeg", ["-version"]);
const jamesVoiceId = await getJamesVoiceId();
const audioPaths = await generateAudio(jamesVoiceId);
const rawVideoPaths = await generateVideos(audioPaths);
const finalPaths = await normalizeAndReplaceAudio(rawVideoPaths, audioPaths);
await stitch(finalPaths);
console.log(outputPath);
