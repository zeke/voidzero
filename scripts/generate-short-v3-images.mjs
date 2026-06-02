import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";

const token = process.env.REPLICATE_API_TOKEN;
if (!token) throw new Error("REPLICATE_API_TOKEN is not set");

const root = new URL("..", import.meta.url).pathname;
const outDir = join(root, "data", "candidates", "05-short-v3");
const siteDir = join(root, "site");
const galleryPath = join(siteDir, "short-v3.html");
const manifestPath = join(outDir, "manifest.json");
const zekeAssets = join(root, "assets", "zeke");
const jamesAssets = join(root, "jamesquickfake");

const styles = [
  ["style-14", "https://lh3.googleusercontent.com/pw/AP1GczP1ITFMPXtiUW9dxLrT_7lmtRqT6J-0_l0uvmyDXFaOYng-cVysUfcZTtWLT3t9g4YNeg7R9fs_UyGSZxh742wBtY0dcwx_OlWzMJMQsZGmT8E17Gn8=s1600-no"],
  ["style-15", "https://lh3.googleusercontent.com/pw/AP1GczNm_HdGaWDPqXuIZocAKwlC_frXzD4UJgM5X_2LfwUQYlpbZR6G1rPUX5fnPV5jaQp_g3Cr8LOuGZRIfpxWy8i5EAdnypKuyW3KlkhkoiiSWZFHwYTg=s1600-no"],
  ["style-16", "https://lh3.googleusercontent.com/pw/AP1GczMtt3H2lVxN5hZBxplglHRhFFVG0lz_A3ZZulb2XDAzY1vUwJQ9wEwxLkwshwcGVRzpH9U-0Dlp04iwyv-jz6Wa8hwH5n0ZsfqH1tjOrEGkYXfKDGp5=s1600-no"],
  ["style-17", "https://lh3.googleusercontent.com/pw/AP1GczOdlrf1pv206dtOMXKIc0LF7kZHRinxHMQFLm69t5rawz25b6yi2_sV-Osy_FzTTgj64GMROz2o_ADHbupMhZSaiVbw8X0OMIrX9h-IesFsZWKiZn3L=s1600-no"],
  ["style-18", "https://lh3.googleusercontent.com/pw/AP1GczNbEFUmlaQL36xVdhkKocnAGbWsjbp9V2u0eLw2YNobDiTW3xs0Q3-A4QPR-l1VOQlOLXfkTEun82dUBC6GyyJaAkShB7L15OB8WlCqcAXud-l3qE3S=s1600-no"],
].map(([name, url]) => ({ name, url }));

const jamesRefs = [
  join(jamesAssets, "Screen Shot 2026-06-01 at 13.48.47@2x.jpg"),
  join(jamesAssets, "Screen Shot 2026-06-01 at 13.49.14@2x.jpg"),
  join(jamesAssets, "Screen Shot 2026-06-01 at 13.50.59@2x.jpg"),
  join(jamesAssets, "Screen Shot 2026-06-01 at 13.51.12@2x.jpg"),
];

const zekeRefs = [
  join(zekeAssets, "ziki.jpg"),
  join(zekeAssets, "zeke-lava-lamps.jpg"),
  join(zekeAssets, "zeke-outdoor-selfie.jpg"),
  join(zekeAssets, "zeke-wilder-shirt.jpg"),
];

const globalPrompt = `Create a 16:9 artistic talking-head portrait for a deepfake announcement video. Use person reference images only for identity. Preserve recognizable face shape, hair, beard, glasses, age, and expression. Use the style reference image for palette, texture, abstraction, and mark-making. Make it feel like finished editorial art, not a photo. The subject is framed chest-up, facing camera or three-quarter camera. The subject's mouth, lips, jawline, and lower face must be fully visible and unobstructed for lip-sync animation. Do not place hands, phones, microphones, cups, toothbrushes, collars, blankets, shadows, or props in front of the mouth. If holding a phone, the phone is pressed to the ear only and does not cover the cheek or mouth. If holding coffee or a toothbrush, keep it low in frame, far below the mouth. Natural speaking posture, clear facial features, expressive eyes. Keep branding subtle: no large logos, no logo walls, no product ad feeling, no readable brand text unless explicitly requested. It is okay to include one tiny abstract lightning shape, soft orange glow, terminal motif, cable motif, or circular void motif as environmental texture. No subtitles, no watermark.`;

