import { createReadStream, createWriteStream, existsSync } from "node:fs";
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
const variantsDir = join(root, "data", "candidates", "02-variants");
const audioDir = join(root, "data", "audio", "proof");
const tmpDir = join(root, "data", "tmp", "proof");
const videosDir = join(root, "data", "segments", "proof");
const proofDir = join(root, "data", "final");
const jamesDir = join(root, "jamesquickfake");
const voiceCachePath = join(audioDir, "voices.json");
const jamesAudioPath = join(audioDir, "james-voice-sample.wav");
const jamesAudioMp3Path = join(audioDir, "james-voice-sample.mp3");
const outputPath = join(proofDir, "voidzero-proof.mp4");

const zekeVoiceId = "R8_JURR4DHK";

const segments = [
  {
    slug: "01-james-wakeup-phone",
    speaker: "james",
    image: "01-james-wakeup-phone__style-05__zpaz24teyhrmy0cygmat53c3jr.jpeg",
    text: "Wake up babe. VoidZero just joined Cloudflare.",
  },
  {
    slug: "01-zeke-bed-phone",
    speaker: "zeke",
    image: "01-zeke-bed-phone__style-08__pqyqykjfe9rmy0cygmas2bhw9w.jpeg",
    text: "Hey James. Good morning. You mean the veet guys? And why are you calling me babe?",
  },
  {
    slug: "02-james-matrix-news",
    speaker: "james",
    image: "02-james-matrix-news__style-06__2136622fasrmr0cygmat29tg8r.jpeg",
    text: "Sorry, I just got excited. Yes, the veet people. Veet, Veet test, Rolldown, Oxc, Veet plus, the whole team.",
  },
  {
    slug: "02-zeke-bathroom-robe",
    speaker: "zeke",
    image: "02-zeke-bathroom-robe__style-05__rcx6z7jfd1rmr0cygmarvx147w.jpeg",
    text: "Huh. That’s actually big. I’m going to need the strong coffee for this one.",
  },
  {
    slug: "03-james-open-source-laptop",
    speaker: "james",
    image: "03-james-open-source-laptop__style-05__01a27g2fe9rmt0cygmatbrhgc4.jpeg",
    text: "The main thing they’re saying is: veet stays veet. MIT licensed, open source, vendor agnostic, community driven.",
  },
  {
    slug: "03-zeke-kitchen-coffee",
    speaker: "zeke",
    image: "03-zeke-kitchen-coffee__style-04__frw96jtffhrmw0cygmasknbq9m.jpeg",
    text: "Good. Because the fastest way to make JavaScript people nervous is to touch their build tool.",
  },
];

async function api(path, options = {}) {
  const response = await fetch(`https://api.replicate.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(body)}`);
  return body;
}

async function pollPrediction(id, timeoutMs = 900_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const prediction = await api(`/predictions/${id}`);
    if (prediction.status === "succeeded") return prediction;
    if (["failed", "canceled", "aborted"].includes(prediction.status)) {
      throw new Error(`Prediction ${id} ${prediction.status}: ${prediction.error ?? "unknown error"}`);
    }
    console.log(`${prediction.status} ${id}`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(`Prediction ${id} timed out`);
}

async function uploadFile(filePath, type = "application/octet-stream") {
  const form = new FormData();
  form.set("content", new Blob([await readFile(filePath)], { type }), filePath.split("/").pop());
  const response = await fetch("https://api.replicate.com/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
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

async function readVoiceCache() {
  if (!existsSync(voiceCachePath)) return {};
  return JSON.parse(await readFile(voiceCachePath, "utf8"));
}

async function writeVoiceCache(cache) {
  await writeFile(voiceCachePath, JSON.stringify(cache, null, 2));
}

async function ensureJamesVoice() {
  const cache = await readVoiceCache();
  if (cache.jamesVoiceId) return cache.jamesVoiceId;

  if (!existsSync(jamesAudioPath)) {
    console.log("extracting James voice sample...");
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      join(jamesDir, "flagship-voice-sample.mp4"),
      "-vn",
      "-ac",
      "1",
      "-ar",
      "44100",
      jamesAudioPath,
    ]);
  }

  if (!existsSync(jamesAudioMp3Path)) {
    console.log("encoding James voice sample as mp3...");
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      jamesAudioPath,
      "-ac",
      "1",
      "-ar",
      "44100",
      "-b:a",
      "128k",
      jamesAudioMp3Path,
    ]);
  }

  console.log("reading James voice sample as data URL...");
  const voiceFile = `data:audio/mpeg;base64,${(await readFile(jamesAudioMp3Path)).toString("base64")}`;
  console.log("cloning James voice...");
  const prediction = await api("/models/minimax/voice-cloning/predictions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: {
        voice_file: voiceFile,
        model: "speech-02-turbo",
        accuracy: 0.7,
        need_noise_reduction: false,
        need_volume_normalization: true,
      },
    }),
  });
  const result = await pollPrediction(prediction.id);
  cache.jamesVoiceId = result.output.voice_id;
  cache.jamesVoiceModel = result.output.model;
  cache.jamesVoicePreview = result.output.preview;
  await writeVoiceCache(cache);
  console.log(`James voice id: ${cache.jamesVoiceId}`);
  return cache.jamesVoiceId;
}

