import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";

const token = process.env.REPLICATE_API_TOKEN;
if (!token) throw new Error("REPLICATE_API_TOKEN is not set");

const root = new URL("..", import.meta.url).pathname;
const outDir = join(root, "data", "candidates", "03-remaining");
const siteDir = join(root, "site");
const galleryPath = join(siteDir, "remaining.html");
const manifestPath = join(outDir, "manifest.json");
const zekeAssets = join(root, "assets", "zeke");
const jamesAssets = join(root, "jamesquickfake");

const styles = [
  ["style-09", "https://lh3.googleusercontent.com/pw/AP1GczOJlF5YYqFRO-vW2b5_VV2z20K0Fls_IpcRY3sfpSmKzRpVsc_YmovuF9aG3xSwCXg3sMn-z8wj7F87hNem2FUdHOXVmzZcudBbGCEH4sLh4QSvfi-R=s1600-no"],
  ["style-10", "https://lh3.googleusercontent.com/pw/AP1GczMan5Kbc7TV2TcA4vOCGOCA4E6BtQoU6m8r_f-IL4n2dl4YWt4a1IErR6mt9lxQwCWqHc-_GrX89GIp1WGUOpK7CYLmV8MWQylkZBRYEvmqeRJ6ImFi=s1600-no"],
  ["style-11", "https://lh3.googleusercontent.com/pw/AP1GczOLHJteTc-xFCJj9aPmrwDD8VsnhNl5jZ4dmrx_dXLk6_W3itoqbsHJYnhHBB4DytON4_Q7eIzda5f2jMlgKRLC87LjnXUOTysLaUpsdWqVsL-STSZK=s1600-no"],
  ["style-12", "https://lh3.googleusercontent.com/pw/AP1GczPEqyMVEqxiYxWdd_UCDdmPCTtcHbNqqnyIy5wOpwkL-ihQgsY0XzW2xxmnwUWMSZWpWECfwDNBBBzfGjDrpGrx7H1efJnlMEuzpHFjwif7_1-kcga4=s1600-no"],
  ["style-13", "https://lh3.googleusercontent.com/pw/AP1GczNrU25wjbsrvL9HnauuXQCi96vKm3nagE0EnJL1KDac4ZiSD_vCMMPuN5abZ5czp7Vc9z7rtUZpsiqAEMEh00ZqwPt2ESB0eSPy043rsOoRKt8GzB_O=s1600-no"],
].map(([name, url]) => ({ name, url }));

const jamesRefs = [
  join(jamesAssets, "Screen Shot 2026-06-01 at 13.48.47@2x.jpg"),
  join(jamesAssets, "Screen Shot 2026-06-01 at 13.49.14@2x.jpg"),
  join(jamesAssets, "Screen Shot 2026-06-01 at 13.50.59@2x.jpg"),
];
const zekeRefs = [join(zekeAssets, "ziki.jpg"), join(zekeAssets, "zeke-outdoor-selfie.jpg"), join(zekeAssets, "zeke-wilder-shirt.jpg")];

const globalPrompt = `Create a 16:9 artistic talking-head portrait for a deepfake announcement video. Use the person reference images only for identity. Preserve recognizable face shape, hair, beard, glasses, age, and expression. Use the style reference image for palette, texture, abstraction, and mark-making. Make it feel like finished editorial art, not a photo. The subject is framed from chest up, facing camera or three-quarter camera. The subject's mouth, lips, jawline, and lower face must be fully visible and unobstructed for lip-sync animation. Do not place hands, phones, microphones, cups, toothbrushes, collars, shadows, or props in front of the mouth. Natural speaking posture, clear facial features, expressive eyes. Include relevant VoidZero, Vite, Cloudflare, Vitest, Rolldown, Oxc, Vite+ iconography as environmental design elements, not pasted stickers. No subtitles, no watermark.`;