const scenes = [
  {
    slug: "01-james-predawn-desk",
    title: "1A. James: pre-dawn desk",
    speaker: "James",
    line: "Wake up babe. VoidZero just joined Cloudflare.",
    refs: jamesRefs,
    prompt: `James is at his home desk before sunrise, already fully awake, holding a phone to his ear while speaking. Laptop open, a few monitors glow softly, coffee mug off to the side. The room feels like a nerdy morning command center, human and lived-in, not corporate. Subtle cables, dim desk lamp, minimal branding.`,
  },
  {
    slug: "01-zeke-bed-phone",
    title: "1B. Zeke: waking up",
    speaker: "Zeke",
    line: "Hey James. Good morning. You mean the veet guys? And why are you calling me babe?",
    refs: zekeRefs,
    prompt: `Zeke is sitting up in bed, sleepy and rumpled, holding a phone to his ear while speaking. The bedroom is surreal and softly lit, built inside a terminal-window shape, with blankets like folded code blocks. A tiny lightning-shaped alarm light glows on the nightstand. Cozy, slightly absurd, minimal branding.`,
  },
  {
    slug: "02-james-kitchen-laptops",
    title: "2A. James: kitchen multitask",
    speaker: "James",
    line: "Sorry, I just got excited. Yes, the veet people. Veet, Veet test, Rolldown, Oxc, Veet plus, the whole team.",
    refs: jamesRefs,
    prompt: `James is in his kitchen making coffee while two laptops and a tablet run abstract terminal dashboards on the counter. Cables snake between coffee gear and devices in a slightly absurd but tidy way. He looks excited and caffeinated. Coffee pot and mugs are low in the frame, never blocking his mouth. No large logos.`,
  },
  {
    slug: "02-zeke-bathroom-toothbrush",
    title: "2B. Zeke: brushing teeth",
    speaker: "Zeke",
    line: "Huh. That’s actually big. Huh.",
    refs: zekeRefs,
    prompt: `Zeke is in a bathroom wearing a robe, facing camera directly, still waking up. He holds a toothbrush low at chest level, far from his mouth. His mouth is fully visible. A phone sits on the counter on speaker mode. Soft morning light, understated humor, no heavy branding.`,
  },
  {
    slug: "03-james-standing-desk",
    title: "3A. James: standing desk verify",
    speaker: "James",
    line: "The main thing they’re saying is: veet stays veet. MIT licensed, open source, vendor agnostic, community driven.",
    refs: jamesRefs,
    prompt: `James is at a standing desk in a brightening morning room, calmly reviewing abstract open-source repo health on a large monitor. The screen uses non-readable issue cards, commit dots, and community node diagrams. His posture is focused, less chaotic than before. Minimal branding, no readable product text.`,
  },
  {
    slug: "03-zeke-kitchen-coffee",
    title: "3B. Zeke: pouring coffee",
    speaker: "Zeke",
    line: "Good. Because the fastest way to make JavaScript people nervous is to touch their build tool.",
    refs: zekeRefs,
    prompt: `Zeke is in the kitchen pouring coffee into a mug placed low in the frame, far below his mouth. His mouth is fully visible. He looks more awake now, but still slow. Steam from the coffee forms tiny abstract lightning and open-source-like symbols. Morning kitchen, warm light, subtle comedy, minimal branding.`,
  },
  {
    slug: "04-james-train-laptop",
    title: "4A. James: nerdy commute",
    speaker: "James",
    line: "Veet is kind of the shared road now. Vue, SvelteKit, Nuxt, Astro, Solid, Qwik, Angular, React Router, TanStack Start, a lot of people are building on it.",
    refs: jamesRefs,
    prompt: `James is seated on a quiet morning train with a laptop open, looking engaged and animated. Outside the window, abstract transit lines and city routes blur by. The laptop shows a clean symbolic route map with many paths sharing one fast corridor, no readable text. Human, nerdy morning commute, minimal branding.`,
  },
  {
    slug: "04-zeke-garden-coffee",
    title: "4B. Zeke: garden coffee",
    speaker: "Zeke",
    line: "Right. Not the same framework. Just the same road. Ideally one without potholes made of Webpack config.",
    refs: zekeRefs,
    prompt: `Zeke is sitting in a serene indoor plant garden with coffee held low and away from his face. His mouth is fully visible. Vines, roots, and stepping stones form a subtle path network through the garden. One tiny lightning-shaped garden lantern glows in the soil. Calm, green, awake enough to joke.`,
  },
  {
    slug: "05-james-coworking-fund",
    title: "5A. James: community table",
    speaker: "James",
    line: "And they’re putting a million dollars into the veet ecosystem fund. Not a swag budget. Actual maintainer support, run by the veet core team.",
    refs: jamesRefs,
    prompt: `James is at a warm coworking table in the morning, laptop open, surrounded by signs of community work: notebooks, pull-request sketches, coffee cups, sticky notes, and a few empty chairs for collaborators. Thin glowing lines subtly connect notes and laptops like support flowing through a community. No corporate ad feeling.`,
  },
  {
    slug: "05-zeke-garden-awake",
    title: "5B. Zeke: awake in garden",
    speaker: "Zeke",
    line: "A million dollars for maintainers. Okay, now I’m awake.",
    refs: zekeRefs,
    prompt: `Zeke sits in the same peaceful plant garden, now clearly awake. Coffee rests low in his hands, far below the mouth. His mouth is fully visible. Healthy plants are supported by small stakes, trellises, and warm sunlight, a metaphor for maintained open source. Gentle impressed expression, minimal branding.`,
  },
  {
    slug: "06-james-daylight-desk",
    title: "6A. James: daylight wrap",
    speaker: "James",
    line: "That’s the opportunity: keep veet portable, make Cloudflare’s app tooling feel more like veet, and build better primitives for full-stack apps and agents.",
    refs: jamesRefs,
    prompt: `James is back at his desk in full morning daylight, calmer now, leaning back slightly with a satisfied look. Monitors are no longer chaotic, just a clean calm glow with abstract app and agent diagrams, no readable labels. Coffee cup, keyboard, and cables remain, but the morning incident feels resolved.`,
  },
  {
    slug: "06-zeke-garden-finale",
    title: "6B. Zeke: garden finale",
    speaker: "Zeke",
    line: "Great. The coffee is kicking in, our precious build tools are safe, and I'm your babe. Not a bad start to the day.",
    refs: zekeRefs,
    prompt: `Zeke sits relaxed in the garden, fully awake, mouth fully visible, coffee low in frame. He has a dry knowing smile, as if landing a callback joke. Morning sunlight, calm plants, one tiny lightning-shaped garden ornament, no large logos, no text. Warm final-shot energy.`,
  },
];