async function createTtsPrediction(segment, voiceId) {
  return api("/models/minimax/speech-2.8-hd/predictions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: {
        text: segment.text,
        voice_id: voiceId,
        speed: 1,
        pitch: 0,
        volume: 1,
        emotion: "auto",
        audio_format: "mp3",
        sample_rate: 32000,
        english_normalization: true,
        subtitle_enable: false,
      },
    }),
  });
}

async function generateAudio(jamesVoiceId) {
  console.log("generating TTS audio...");
  const jobs = await Promise.all(
    segments.map(async (segment, index) => {
      const path = join(audioDir, `${String(index + 1).padStart(2, "0")}-${segment.slug}.mp3`);
      if (existsSync(path)) return { segment, index, path, skipped: true };
      const voiceId = segment.speaker === "james" ? jamesVoiceId : zekeVoiceId;
      const prediction = await createTtsPrediction(segment, voiceId);
      console.log(`audio ${index + 1}: ${prediction.id}`);
      return { segment, index, path, prediction };
    }),
  );

  await Promise.all(
    jobs.map(async (job) => {
      if (job.skipped) return;
      const result = await pollPrediction(job.prediction.id);
      const output = Array.isArray(result.output) ? result.output[0] : result.output;
      await download(output, job.path);
      console.log(`saved audio ${job.path}`);
    }),
  );

  return jobs.map((job) => job.path);
}

async function generateVideos(audioPaths) {
  console.log("uploading selected images and audio...");
  const uploaded = await Promise.all(
    segments.map(async (segment, index) => ({
      segment,
      index,
      imageUrl: await uploadFile(join(variantsDir, segment.image), "image/jpeg"),
      audioUrl: await uploadFile(audioPaths[index], "audio/mpeg"),
    })),
  );

  console.log("generating Fabric videos...");
  const jobs = await Promise.all(
    uploaded.map(async ({ segment, index, imageUrl, audioUrl }) => {
      const rawPath = join(tmpDir, `raw-${String(index + 1).padStart(2, "0")}-${segment.slug}.mp4`);
      if (existsSync(rawPath)) return { segment, index, rawPath, skipped: true };
      const prediction = await api("/models/veed/fabric-1.0/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: { image: imageUrl, audio: audioUrl, resolution: "720p" } }),
      });
      console.log(`video ${index + 1}: ${prediction.id}`);
      return { segment, index, rawPath, prediction };
    }),
  );

  await Promise.all(
    jobs.map(async (job) => {
      if (job.skipped) return;
      const result = await pollPrediction(job.prediction.id, 1_200_000);
      const output = Array.isArray(result.output) ? result.output[0] : result.output;
      await download(output, job.rawPath);
      console.log(`saved raw video ${job.rawPath}`);
    }),
  );

  return jobs.map((job) => job.rawPath);
}

async function normalizeAndReplaceAudio(rawVideoPaths, audioPaths) {
  console.log("normalizing videos and replacing audio...");
  const finalPaths = [];
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const normPath = join(tmpDir, `norm-${String(index + 1).padStart(2, "0")}-${segment.slug}.mp4`);
    const finalPath = join(videosDir, `${String(index + 1).padStart(2, "0")}-${segment.slug}.mp4`);
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      rawVideoPaths[index],
      "-vf",
      "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,fps=25",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-ar",
      "44100",
      "-movflags",
      "+faststart",
      normPath,
    ], { maxBuffer: 50 * 1024 * 1024 });
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      normPath,
      "-i",
      audioPaths[index],
      "-c:v",
      "copy",
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-shortest",
      "-movflags",
      "+faststart",
      finalPath,
    ], { maxBuffer: 50 * 1024 * 1024 });
    finalPaths.push(finalPath);
  }
  return finalPaths;
}

async function stitch(finalPaths) {
  const listPath = join(tmpDir, "proof-concat.txt");
  await writeFile(listPath, finalPaths.map((path) => `file '${path}'`).join("\n"));
  await execFileAsync("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c",
    "copy",
    "-movflags",
    "+faststart",
    outputPath,
  ], { maxBuffer: 50 * 1024 * 1024 });
}

await Promise.all([audioDir, tmpDir, videosDir, proofDir].map((dir) => mkdir(dir, { recursive: true })));

for (const segment of segments) {
  const imagePath = join(variantsDir, segment.image);
  if (!existsSync(imagePath)) throw new Error(`Missing selected image: ${imagePath}`);
}

await execFileAsync("ffmpeg", ["-version"]);

const jamesVoiceId = await ensureJamesVoice();
const audioPaths = await generateAudio(jamesVoiceId);
const rawVideoPaths = await generateVideos(audioPaths);
const finalPaths = await normalizeAndReplaceAudio(rawVideoPaths, audioPaths);
await stitch(finalPaths);

console.log(outputPath);
