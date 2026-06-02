import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";

const token = process.env.REPLICATE_API_TOKEN;
if (!token) throw new Error("REPLICATE_API_TOKEN is not set");

const root = new URL("..", import.meta.url).pathname;
const outDir = join(root, "data", "candidates", "04-remaining-v2");
const siteDir = join(root, "site");
const galleryPath = join(siteDir, "remaining-v2.html");
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
];
const zekeRefs = [join(zekeAssets, "ziki.jpg"), join(zekeAssets, "zeke-outdoor-selfie.jpg"), join(zekeAssets, "zeke-wilder-shirt.jpg")];

const globalPrompt = `Create a 16:9 artistic talking-head portrait for a deepfake announcement video. Use person reference images only for identity. Preserve recognizable face shape, hair, beard, glasses, age, and expression. Use the style reference image for palette, texture, abstraction, and mark-making. Make it feel like finished editorial art, not a photo. The subject is framed chest-up, facing camera or three-quarter camera. The subject's mouth, lips, jawline, and lower face must be fully visible and unobstructed for lip-sync animation. Do not place hands, phones, microphones, cups, toothbrushes, collars, shadows, or props in front of the mouth. Natural speaking posture, clear facial features, expressive eyes. Keep branding subtle: no large logos, no logo walls, no obvious product advertisements, no readable brand text unless explicitly requested. It is okay to include one tiny abstract lightning shape, soft orange glow, terminal motif, or circular void motif as environmental texture. No subtitles, no watermark.`;