const scenes = [
  {
    slug: "04-james-shared-foundation",
    title: "4A. James: Vite as shared foundation",
    speaker: "James",
    line: "Vite is kind of the shared road now. Vue, SvelteKit, Nuxt, Astro, Solid, Qwik, Angular, React Router, TanStack Start, a lot of people are building on it.",
    refs: jamesRefs,
    prompt: `James is deeply embedded in a live JavaScript ecosystem operations dashboard, surrounded by monitors and glowing network maps. His mouth is fully visible. A transit map has Vite as the central station, with colored routes branching to Vue, SvelteKit, Nuxt, Astro, Solid, Qwik, Angular, React Router, and TanStack Start. Dense but readable, tech-mode energy.`,
  },
  {
    slug: "04-zeke-plant-garden",
    title: "4B. Zeke: serene plant garden",
    speaker: "Zeke",
    line: "Right. Not everyone use the same framework. More like, can we at least agree the road should be fast?",
    refs: zekeRefs,
    prompt: `Zeke has stepped into a serene indoor plant garden, holding coffee low at chest level, far below his mouth. His mouth is fully visible. Vines and roots form a subtle network connecting framework symbols back to a glowing Vite lightning shape in the soil. Calm, green, waking-up energy, artistic botanical diagram style.`,
  },
  {
    slug: "05-james-ecosystem-fund",
    title: "5A. James: ecosystem fund",
    speaker: "James",
    line: "Cloudflare is also putting one million dollars into a Vite ecosystem fund, run by the Vite core team.",
    refs: jamesRefs,
    prompt: `James is inside a transparent terminal window that looks like a grant dashboard for open-source maintainers. His mouth is fully visible. Around him are symbolic contributor constellations, issue icons, pull request paths, and a glowing Vite lightning symbol. Cloudflare-orange light highlights the funding flow without looking like an ad.`,
  },
  {
    slug: "05-zeke-maintainer-garden",
    title: "5B. Zeke: maintainers in the garden",
    speaker: "Zeke",
    line: "Paying maintainers. I like this part. We should make open source but with rent money a trend.",
    refs: zekeRefs,
    prompt: `Zeke stands in the same serene plant garden, more awake, holding pruning shears low at waist level, far away from his face. His mouth is fully visible. Healthy open-source plants grow around him, contributor constellations overhead, Vite lightning as sunlight. Warm, grounded, subtle funny expression.`,
  },
  {
    slug: "06-james-workerd-lab",
    title: "6A. James: Vite plus workerd",
    speaker: "James",
    line: "The Cloudflare part already makes sense technically. The Vite Environment API lets server code run somewhere other than Node during dev. Cloudflare built the Vite plugin on that, so your local code can run in workerd.",
    refs: jamesRefs,
    prompt: `James is deep in a runtime lab, hands on a keyboard, surrounded by holographic diagrams of Vite dev, workerd, Workers, Durable Objects, D1, KV, R2, Workflows, and Workers AI. His mouth is fully visible. A single glowing circuit connects local development to production runtime. Technical, immersive, high-detail artistic style.`,
  },
  {
    slug: "06-zeke-train-local-prod",
    title: "6B. Zeke: train platform local/prod",
    speaker: "Zeke",
    line: "So local dev gets closer to production without turning Vite into a Cloudflare-specific thing. That’s the important bit.",
    refs: zekeRefs,
    prompt: `Zeke is standing on a clean train platform labeled Vite Central, holding his phone at his side, not near his face. His mouth is fully visible. One train is labeled local, another production, and they run on parallel tracks that line up perfectly. Calm, awake, mildly impressed expression. Artistic transit-poster style.`,
  },
  {
    slug: "07-james-agent-loop",
    title: "7A. James: AI coding loops",
    speaker: "James",
    line: "And then there’s the agent angle. Agents run builds, tests, linters, formatters, CLIs, all day, on repeat. Fast feedback loops stop being nice-to-have.",
    refs: jamesRefs,
    prompt: `James is fully embedded in a Matrix-like coding environment, seated at a command console with streams of build, test, lint, format, and deploy logs flowing around him. His mouth is fully visible. Tiny agent silhouettes move through Vite, Vitest, Rolldown, Oxc, Oxlint, and Oxfmt stations like a fast feedback loop. Energetic, precise, artistic cybernetic style.`,
  },
  {
    slug: "07-zeke-agent-gym-platform",
    title: "7B. Zeke: agent gym on platform",
    speaker: "Zeke",
    line: "Agents are basically developers who never get tired and have no emotional attachment to rerunning tests. Disturbing, but useful.",
    refs: zekeRefs,
    prompt: `Zeke stands on the train platform, now fully awake, watching tiny robot agents sprint on treadmills labeled build, test, lint, format, deploy. His mouth is fully visible. A Vite+ scoreboard glows above the platform. Zeke looks amused but not goofy. Polished editorial art.`,
  },
  {
    slug: "08-james-fullstack-city",
    title: "8A. James: full-stack Vite city",
    speaker: "James",
    line: "Longer term, this is about Vite becoming a better foundation for full-stack apps and agents, with provider-agnostic primitives. And Cloudflare moving its own app tooling toward Vite, not the other way around.",
    refs: jamesRefs,
    prompt: `James stands inside an isometric city made of software systems: routes, APIs, background jobs, queues, databases, storage, realtime, auth, agents, and AI. His mouth is fully visible. The city sits on a glowing Vite foundation, with Cloudflare-orange rails connecting to it without enclosing it. High-concept technical art, not corporate.`,
  },
  {
    slug: "08-zeke-finale-platform-exit",
    title: "8B. Zeke: finale platform exit",
    speaker: "Zeke",
    line: "So Vite stays portable, Cloudflare gets easier, and the path is basically: keep the workflow developers already like.",
    refs: zekeRefs,
    prompt: `Zeke stands at the train platform exit, fully awake. His mouth is fully visible. Behind him, Vite lightning tracks and Cloudflare-orange tracks merge toward a bright open city. Floating terminal commands appear off to the side, not covering his face: cf dev, cf build, cf deploy. Confident but casual end-card energy.`,
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
  await writeFile(galleryPath, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Remaining VoidZero Images</title><style>:root{color-scheme:dark;font-family:system-ui;background:#08060d;color:white}body{margin:0;padding:32px;background:radial-gradient(circle at top left,#24202e,#08060d 420px)}h1{margin:0 0 8px}.intro{color:#bbb}.toolbar{position:sticky;top:0;background:rgba(8,6,13,.9);backdrop-filter:blur(12px);padding:12px 0;border-bottom:1px solid #292432}section{margin:36px 0}p{color:#ccc;max-width:980px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}.card{display:block;background:#131018;border:2px solid #302a3a;border-radius:14px;overflow:hidden;cursor:pointer}.card:has(input:checked){border-color:#ff7a1a;box-shadow:0 0 0 2px rgba(255,122,26,.25)}img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}.card div{padding:10px 12px;color:#ddd}code{font-size:12px;color:#ffb86b;word-break:break-all}button{border:0;border-radius:999px;padding:10px 14px;background:#ff7a1a;color:#08060d;font-weight:700}pre{background:#131018;border:1px solid #302a3a;border-radius:14px;padding:14px;white-space:pre-wrap}</style></head><body><h1>Remaining VoidZero Images</h1><p class="intro">Pick one image per remaining scene. Choices are saved in this browser.</p><div class="toolbar"><button id="copy">Copy selections JSON</button></div>${body}<h2>Selections</h2><pre id="selections">{}</pre><script>const key='voidzero-remaining-image-selections';const state=JSON.parse(localStorage.getItem(key)||'{}');for(const [name,value] of Object.entries(state)){const input=document.querySelector('input[name="'+CSS.escape(name)+'"][value="'+CSS.escape(value)+'"]');if(input)input.checked=true}function render(){const selections={};document.querySelectorAll('input[type="radio"]:checked').forEach(input=>selections[input.name]=input.value);localStorage.setItem(key,JSON.stringify(selections,null,2));document.querySelector('#selections').textContent=JSON.stringify(selections,null,2)}document.addEventListener('change',render);document.querySelector('#copy').addEventListener('click',async()=>navigator.clipboard.writeText(document.querySelector('#selections').textContent));render()</script></body></html>`);
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
  const prediction = await api("/models/google/nano-banana-2/predictions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: { prompt: `${globalPrompt}\n\n${scene.prompt}\n\nApply ${style.name} strongly from the style reference image. Do not copy the reference image subjects.`, image_input: imageInput, aspect_ratio: "16:9", resolution: "1K", output_format: "jpg" } }) });
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
