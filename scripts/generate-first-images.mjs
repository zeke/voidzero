import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";

const token = process.env.REPLICATE_API_TOKEN;
if (!token) throw new Error("REPLICATE_API_TOKEN is not set");

const root = new URL("..", import.meta.url).pathname;
const outDir = join(root, "data", "candidates", "01-first");
const manifestPath = join(outDir, "first-images-manifest.json");

const zekeAssets = join(root, "assets", "zeke");
const jamesAssets = join(root, "jamesquickfake");

const styleRefs = {
  "style-01": "https://lh3.googleusercontent.com/pw/AP1GczO2SZlRxY8jANORqQ3iBp0afCcVcpW0WR_BtB4EGct2OtIPUzgjoKgUyrAPqOoD_uIkTY4TmW9_qVfhLOqXsRiTQAmGOUS1rHKDaK6_WQiO6kiW-kQI=s1600-no",
  "style-02": "https://lh3.googleusercontent.com/pw/AP1GczNkusQXpmySwKHVIOJDt6psyPOC20rdPkEfZRzv7N_wTnEjSgvQKf_FyYMbz_lBBqt9rtxZqn8dU2i0y8eA_a7mtoXESW7J_9B2iVX8dZQUwcchM7xC=s1600-no",
  "style-03": "https://lh3.googleusercontent.com/pw/AP1GczMZmxgTc-JdyH_3QDbl5H-H2kOKQJxuGlH9cAoIACjSNaTq8gqoxYYivjaxg9hAfOl7L1TX9rrICfcj-OCX9KNBco-KLkcAqKjS20WpDYV3OUJLbzaE=s1600-no",
};

const globalPrompt = `Create a 16:9 artistic talking-head portrait for a deepfake announcement video. Use the person reference images only for identity. Preserve recognizable face shape, hair, beard, glasses, age, and expression. Use the style reference image for palette, texture, abstraction, and mark-making. Make it feel like finished editorial art, not a photo. The subject is framed from chest up, facing camera or three-quarter camera. The subject's mouth, lips, jawline, and lower face must be fully visible and unobstructed for lip-sync animation. Do not place hands, phones, microphones, cups, toothbrushes, collars, shadows, or props in front of the mouth. If the subject holds a phone, the phone is pressed to the ear only, not covering the cheek or mouth. Natural speaking posture, clear facial features, expressive eyes. Include relevant VoidZero, Vite, Cloudflare, Vitest, Rolldown, or Oxc iconography as environmental design elements, not as pasted stickers. No subtitles, no watermark.`;

const segments = [
  {
    slug: "01-james-wakeup-phone",
    speaker: "james",
    style: "style-01",
    refs: [
      join(jamesAssets, "Screen Shot 2026-06-01 at 13.48.47@2x.jpg"),
      join(jamesAssets, "Screen Shot 2026-06-01 at 13.49.14@2x.jpg"),
    ],
    prompt: `James is in a dark command-center room lit by monitors, holding a phone to his ear while speaking urgently but casually. His mouth is fully visible. Screens behind him show abstract VoidZero rings, Vite lightning, and Cloudflare-orange signal traces. Artistic, high-contrast, tech-noir style, not photorealistic.`,
  },
  {
    slug: "01-zeke-bed-phone",
    speaker: "zeke",
    style: "style-01",
    refs: [join(zekeAssets, "ziki.jpg"), join(zekeAssets, "zeke-lava-lamps.jpg")],
    prompt: `Zeke is sitting up in bed, sleepy and rumpled, holding a phone to his ear while speaking. His mouth is fully visible. The bedroom is surreal and softly lit, built inside a terminal window, with blankets shaped like folded code blocks. A tiny Vite lightning icon glows like an alarm clock. Artistic, cozy, slightly absurd.`,
  },
  {
    slug: "02-james-matrix-news",
    speaker: "james",
    style: "style-02",
    refs: [
      join(jamesAssets, "Screen Shot 2026-06-01 at 13.49.41@2x.jpg"),
      join(jamesAssets, "Screen Shot 2026-06-01 at 13.49.58@2x.jpg"),
    ],
    prompt: `James is plugged into a glowing wall of code like a tech operator in the Matrix, wearing a headset but no microphone near the mouth. His mouth is fully visible. Around him, VoidZero, Vite, Vitest, Rolldown, Oxc, and Vite+ icons orbit as clean abstract interface elements. Cloudflare-orange data streams run through the scene. Artistic cyberpunk editorial style.`,
  },
  {
    slug: "02-zeke-bathroom-robe",
    speaker: "zeke",
    style: "style-02",
    refs: [join(zekeAssets, "zeke-orange-hat.jpg"), join(zekeAssets, "zeko.jpg")],
    prompt: `Zeke is in a bathroom wearing a robe, holding a toothbrush down at chest level, not near his mouth. His mouth is fully visible. He looks half-awake in the mirror, phone on the counter on speaker mode. Reflections in the bathroom mirror show a faint VoidZero glyph and Vite lightning. Soft morning light, humorous but understated, artistic illustration style.`,
  },
  {
    slug: "03-james-open-source-laptop",
    speaker: "james",
    style: "style-03",
    refs: [
      join(jamesAssets, "Screen Shot 2026-06-01 at 13.50.59@2x.jpg"),
      join(jamesAssets, "Screen Shot 2026-06-01 at 13.51.12@2x.jpg"),
    ],
    prompt: `James is at a laptop surrounded by floating terminal panes and open-source issue threads, calm and focused. His mouth is fully visible. Behind him is a stained-glass-like civic hall made of code, with the Vite lightning symbol in the center and many open doors leading outward to different platforms. Artistic public-infrastructure mood.`,
  },
  {
    slug: "03-zeke-kitchen-coffee",
    speaker: "zeke",
    style: "style-03",
    refs: [join(zekeAssets, "zeke-outdoor-selfie.jpg"), join(zekeAssets, "zeke-wilder-shirt.jpg")],
    prompt: `Zeke is in the kitchen pouring coffee into a mug, but the mug is low and not covering his mouth. His mouth is fully visible. He looks more awake now. Steam from the coffee forms tiny Vite lightning bolts and open-source symbols. Morning kitchen, warm light, subtle comedy, painterly style.`,
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

async function uploadLocalImage(path) {
  const bytes = await readFile(path);
  const form = new FormData();
  form.set("content", new Blob([bytes], { type: "image/jpeg" }), basename(path));
  form.set("metadata", new Blob([JSON.stringify({ source: path })], { type: "application/json" }));
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

async function createPrediction(segment, imageInput) {
  return api("/models/google/nano-banana-2/predictions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: {
        prompt: `${globalPrompt}\n\n${segment.prompt}`,
        image_input: imageInput,
        aspect_ratio: "16:9",
        resolution: "1K",
        output_format: "jpg",
      },
    }),
  });
}

