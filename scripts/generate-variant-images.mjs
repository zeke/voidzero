import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";

const token = process.env.REPLICATE_API_TOKEN;
if (!token) throw new Error("REPLICATE_API_TOKEN is not set");

const root = new URL("..", import.meta.url).pathname;
const outDir = join(root, "data", "candidates", "02-variants");
const siteDir = join(root, "site");
const manifestPath = join(outDir, "manifest.json");
const galleryPath = join(siteDir, "index.html");

const zekeAssets = join(root, "assets", "zeke");
const jamesAssets = join(root, "jamesquickfake");

const styleRefs = [
  {
    name: "style-04",
    url: "https://lh3.googleusercontent.com/pw/AP1GczMZmxgTc-JdyH_3QDbl5H-H2kOKQJxuGlH9cAoIACjSNaTq8gqoxYYivjaxg9hAfOl7L1TX9rrICfcj-OCX9KNBco-KLkcAqKjS20WpDYV3OUJLbzaE=s1600-no",
  },
  {
    name: "style-05",
    url: "https://lh3.googleusercontent.com/pw/AP1GczM9NQo-Kfji5iwgFhK63l5xRxklPeTUyP_TOxalJDK0bZ8IahpL_JHwIP-7k5Y77YRBI3Vs0YDO3rASWjpMqkYZ0mTlTDfJhkL67oWB_tQaBvV6Jvlh=s1600-no",
  },
  {
    name: "style-06",
    url: "https://lh3.googleusercontent.com/pw/AP1GczN-6Z0uixMQTQhecailww8Kaw6s90RpqHA6u7zQn7tUL00UbfuUoVJSXhptvxzh_MNthH29RVQ9gHmiPDTOxDQM5xvn3tILrfgKqN8CGUzKW06SUJWf=s1600-no",
  },
  {
    name: "style-07",
    url: "https://lh3.googleusercontent.com/pw/AP1GczPW_YmLE7qbFhPGFsqDGCW1lvFQvzLrbcuw6DKCqC7BVePNva1oHJpTV3XCJXTKuN1CfmhRkCq6Dtt-jTK_ENWlmGqZwKzkSsBN-2i6DRnUlZ2p0cAt=s1600-no",
  },
  {
    name: "style-08",
    url: "https://lh3.googleusercontent.com/pw/AP1GczNqPMVPAWvaSJN7LWBgQsKlA7i4j3Ee8QNkMWUU2nixfYb_mOZGtZunPckB9fNPpxE6JOgx2tKiMQDRKKIG4866X_L83JJL_rUcnjMmBmQcjXDMzD5-=s1600-no",
  },
];

const globalPrompt = `Create a 16:9 artistic talking-head portrait for a deepfake announcement video. Use the person reference images only for identity. Preserve recognizable face shape, hair, beard, glasses, age, and expression. Use the style reference image for palette, texture, abstraction, and mark-making. Make it feel like finished editorial art, not a photo. The subject is framed from chest up, facing camera or three-quarter camera. The subject's mouth, lips, jawline, and lower face must be fully visible and unobstructed for lip-sync animation. Do not place hands, phones, microphones, cups, toothbrushes, collars, shadows, or props in front of the mouth. If the subject holds a phone, the phone is pressed to the ear only, not covering the cheek or mouth. Natural speaking posture, clear facial features, expressive eyes. Include relevant VoidZero, Vite, Cloudflare, Vitest, Rolldown, or Oxc iconography as environmental design elements, not as pasted stickers. No subtitles, no watermark.`;

