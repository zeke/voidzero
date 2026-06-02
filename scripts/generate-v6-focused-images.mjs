import { createWriteStream, existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";

const token = process.env.REPLICATE_API_TOKEN;
if (!token) throw new Error("REPLICATE_API_TOKEN is not set");

const root = new URL("..", import.meta.url).pathname;
const outDir = join(root, "data", "candidates", "08-v6-focused");
const siteDir = join(root, "site");
const galleryPath = join(siteDir, "v6-focused.html");
const manifestPath = join(outDir, "manifest.json");
const v4Dir = join(root, "data", "candidates", "06-short-v4");
const v4ManifestPath = join(v4Dir, "manifest.json");
const v5Dir = join(root, "data", "candidates", "07-v5");
const v5ManifestPath = join(v5Dir, "manifest.json");
const zekeAssets = join(root, "assets", "zeke");
const jamesAssets = join(root, "jamesquickfake");

const styles = [
  ["style-04", "https://lh3.googleusercontent.com/pw/AP1GczMZmxgTc-JdyH_3QDbl5H-H2kOKQJxuGlH9cAoIACjSNaTq8gqoxYYivjaxg9hAfOl7L1TX9rrICfcj-OCX9KNBco-KLkcAqKjS20WpDYV3OUJLbzaE=s1600-no", "graphic ink poster, bold contours"],
  ["style-05", "https://lh3.googleusercontent.com/pw/AP1GczM9NQo-Kfji5iwgFhK63l5xRxklPeTUyP_TOxalJDK0bZ8IahpL_JHwIP-7k5Y77YRBI3Vs0YDO3rASWjpMqkYZ0mTlTDfJhkL67oWB_tQaBvV6Jvlh=s1600-no", "soft painterly morning"],
  ["style-07", "https://lh3.googleusercontent.com/pw/AP1GczPW_YmLE7qbFhPGFsqDGCW1lvFQvzLrbcuw6DKCqC7BVePNva1oHJpTV3XCJXTKuN1CfmhRkCq6Dtt-jTK_ENWlmGqZwKzkSsBN-2i6DRnUlZ2p0cAt=s1600-no", "bright editorial geometry"],
  ["style-09", "https://lh3.googleusercontent.com/pw/AP1GczOJlF5YYqFRO-vW2b5_VV2z20K0Fls_IpcRY3sfpSmKzRpVsc_YmovuF9aG3xSwCXg3sMn-z8wj7F87hNem2FUdHOXVmzZcudBbGCEH4sLh4QSvfi-R=s1600-no", "moody charcoal watercolor"],
  ["style-11", "https://lh3.googleusercontent.com/pw/AP1GczOLHJteTc-xFCJj9aPmrwDD8VsnhNl5jZ4dmrx_dXLk6_W3itoqbsHJYnhHBB4DytON4_Q7eIzda5f2jMlgKRLC87LjnXUOTysLaUpsdWqVsL-STSZK=s1600-no", "abstract paper collage"],
  ["style-13", "https://lh3.googleusercontent.com/pw/AP1GczNrU25wjbsrvL9HnauuXQCi96vKm3nagE0EnJL1KDac4ZiSD_vCMMPuN5abZ5czp7Vc9z7rtUZpsiqAEMEh00ZqwPt2ESB0eSPy043rsOoRKt8GzB_O=s1600-no", "vintage printmaking"],
  ["style-15", "https://lh3.googleusercontent.com/pw/AP1GczNm_HdGaWDPqXuIZocAKwlC_frXzD4UJgM5X_2LfwUQYlpbZR6G1rPUX5fnPV5jaQp_g3Cr8LOuGZRIfpxWy8i5EAdnypKuyW3KlkhkoiiSWZFHwYTg=s1600-no", "surreal luminous painting"],
  ["style-17", "https://lh3.googleusercontent.com/pw/AP1GczOdlrf1pv206dtOMXKIc0LF7kZHRinxHMQFLm69t5rawz25b6yi2_sV-Osy_FzTTgj64GMROz2o_ADHbupMhZSaiVbw8X0OMIrX9h-IesFsZWKiZn3L=s1600-no", "flat modern poster"],
  ["style-19", "https://lh3.googleusercontent.com/pw/AP1GczNZmAPN-iCMi-IosFhrmPTubPeiecZA_IzXtCqV1pDJwI7Xb1AS5M8pz2QRhSJvdmeoCGeqE6duVlC67c5odJxLtRbsB6wS3qKsfbHkoeGM2N2rl95Q=s1600-no", "expressive gouache high contrast"],
  ["style-22", "https://lh3.googleusercontent.com/pw/AP1GczP-nOO60CcqyQ6LlDMv88x27MLY16fuTaSy0msYn6ELQ3eF8FTIT7OJnAhZzk93i3bwvIhvyli7FDACgjjVW_7AN3G8qrt_-o8LELWZeiqz8_hEbQ=s1600-no".replace("hEbQ", "hEbzbQ"), "minimal atmospheric spacious"],
].map(([name, url, direction]) => ({ name, url, direction }));

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

const scenes = [
  {
    slug: "05-james-vite-explainer",
    title: "5. James",
    line: "Have you been living under a rock, my guy? Veet is the de facto build tool of the JavaScript ecosystem. Fast dev server, fast feedback loop, used by frameworks like Vue, Astro, React Router, TanStack Start. Ring a bell?",
    context: "James explains Vite.",
    refs: jamesRefs,
    prompt: "James is slightly exasperated but patient, explaining Vite like a friend teaching before breakfast. Try varied settings: breakfast diner booth, kitchen island, standing whiteboard, small desk, or coffee shop table. Screens may show subtle Vite or JavaScript visuals. No logo wall. Face and mouth clear. Expression should read: 'how do you not know this?' but friendly.",
  },
  {
    slug: "02-zeke-bathroom-toothbrush",
    title: "4. Zeke",
    line: "Remind me. What’s veet again?",
    context: "Bathroom, robe, toothbrush.",
    refs: zekeRefs,
    prompt: "Zeke is awake in a bathroom wearing a robe, holding a toothbrush naturally in one hand at chest level or resting it against the sink. The toothbrush must not float in the air. It must be visibly held or placed on the counter. Phone is face-down or dark on the counter. Zeke faces camera or three-quarter, mouth fully visible, curious and a little confused. Soft morning light.",
  },
];

const globalPrompt = "Create a 16:9 artistic talking-head portrait for a deepfake announcement video. Use person reference images only for identity. Preserve recognizable face shape, hair, beard, glasses, age, and expression. The person's full face must be visible, especially mouth, lips, jawline, and lower face for lip-sync animation. Do not place hands, phones, microphones, cups, toothbrushes, collars, blankets, shadows, plants, cables, laptops, or props in front of the mouth. Branding may appear only when requested, tasteful and integrated. No subtitles, no watermark.";
const frame = [
  "Subject left of center, environment visible on right.",
  "Subject right of center, foreground depth on left.",
  "Candid mid-action pose, chest-up.",
  "Three-quarter view with generous negative space.",
  "Intimate portrait crop, face in one third.",
  "Over-the-table or counter perspective, props low.",
  "Layered furniture or room elements frame the face without blocking it.",
  "Slight high angle, subject lower third.",
  "Calm symmetrical room, person off-axis.",
  "Warm morning documentary composition.",
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
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
async function loadManifest(path, dir, source) {
  if (!existsSync(path)) return [];
  const manifest = JSON.parse(await readFile(path, "utf8"));
  return manifest.jobs.filter((job) => job.outputFile).map((job) => ({ ...job, source, outputFile: join(dir, job.filename) }));
}
async function writeGallery(manifest) {
  const prior = [
    ...await loadManifest(v5ManifestPath, v5Dir, "prior v5"),
    ...await loadManifest(v4ManifestPath, v4Dir, "existing v4"),
  ];
  const all = [...manifest.jobs.map((job) => ({ ...job, source: "new v6" })), ...prior];
  const body = scenes.map((scene) => {
    const variants = all.filter((job) => job.sceneSlug === scene.slug && job.outputFile);
    return `<section><h2>${escapeHtml(scene.title)}</h2><p><strong>Statement:</strong> ${escapeHtml(scene.line)}</p><p><strong>Image context:</strong> ${escapeHtml(scene.context)}</p><div class="grid">${variants.map((variant) => {
      const src = relative(siteDir, variant.outputFile).replaceAll("\\", "/");
      const value = `${variant.source}:${variant.filename}`;
      return `<label class="card"><img src="${escapeHtml(src)}" /><div><input type="radio" name="${escapeHtml(scene.slug)}" value="${escapeHtml(value)}"> ${escapeHtml(variant.source)} · ${escapeHtml(variant.style)}<br><code>${escapeHtml(variant.id)}</code></div></label>`;
    }).join("")}</div></section>`;
  }).join("");
  await writeFile(galleryPath, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VoidZero v6 Focused Picker</title><style>:root{color-scheme:dark;font-family:system-ui;background:#08060d;color:white}body{margin:0;padding:32px;background:radial-gradient(circle at top left,#24202e,#08060d 420px)}h1{margin:0 0 8px}.intro,p{color:#ccc;max-width:1050px}.toolbar{position:sticky;top:0;background:rgba(8,6,13,.9);backdrop-filter:blur(12px);padding:12px 0;border-bottom:1px solid #292432;z-index:1}section{margin:36px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}.card{display:block;background:#131018;border:2px solid #302a3a;border-radius:14px;overflow:hidden;cursor:pointer}.card:has(input:checked){border-color:#ff7a1a;box-shadow:0 0 0 2px rgba(255,122,26,.25)}img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}.card div{padding:10px 12px;color:#ddd}code{font-size:12px;color:#ffb86b;word-break:break-all}button{border:0;border-radius:999px;padding:10px 14px;background:#ff7a1a;color:#08060d;font-weight:700}pre{background:#131018;border:1px solid #302a3a;border-radius:14px;padding:14px;white-space:pre-wrap}</style></head><body><h1>VoidZero v6 Focused Picker</h1><p class="intro">New candidates first, then prior v5 and existing v4 options.</p><div class="toolbar"><button id="copy">Copy selections JSON</button></div>${body}<h2>Selections</h2><pre id="selections">{}</pre><script>const key='voidzero-v6-focused-selections';const state=JSON.parse(localStorage.getItem(key)||'{}');for(const [name,value] of Object.entries(state)){const input=document.querySelector('input[name="'+CSS.escape(name)+'"][value="'+CSS.escape(value)+'"]');if(input)input.checked=true}function render(){const selections={};document.querySelectorAll('input[type="radio"]:checked').forEach(input=>selections[input.name]=input.value);localStorage.setItem(key,JSON.stringify(selections,null,2));document.querySelector('#selections').textContent=JSON.stringify(selections,null,2)}document.addEventListener('change',render);document.querySelector('#copy').addEventListener('click',async()=>navigator.clipboard.writeText(document.querySelector('#selections').textContent));render()</script></body></html>`);
}

await mkdir(outDir, { recursive: true });
await mkdir(siteDir, { recursive: true });
const uploadCache = new Map();
async function cachedUpload(path) {
  if (!uploadCache.has(path)) uploadCache.set(path, upload(path));
  return uploadCache.get(path);
}
await Promise.all([...new Set(scenes.flatMap((scene) => scene.refs))].map(cachedUpload));
const desired = scenes.flatMap((scene) => styles.map((style, index) => ({ scene, style, index })));
const manifest = { createdAt: new Date().toISOString(), model: "google/nano-banana-2", jobs: [] };
console.log(`Creating ${desired.length} predictions...`);
const jobs = await Promise.all(desired.map(async ({ scene, style, index }) => {
  const imageInput = [...await Promise.all(scene.refs.map(cachedUpload)), style.url];
  const prediction = await api("/models/google/nano-banana-2/predictions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: { prompt: `${globalPrompt}\n\nScene: ${scene.prompt}\n\nComposition: ${frame[index]}\n\nArt style: ${style.direction}. Apply ${style.name} strongly from the reference style image.`, image_input: imageInput, aspect_ratio: "16:9", resolution: "1K", output_format: "jpg" } }) });
  const job = { sceneSlug: scene.slug, style: style.name, id: prediction.id, status: prediction.status, webUrl: prediction.urls?.web };
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