async function api(path, options = {}) {
  const response = await fetch(`https://api.replicate.com/v1${path}`, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers ?? {}) } });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(body)}`);
  return body;
}

async function upload(path) {
  const form = new FormData();
  form.set("content", new Blob([await readFile(path)], { type: "image/jpeg" }), basename(path));
  const response = await fetch("https://api.replicate.com/v1/files", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(body)}`);
  return body.urls.get;
}

async function download(url, path) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Could not download ${url}: ${response.status} ${response.statusText}`);
  await finished(Readable.fromWeb(response.body).pipe(createWriteStream(path)));
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

async function writeGallery(manifest) {
  const body = scenes.map((scene) => {
    const variants = manifest.jobs.filter((job) => job.sceneSlug === scene.slug && job.outputFile);
    return `<section><h2>${escapeHtml(scene.title)}</h2><p><strong>${escapeHtml(scene.speaker)}:</strong> ${escapeHtml(scene.line)}</p><div class="grid">${variants.map((variant) => {
      const src = relative(siteDir, variant.outputFile).replaceAll("\\", "/");
      return `<label class="card"><img src="${escapeHtml(src)}" /><div><input type="radio" name="${escapeHtml(scene.slug)}" value="${escapeHtml(variant.filename)}"> ${escapeHtml(variant.style)}<br><code>${escapeHtml(variant.id)}</code></div></label>`;
    }).join("")}</div></section>`;
  }).join("");
  await writeFile(galleryPath, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VoidZero Short v3 Images</title><style>:root{color-scheme:dark;font-family:system-ui;background:#08060d;color:white}body{margin:0;padding:32px;background:radial-gradient(circle at top left,#24202e,#08060d 420px)}h1{margin:0 0 8px}.intro{color:#bbb}.toolbar{position:sticky;top:0;background:rgba(8,6,13,.9);backdrop-filter:blur(12px);padding:12px 0;border-bottom:1px solid #292432;z-index:1}section{margin:36px 0}p{color:#ccc;max-width:980px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}.card{display:block;background:#131018;border:2px solid #302a3a;border-radius:14px;overflow:hidden;cursor:pointer}.card:has(input:checked){border-color:#ff7a1a;box-shadow:0 0 0 2px rgba(255,122,26,.25)}img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}.card div{padding:10px 12px;color:#ddd}code{font-size:12px;color:#ffb86b;word-break:break-all}button{border:0;border-radius:999px;padding:10px 14px;background:#ff7a1a;color:#08060d;font-weight:700}pre{background:#131018;border:1px solid #302a3a;border-radius:14px;padding:14px;white-space:pre-wrap}</style></head><body><h1>VoidZero Short v3 Images</h1><p class="intro">Morning routine, but nerdier. Pick one image per shot.</p><div class="toolbar"><button id="copy">Copy selections JSON</button></div>${body}<h2>Selections</h2><pre id="selections">{}</pre><script>const key='voidzero-short-v3-image-selections';const state=JSON.parse(localStorage.getItem(key)||'{}');for(const [name,value] of Object.entries(state)){const input=document.querySelector('input[name="'+CSS.escape(name)+'"][value="'+CSS.escape(value)+'"]');if(input)input.checked=true}function render(){const selections={};document.querySelectorAll('input[type="radio"]:checked').forEach(input=>selections[input.name]=input.value);localStorage.setItem(key,JSON.stringify(selections,null,2));document.querySelector('#selections').textContent=JSON.stringify(selections,null,2)}document.addEventListener('change',render);document.querySelector('#copy').addEventListener('click',async()=>navigator.clipboard.writeText(document.querySelector('#selections').textContent));render()</script></body></html>`);
}