const scenes = [
  {
    slug: "01-james-wakeup-phone",
    title: "1A. James: wake-up phone call",
    speaker: "James",
    line: "Hey Zeke, wake up. Did you see the VoidZero news?",
    refs: [
      join(jamesAssets, "Screen Shot 2026-06-01 at 13.48.47@2x.jpg"),
      join(jamesAssets, "Screen Shot 2026-06-01 at 13.49.14@2x.jpg"),
      join(jamesAssets, "Screen Shot 2026-06-01 at 13.50.59@2x.jpg"),
    ],
    prompt: `James is in a dark command-center room lit by monitors, holding a phone to his ear while speaking urgently but casually. His mouth is fully visible. Screens behind him show abstract VoidZero rings, Vite lightning, and Cloudflare-orange signal traces. Artistic, high-contrast, tech-noir style, not photorealistic.`,
  },
  {
    slug: "01-zeke-bed-phone",
    title: "1B. Zeke: sleepy in bed",
    speaker: "Zeke",
    line: "James. It is very early. VoidZero, like Vite VoidZero?",
    refs: [join(zekeAssets, "ziki.jpg"), join(zekeAssets, "zeke-lava-lamps.jpg")],
    prompt: `Zeke is sitting up in bed, sleepy and rumpled, holding a phone to his ear while speaking. His mouth is fully visible. The bedroom is surreal and softly lit, built inside a terminal window, with blankets shaped like folded code blocks. A tiny Vite lightning icon glows like an alarm clock. Artistic, cozy, slightly absurd.`,
  },
  {
    slug: "02-james-matrix-news",
    title: "2A. James: VoidZero joins Cloudflare",
    speaker: "James",
    line: "VoidZero is joining Cloudflare. The whole team. Vite, Vitest, Rolldown, Oxc, Vite+, all of it.",
    refs: [
      join(jamesAssets, "Screen Shot 2026-06-01 at 13.49.41@2x.jpg"),
      join(jamesAssets, "Screen Shot 2026-06-01 at 13.49.58@2x.jpg"),
      join(jamesAssets, "Screen Shot 2026-06-01 at 13.51.12@2x.jpg"),
    ],
    prompt: `James is plugged into a glowing wall of code like a tech operator in the Matrix, wearing a headset but no microphone near the mouth. His mouth is fully visible. Around him, VoidZero, Vite, Vitest, Rolldown, Oxc, and Vite+ icons orbit as clean abstract interface elements. Cloudflare-orange data streams run through the scene. Artistic cyberpunk editorial style.`,
  },
  {
    slug: "02-zeke-bathroom-robe",
    title: "2B. Zeke: robe in bathroom",
    speaker: "Zeke",
    line: "Huh. That’s actually big. I’m going to need the strong coffee for this one.",
    refs: [join(zekeAssets, "zeke-orange-hat.jpg"), join(zekeAssets, "zeko.jpg")],
    prompt: `Zeke is in a bathroom wearing a robe, facing camera directly, holding a toothbrush down at chest level, not near his mouth. His mouth is fully visible. He looks half-awake. A phone sits on the counter on speaker mode. A faint VoidZero glyph and Vite lightning appear as mirror reflections in the background. Soft morning light, humorous but understated, artistic illustration style.`,
  },
  {
    slug: "03-james-open-source-laptop",
    title: "3A. James: Vite stays Vite",
    speaker: "James",
    line: "The main thing they’re saying is: Vite stays Vite. MIT licensed, open source, vendor-agnostic, community-driven.",
    refs: [
      join(jamesAssets, "Screen Shot 2026-06-01 at 13.50.59@2x.jpg"),
      join(jamesAssets, "Screen Shot 2026-06-01 at 13.51.12@2x.jpg"),
      join(jamesAssets, "Screen Shot 2026-06-01 at 13.49.14@2x.jpg"),
    ],
    prompt: `James is at a laptop surrounded by floating terminal panes and open-source issue threads, calm and focused. His mouth is fully visible. Behind him is a stained-glass-like civic hall made of code, with the Vite lightning symbol in the center and many open doors leading outward to different platforms. Artistic public-infrastructure mood.`,
  },
  {
    slug: "03-zeke-kitchen-coffee",
    title: "3B. Zeke: kitchen coffee",
    speaker: "Zeke",
    line: "Good. Because the fastest way to make JavaScript people nervous is to touch their build tool.",
    refs: [join(zekeAssets, "zeke-outdoor-selfie.jpg"), join(zekeAssets, "zeke-wilder-shirt.jpg")],
    prompt: `Zeke is in the kitchen pouring coffee into a mug placed low in the frame, far below his mouth. His mouth is fully visible. He looks more awake now. Steam from the coffee forms tiny Vite lightning bolts and open-source symbols. Morning kitchen, warm light, subtle comedy, painterly style.`,
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

async function createPrediction({ scene, style, imageInput }) {
  return api("/models/google/nano-banana-2/predictions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: {
        prompt: `${globalPrompt}\n\n${scene.prompt}\n\nApply this specific art style strongly: ${style.name}. Use the style reference image as the visual art direction, but do not copy its subjects or objects.`,
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

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function writeGallery(manifest) {
  const groups = scenes.map((scene) => ({
    scene,
    variants: manifest.jobs.filter((job) => job.sceneSlug === scene.slug && job.outputFile),
  }));

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>VoidZero Zekefake Image Picker</title>
  <style>
    :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #08060d; color: #fff; }
    body { margin: 0; padding: 32px; background: radial-gradient(circle at top left, #222 0, #08060d 420px); }
    h1 { margin: 0 0 8px; font-size: 28px; }
    .intro { color: #bbb; margin: 0 0 28px; }
    section { margin: 0 0 44px; }
    h2 { font-size: 20px; margin: 0 0 4px; }
    .line { color: #cfcfcf; margin: 0 0 16px; max-width: 900px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
    label.card { display: block; border: 2px solid #2d2a34; border-radius: 14px; overflow: hidden; background: #121017; cursor: pointer; transition: border-color 120ms, transform 120ms; }
    label.card:hover { transform: translateY(-2px); border-color: #777; }
    label.card:has(input:checked) { border-color: #ff7a1a; box-shadow: 0 0 0 2px rgba(255,122,26,.25); }
    img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; background: #000; }
    .meta { padding: 10px 12px 12px; font-size: 13px; color: #ccc; }
    .meta strong { color: #fff; }
    input { margin-right: 8px; }
    code { color: #ffb86b; font-size: 12px; word-break: break-all; }
    .toolbar { position: sticky; top: 0; z-index: 2; background: rgba(8,6,13,.9); backdrop-filter: blur(12px); padding: 12px 0 18px; margin-bottom: 10px; border-bottom: 1px solid #27232f; }
    button { border: 0; border-radius: 999px; padding: 10px 14px; background: #ff7a1a; color: #08060d; font-weight: 700; cursor: pointer; }
    pre { white-space: pre-wrap; background: #121017; border: 1px solid #2d2a34; border-radius: 14px; padding: 14px; color: #ddd; }
  </style>
</head>
<body>
  <h1>VoidZero Zekefake Image Picker</h1>
  <p class="intro">Pick one variant per scene. Choices are stored in this browser and shown as JSON at the bottom.</p>
  <div class="toolbar"><button id="copy">Copy selections JSON</button></div>
  ${groups
    .map(
      ({ scene, variants }) => `<section>
        <h2>${escapeHtml(scene.title)}</h2>
        <p class="line"><strong>${escapeHtml(scene.speaker)}:</strong> ${escapeHtml(scene.line)}</p>
        <div class="grid">
          ${variants
            .map((variant) => {
              const imagePath = relative(siteDir, variant.outputFile).replaceAll("\\", "/");
              return `<label class="card">
                <img src="${escapeHtml(imagePath)}" alt="${escapeHtml(variant.filename)}" />
                <div class="meta">
                  <div><input type="radio" name="${escapeHtml(scene.slug)}" value="${escapeHtml(variant.filename)}" /> <strong>${escapeHtml(variant.style)}</strong></div>
                  <code>${escapeHtml(variant.id)}</code>
                </div>
              </label>`;
            })
            .join("\n")}
        </div>
      </section>`,
    )
    .join("\n")}
  <h2>Selections</h2>
  <pre id="selections">{}</pre>
  <script>
    const key = "voidzero-image-selections";
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    for (const [name, value] of Object.entries(state)) {
      const input = document.querySelector('input[name="' + CSS.escape(name) + '"][value="' + CSS.escape(value) + '"]');
      if (input) input.checked = true;
    }
    function render() {
      const selections = {};
      document.querySelectorAll('input[type="radio"]:checked').forEach((input) => selections[input.name] = input.value);
      localStorage.setItem(key, JSON.stringify(selections, null, 2));
      document.querySelector('#selections').textContent = JSON.stringify(selections, null, 2);
    }
    document.addEventListener('change', render);
    document.querySelector('#copy').addEventListener('click', async () => {
      await navigator.clipboard.writeText(document.querySelector('#selections').textContent);
    });
    render();
  </script>
</body>
</html>`;
  await writeFile(galleryPath, html);
}

await mkdir(outDir, { recursive: true });
await mkdir(siteDir, { recursive: true });

const uploadCache = new Map();
async function cachedUpload(path) {
  if (!uploadCache.has(path)) uploadCache.set(path, uploadLocalImage(path));
  return uploadCache.get(path);
}

console.log("Uploading local person references...");
await Promise.all([...new Set(scenes.flatMap((scene) => scene.refs))].map(cachedUpload));

const desired = scenes.flatMap((scene) => styleRefs.map((style) => ({ scene, style })));
let manifest = { createdAt: new Date().toISOString(), model: "google/nano-banana-2", jobs: [] };

console.log(`Creating ${desired.length} Nano Banana predictions...`);
const jobs = await Promise.all(
  desired.map(async ({ scene, style }) => {
    const personUrls = await Promise.all(scene.refs.map(cachedUpload));
    const prediction = await createPrediction({ scene, style, imageInput: [...personUrls, style.url] });
    console.log(`${scene.slug} ${style.name}: ${prediction.id}`);
    const job = {
      sceneSlug: scene.slug,
      sceneTitle: scene.title,
      speaker: scene.speaker,
      line: scene.line,
      style: style.name,
      id: prediction.id,
      status: prediction.status,
      webUrl: prediction.urls?.web,
    };
    manifest.jobs.push(job);
    return { scene, style, prediction, job };
  }),
);

await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

const pending = new Map(jobs.map((job) => [job.prediction.id, job]));
while (pending.size > 0) {
  await new Promise((resolve) => setTimeout(resolve, 5000));
  await Promise.all(
    Array.from(pending.values()).map(async (job) => {
      const latest = await api(`/predictions/${job.prediction.id}`);
      job.job.status = latest.status;
      if (latest.status === "succeeded") {
        const outputUrl = Array.isArray(latest.output) ? latest.output[0] : latest.output;
        const extension = extname(new URL(outputUrl).pathname) || ".jpg";
        const filename = `${job.scene.slug}__${job.style.name}__${latest.id}${extension}`;
        const outputPath = join(outDir, filename);
        await download(outputUrl, outputPath);
        Object.assign(job.job, {
          outputUrl,
          outputFile: outputPath,
          filename,
          metrics: latest.metrics,
        });
        pending.delete(latest.id);
        console.log(`saved ${filename}`);
      } else if (["failed", "canceled", "aborted"].includes(latest.status)) {
        job.job.error = latest.error;
        pending.delete(latest.id);
        console.log(`${latest.status} ${latest.id}: ${latest.error}`);
      } else {
        console.log(`${latest.status} ${latest.id}`);
      }
    }),
  );
  manifest.jobs.sort((a, b) => a.sceneSlug.localeCompare(b.sceneSlug) || a.style.localeCompare(b.style));
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

manifest.jobs.sort((a, b) => a.sceneSlug.localeCompare(b.sceneSlug) || a.style.localeCompare(b.style));
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
await writeGallery(manifest);
console.log(`manifest ${manifestPath}`);
console.log(`gallery ${galleryPath}`);