async function download(url, path) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Could not download ${url}: ${response.status} ${response.statusText}`);
  await finished(Readable.fromWeb(response.body).pipe(createWriteStream(path)));
}

await mkdir(outDir, { recursive: true });

const uploadCache = new Map();
async function cachedUpload(path) {
  if (!uploadCache.has(path)) uploadCache.set(path, uploadLocalImage(path));
  return uploadCache.get(path);
}

console.log("Uploading local person references...");
for (const segment of segments) {
  await Promise.all(segment.refs.map(cachedUpload));
}

console.log(`Creating ${segments.length} Nano Banana predictions...`);
const jobs = await Promise.all(
  segments.map(async (segment) => {
    const personUrls = await Promise.all(segment.refs.map(cachedUpload));
    const imageInput = [...personUrls, styleRefs[segment.style]];
    const prediction = await createPrediction(segment, imageInput);
    console.log(`${segment.slug}: ${prediction.id}`);
    return { segment, prediction, status: prediction.status };
  }),
);

const manifest = {
  createdAt: new Date().toISOString(),
  model: "google/nano-banana-2",
  jobs: jobs.map(({ segment, prediction }) => ({
    slug: segment.slug,
    speaker: segment.speaker,
    style: segment.style,
    id: prediction.id,
    status: prediction.status,
    webUrl: prediction.urls?.web,
  })),
};

await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

const pending = new Map(jobs.map((job) => [job.prediction.id, job]));
while (pending.size > 0) {
  await new Promise((resolve) => setTimeout(resolve, 5000));
  for (const job of Array.from(pending.values())) {
    const latest = await api(`/predictions/${job.prediction.id}`);
    const entry = manifest.jobs.find((item) => item.id === latest.id);
    entry.status = latest.status;
    if (latest.status === "succeeded") {
      const outputUrl = Array.isArray(latest.output) ? latest.output[0] : latest.output;
      const extension = extname(new URL(outputUrl).pathname) || ".jpg";
      const filename = `${job.segment.slug}__${latest.id}${extension}`;
      const outputPath = join(outDir, filename);
      await download(outputUrl, outputPath);
      entry.outputUrl = outputUrl;
      entry.outputFile = outputPath;
      entry.metrics = latest.metrics;
      pending.delete(latest.id);
      console.log(`saved ${filename}`);
    } else if (["failed", "canceled", "aborted"].includes(latest.status)) {
      entry.error = latest.error;
      pending.delete(latest.id);
      console.log(`${latest.status} ${latest.id}: ${latest.error}`);
    } else {
      console.log(`${latest.status} ${latest.id}`);
    }
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`manifest ${manifestPath}`);