await mkdir(outDir, { recursive: true });
await mkdir(siteDir, { recursive: true });

const uploadCache = new Map();
async function cachedUpload(path) {
  if (!uploadCache.has(path)) uploadCache.set(path, upload(path));
  return uploadCache.get(path);
}

console.log("Uploading person refs...");
await Promise.all([...new Set(scenes.flatMap((scene) => scene.refs))].map(cachedUpload));

const desired = scenes.flatMap((scene) => styles.map((style) => ({ scene, style })));
const manifest = { createdAt: new Date().toISOString(), model: "google/nano-banana-2", jobs: [] };
console.log(`Creating ${desired.length} predictions...`);
const jobs = await Promise.all(desired.map(async ({ scene, style }) => {
  const imageInput = [...await Promise.all(scene.refs.map(cachedUpload)), style.url];
  const prediction = await api("/models/google/nano-banana-2/predictions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: { prompt: `${globalPrompt}\n\n${scene.prompt}\n\nApply ${style.name} strongly from the style reference image. Do not copy the reference image subjects or objects.`, image_input: imageInput, aspect_ratio: "16:9", resolution: "1K", output_format: "jpg" } }) });
  const job = { sceneSlug: scene.slug, sceneTitle: scene.title, speaker: scene.speaker, line: scene.line, style: style.name, id: prediction.id, status: prediction.status, webUrl: prediction.urls?.web };
  manifest.jobs.push(job);
  console.log(`${scene.slug} ${style.name}: ${prediction.id}`);
  return { scene, style, prediction, job };
}));
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

const pending = new Map(jobs.map((job) => [job.prediction.id, job]));
while (pending.size) {
  await new Promise((resolve) => setTimeout(resolve, 5000));
  await Promise.all([...pending.values()].map(async (job) => {
    const latest = await api(`/predictions/${job.prediction.id}`);
    job.job.status = latest.status;
    if (latest.status === "succeeded") {
      const output = Array.isArray(latest.output) ? latest.output[0] : latest.output;
      const extension = extname(new URL(output).pathname) || ".jpg";
      const filename = `${job.scene.slug}__${job.style.name}__${latest.id}${extension}`;
      const outputFile = join(outDir, filename);
      await download(output, outputFile);
      Object.assign(job.job, { outputUrl: output, outputFile, filename, metrics: latest.metrics });
      pending.delete(latest.id);
      console.log(`saved ${filename}`);
    } else if (["failed", "canceled", "aborted"].includes(latest.status)) {
      job.job.error = latest.error;
      pending.delete(latest.id);
      console.log(`${latest.status} ${latest.id}: ${latest.error}`);
    } else {
      console.log(`${latest.status} ${latest.id}`);
    }
  }));
  manifest.jobs.sort((a, b) => a.sceneSlug.localeCompare(b.sceneSlug) || a.style.localeCompare(b.style));
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

manifest.jobs.sort((a, b) => a.sceneSlug.localeCompare(b.sceneSlug) || a.style.localeCompare(b.style));
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
await writeGallery(manifest);
console.log(`manifest ${manifestPath}`);
console.log(`gallery ${galleryPath}`);