const scenes = [
  {
    slug: "04-james-shared-foundation",
    title: "4A. James: shared foundation",
    speaker: "James",
    line: "Vite is kind of the shared road now. Vue, SvelteKit, Nuxt, Astro, Solid, Qwik, Angular, React Router, TanStack Start, a lot of people are building on it.",
    refs: jamesRefs,
    prompt: `James is in a quiet systems room, focused and plugged into several understated computers. Behind him is an abstract transit map made of thin colored lines converging on a bright central junction. The map suggests many frameworks sharing one fast route without showing readable names or big logos. Subtle technical depth, calm intensity, minimal branding.`,
  },
  {
    slug: "04-zeke-plant-garden",
    title: "4B. Zeke: plant garden",
    speaker: "Zeke",
    line: "Right. Not everyone use the same framework. More like, can we at least agree the road should be fast?",
    refs: zekeRefs,
    prompt: `Zeke has stepped into a serene indoor plant garden, holding coffee low at chest level, far below his mouth. His mouth is fully visible. Vines, roots, and stepping stones form a subtle network leading through the garden. A tiny lightning-shaped garden lantern glows in the soil. Calm, green, waking-up energy. No large logos.`,
  },
  {
    slug: "05-james-ecosystem-fund",
    title: "5A. James: ecosystem fund",
    speaker: "James",
    line: "Cloudflare is also putting one million dollars into a Vite ecosystem fund, run by the Vite core team.",
    refs: jamesRefs,
    prompt: `James sits at a workstation showing a tasteful abstract funding dashboard: small flowing lines, constellation dots, and issue-card shapes moving toward contributor silhouettes. The scene should feel like support for maintainers, not a corporate ad. Subtle warm orange rim light, one tiny lightning motif, no readable logos.`,
  },
  {
    slug: "05-zeke-maintainer-garden",
    title: "5B. Zeke: maintainer garden",
    speaker: "Zeke",
    line: "Paying maintainers. I like this part. We should make open source but with rent money a trend.",
    refs: zekeRefs,
    prompt: `Zeke stands in the same peaceful plant garden, more awake, holding pruning shears low at waist level far from his face. His mouth is fully visible. Healthy plants are supported by small stakes, trellises, and warm sunlight, a metaphor for maintained open source. Gentle humor in Zeke's expression. Minimal branding.`,
  },
  {
    slug: "06-james-workerd-lab",
    title: "6A. James: runtime lab",
    speaker: "James",
    line: "The Cloudflare part already makes sense technically. The Vite Environment API lets server code run somewhere other than Node during dev. Cloudflare built the Vite plugin on that, so your local code can run in workerd.",
    refs: jamesRefs,
    prompt: `James is deep in a clean runtime lab, hands near a keyboard, surrounded by holographic diagrams that show a local machine and edge runtime connected by a single glowing circuit. Use abstract shapes for databases, buckets, queues, and agents, not product logos. His mouth is fully visible. Immersive but restrained technical art.`,
  },
  {
    slug: "06-zeke-train-local-prod",
    title: "6B. Zeke: train platform",
    speaker: "Zeke",
    line: "So local dev gets closer to production without turning Vite into a Cloudflare-specific thing. That’s the important bit.",
    refs: zekeRefs,
    prompt: `Zeke is standing on a clean modern train platform, holding his phone at his side, not near his face. His mouth is fully visible. Two parallel trains arrive on matching tracks, one representing local development and one production, but avoid readable labels. The scene communicates alignment and portability through composition, not text.`,
  },
  {
    slug: "07-james-agent-loop",
    title: "7A. James: agent loop",
    speaker: "James",
    line: "And then there’s the agent angle. Agents run builds, tests, linters, formatters, CLIs, all day, on repeat. Fast feedback loops stop being nice-to-have.",
    refs: jamesRefs,
    prompt: `James is embedded in an abstract coding environment, surrounded by looping streams of build, test, lint, format, and deploy activity represented as symbols and motion trails, not readable product labels. Tiny agent silhouettes move through the loops like workers in a machine. His mouth is fully visible. Energetic, precise, minimal branding.`,
  },
  {
    slug: "07-zeke-agent-gym-platform",
    title: "7B. Zeke: agent gym",
    speaker: "Zeke",
    line: "Agents are basically developers who never get tired and have no emotional attachment to rerunning tests. Disturbing, but useful.",
    refs: zekeRefs,
    prompt: `Zeke stands on the train platform, fully awake, watching tiny robot agents running on small treadmills and carrying test checkmarks. The joke should read visually without text. His mouth is fully visible. Keep it polished and slightly absurd, not goofy. No large logos.`,
  },
  {
    slug: "08-james-fullstack-city",
    title: "8A. James: full-stack city",
    speaker: "James",
    line: "Longer term, this is about Vite becoming a better foundation for full-stack apps and agents, with provider-agnostic primitives. And Cloudflare moving its own app tooling toward Vite, not the other way around.",
    refs: jamesRefs,
    prompt: `James stands before an isometric miniature city of software systems: routes, APIs, jobs, queues, databases, storage, realtime, auth, agents, and AI represented as distinct buildings and roads. The city feels open and portable. A warm orange transit line approaches the city without enclosing it. His mouth is fully visible. No obvious logos.`,
  },
  {
    slug: "08-zeke-finale-platform-exit",
    title: "8B. Zeke: finale platform exit",
    speaker: "Zeke",
    line: "So Vite stays portable, Cloudflare gets easier, and the path is basically: keep the workflow developers already like. Also James? Still not babe.",
    refs: zekeRefs,
    prompt: `Zeke stands at the train platform exit, fully awake, mouth fully visible. Behind him, two sets of tracks merge toward a bright open city. The mood is casual, optimistic, and funny in a dry way. Zeke has a small knowing expression, as if ending the call with a joke. No readable commands, no big logos, no product-poster feeling.`,
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
  await writeFile(galleryPath, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Remaining VoidZero Images v2</title><style>:root{color-scheme:dark;font-family:system-ui;background:#08060d;color:white}body{margin:0;padding:32px;background:radial-gradient(circle at top left,#24202e,#08060d 420px)}h1{margin:0 0 8px}.intro{color:#bbb}.toolbar{position:sticky;top:0;background:rgba(8,6,13,.9);backdrop-filter:blur(12px);padding:12px 0;border-bottom:1px solid #292432}section{margin:36px 0}p{color:#ccc;max-width:980px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}.card{display:block;background:#131018;border:2px solid #302a3a;border-radius:14px;overflow:hidden;cursor:pointer}.card:has(input:checked){border-color:#ff7a1a;box-shadow:0 0 0 2px rgba(255,122,26,.25)}img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}.card div{padding:10px 12px;color:#ddd}code{font-size:12px;color:#ffb86b;word-break:break-all}button{border:0;border-radius:999px;padding:10px 14px;background:#ff7a1a;color:#08060d;font-weight:700}pre{background:#131018;border:1px solid #302a3a;border-radius:14px;padding:14px;white-space:pre-wrap}</style></head><body><h1>Remaining VoidZero Images v2</h1><p class="intro">Lighter branding, more environmental metaphor. Pick one per scene.</p><div class="toolbar"><button id="copy">Copy selections JSON</button></div>${body}<h2>Selections</h2><pre id="selections">{}</pre><script>const key='voidzero-remaining-v2-image-selections';const state=JSON.parse(localStorage.getItem(key)||'{}');for(const [name,value] of Object.entries(state)){const input=document.querySelector('input[name="'+CSS.escape(name)+'"][value="'+CSS.escape(value)+'"]');if(input)input.checked=true}function render(){const selections={};document.querySelectorAll('input[type="radio"]:checked').forEach(input=>selections[input.name]=input.value);localStorage.setItem(key,JSON.stringify(selections,null,2));document.querySelector('#selections').textContent=JSON.stringify(selections,null,2)}document.addEventListener('change',render);document.querySelector('#copy').addEventListener('click',async()=>navigator.clipboard.writeText(document.querySelector('#selections').textContent));render()</script></body></html>`);
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
