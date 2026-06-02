import { createWriteStream, existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";

const token = process.env.REPLICATE_API_TOKEN;
if (!token) throw new Error("REPLICATE_API_TOKEN is not set");

const root = new URL("..", import.meta.url).pathname;
const outDir = join(root, "data", "candidates", "07-v5");
const v4Dir = join(root, "data", "candidates", "06-short-v4");
const v4ManifestPath = join(v4Dir, "manifest.json");
const siteDir = join(root, "site");
const galleryPath = join(siteDir, "v5.html");
const manifestPath = join(outDir, "manifest.json");
const zekeAssets = join(root, "assets", "zeke");
const jamesAssets = join(root, "jamesquickfake");

const styles = [
  ["style-04", "https://lh3.googleusercontent.com/pw/AP1GczMZmxgTc-JdyH_3QDbl5H-H2kOKQJxuGlH9cAoIACjSNaTq8gqoxYYivjaxg9hAfOl7L1TX9rrICfcj-OCX9KNBco-KLkcAqKjS20WpDYV3OUJLbzaE=s1600-no", "graphic ink poster with bold contours"],
  ["style-05", "https://lh3.googleusercontent.com/pw/AP1GczM9NQo-Kfji5iwgFhK63l5xRxklPeTUyP_TOxalJDK0bZ8IahpL_JHwIP-7k5Y77YRBI3Vs0YDO3rASWjpMqkYZ0mTlTDfJhkL67oWB_tQaBvV6Jvlh=s1600-no", "soft painterly morning color"],
  ["style-07", "https://lh3.googleusercontent.com/pw/AP1GczPW_YmLE7qbFhPGFsqDGCW1lvFQvzLrbcuw6DKCqC7BVePNva1oHJpTV3XCJXTKuN1CfmhRkCq6Dtt-jTK_ENWlmGqZwKzkSsBN-2i6DRnUlZ2p0cAt=s1600-no", "bright editorial geometry"],
  ["style-09", "https://lh3.googleusercontent.com/pw/AP1GczOJlF5YYqFRO-vW2b5_VV2z20K0Fls_IpcRY3sfpSmKzRpVsc_YmovuF9aG3xSwCXg3sMn-z8wj7F87hNem2FUdHOXVmzZcudBbGCEH4sLh4QSvfi-R=s1600-no", "moody charcoal watercolor"],
  ["style-11", "https://lh3.googleusercontent.com/pw/AP1GczOLHJteTc-xFCJj9aPmrwDD8VsnhNl5jZ4dmrx_dXLk6_W3itoqbsHJYnhHBB4DytON4_Q7eIzda5f2jMlgKRLC87LjnXUOTysLaUpsdWqVsL-STSZK=s1600-no", "abstract paper collage"],
  ["style-13", "https://lh3.googleusercontent.com/pw/AP1GczNrU25wjbsrvL9HnauuXQCi96vKm3nagE0EnJL1KDac4ZiSD_vCMMPuN5abZ5czp7Vc9z7rtUZpsiqAEMEh00ZqwPt2ESB0eSPy043rsOoRKt8GzB_O=s1600-no", "vintage printmaking"],
  ["style-15", "https://lh3.googleusercontent.com/pw/AP1GczNm_HdGaWDPqXuIZocAKwlC_frXzD4UJgM5X_2LfwUQYlpbZR6G1rPUX5fnPV5jaQp_g3Cr8LOuGZRIfpxWy8i5EAdnypKuyW3KlkhkoiiSWZFHwYTg=s1600-no", "surreal luminous painting"],
  ["style-17", "https://lh3.googleusercontent.com/pw/AP1GczOdlrf1pv206dtOMXKIc0LF7kZHRinxHMQFLm69t5rawz25b6yi2_sV-Osy_FzTTgj64GMROz2o_ADHbupMhZSaiVbw8X0OMIrX9h-IesFsZWKiZn3L=s1600-no", "flat modern poster art"],
  ["style-19", "https://lh3.googleusercontent.com/pw/AP1GczNZmAPN-iCMi-IosFhrmPTubPeiecZA_IzXtCqV1pDJwI7Xb1AS5M8pz2QRhSJvdmeoCGeqE6duVlC67c5odJxLtRbsB6wS3qKsfbHkoeGM2N2rl95Q=s1600-no", "expressive gouache with high contrast"],
  ["style-22", "https://lh3.googleusercontent.com/pw/AP1GczP-nOO60CcqyQ6LlDMv88x27MLY16fuTaSy0msYn6ELQ3eF8FTIT7OJnAhZzk93i3bwvIhvyli7FDACgjjVW_7AN3G8qrt_-o8LELWZeiqz8_hEbzbQ=s1600-no", "minimal atmospheric spacious composition"],
].map(([name, url, direction]) => ({ name, url, direction }));

const frame = [
  "Place the person left of center with environment on the right.",
  "Place the person right of center with foreground depth on the left.",
  "Use a candid mid-action pose, chest-up, mouth visible.",
  "Use generous negative space and a three-quarter view.",
  "Use an intimate portrait crop with the person in one third of the frame.",
  "Use a cozy over-the-table perspective, props low.",
  "Use layered plants, cables, or furniture as frame-within-frame, never blocking face.",
  "Use a slight high angle, subject in lower third.",
  "Use a calm symmetrical room but place the person off-axis.",
  "Use a warm morning documentary-like composition.",
];

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

const script = [
  ["01-james-predawn-desk", "1. James", "Wake up babe. VoidZero just joined Cloudflare.", "Predawn desk, phone call."],
  ["01-zeke-bed-phone", "2. Zeke", "Good morning. The veet guys? And since when do you call me babe?", "Waking in bed, phone call."],
  ["02-james-kitchen-laptops", "3. James", "Sorry, I got excited. Yes, the veet people. The team behind veet, Veet test, Rolldown, Oxc, Veet plus, all of it.", "Kitchen coffee with devices."],
  ["02-zeke-bathroom-toothbrush", "4. Zeke", "Remind me. What’s veet again?", "Bathroom, robe, toothbrush."],
  ["05-james-vite-explainer", "5. James", "Have you been living under a rock, my guy? Veet is the de facto build tool of the JavaScript ecosystem. Fast dev server, fast feedback loop, used by frameworks like Vue, Astro, React Router, TanStack Start. Ring a bell?", "James explains Vite."],
  ["03-zeke-kitchen-coffee", "6. Zeke", "Oh yeah. Sure. Sure. I know veet. Obviously. Use it all the time. Cool. So what happens now that they’ve joined Cloudflare?", "Kitchen, pouring coffee."],
  ["07-james-open-commitment", "7. James", "The tooling stays open source, MIT licensed, vendor agnostic, and community driven. Same team, same commitment: keep it that way.", "Two coffees, headset, open-source commitment."],
  ["08-zeke-big-huh", "8. Zeke", "Huh. That’s actually big. That’s... huh.", "Garden, absorbing news."],
  ["09-james-fund", "9. James", "A million dollars is going into the veet ecosystem fund, run by the veet core team. That’s real support for the people keeping the lights on.", "Maintainer funding metaphor."],
  ["05-zeke-garden-awake", "10. Zeke", "A million dollars for maintainers. Okay, now I’m awake.", "Awake in garden."],
  ["11-james-adapter-dance", "11. James", "That’s the interesting part. Veet stays portable, and Cloudflare moves toward it. Less adapter dance, more use the workflow people already like.", "Less adapter dance."],
  ["12-zeke-finale", "12. Zeke", "Gotcha. Veet stays veet, maintainers get paid, the build tools are safe, and life keeps getting better. Thanks for the update, babe!", "Garden finale."],
].map(([slug, title, line, context]) => ({ slug, title, line, context }));

const existingMap = {
  "01-james-predawn-desk": "01-james-predawn-desk",
  "01-zeke-bed-phone": "01-zeke-bed-phone",
  "02-james-kitchen-laptops": "02-james-kitchen-laptops",
  "02-zeke-bathroom-toothbrush": "02-zeke-bathroom-toothbrush",
  "05-james-vite-explainer": "03-james-standing-desk",
  "03-zeke-kitchen-coffee": "03-zeke-kitchen-coffee",
  "08-zeke-big-huh": "04-zeke-garden-coffee",
  "09-james-fund": "05-james-coworking-fund",
  "05-zeke-garden-awake": "05-zeke-garden-awake",
  "11-james-adapter-dance": "06-james-daylight-desk",
  "12-zeke-finale": "06-zeke-garden-finale",
};

const regenScenes = [
  ["01-james-predawn-desk", jamesRefs, "James is at his home desk before sunrise, phone to ear, very awake and excited. Monitors and laptop screens are allowed to be visible and can show tasteful VoidZero and Vite branding, terminal colors, or abstract announcement graphics. Desk clutter, coffee, cables, human lived-in command center. Phone must not cover mouth."],
  ["05-james-vite-explainer", jamesRefs, "James is slightly exasperated but patient, explaining Vite like a friend teaching before breakfast. Use a breakfast diner booth, standing whiteboard, kitchen island, or small desk setup. Devices/screens may show small Vite or JavaScript-themed visuals, but avoid logo walls. Face and mouth clear."],
  ["07-james-open-commitment", jamesRefs, "James wears a telephone headset with mic away from mouth and holds two cups of coffee, one in each hand, low or out to the sides. He is at a standing desk with repo/community status vibe. Screens may show subtle Vite/VoidZero/open-source status visuals. Funny over-caffeinated commitment energy."],
  ["08-zeke-big-huh", zekeRefs, "Zeke is seated in the garden, awake but stunned, coffee low. He is absorbing the importance of the news. Framed off-center beside plants. Expression: surprised, processing, a little speechless. No big logos."],
  ["09-james-fund", jamesRefs, "James explains maintainer funding through a visual metaphor: community breakfast table, small lamps turning on at contributor seats, coffee poured into many cups, or practical support flowing through notes and laptops. Screens may be present with subtle Vite/VoidZero branding. No giant dollar signs, no corporate check."],
  ["11-james-adapter-dance", jamesRefs, "James demonstrates 'less adapter dance' with a humorous knot of dongles, adapters, and cables on a cafe table or daylight desk. He is untangling them calmly. Screens may be blank or show tiny Vite/Cloudflare-like visuals. Keep face clear and mouth visible."],
  ["12-zeke-finale", zekeRefs, "Zeke sits relaxed in the garden, fully awake, amused, coffee low. Phone face down near him as if the call is ending. Warm sunlight, plants, dry callback joke energy. He looks pleased and a little mischievous. Minimal branding."],
].map(([slug, refs, prompt]) => ({ slug, refs, prompt }));

const globalPrompt = `Create a 16:9 artistic talking-head portrait for a deepfake announcement video. Use person reference images only for identity. Preserve recognizable face shape, hair, beard, glasses, age, and expression. Use the style reference image for palette, texture, abstraction, and mark-making. Make it feel like finished editorial art, not a photo. The person's full face must be visible, especially mouth, lips, jawline, and lower face for lip-sync animation. Do not place hands, phones, microphones, cups, toothbrushes, collars, blankets, shadows, plants, cables, laptops, or props in front of the mouth. Branding may appear when requested, but keep it tasteful and integrated into the scene. No subtitles, no watermark.`;

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
async function writeGallery(v5) {
  const v4 = existsSync(v4ManifestPath) ? JSON.parse(await readFile(v4ManifestPath, "utf8")) : { jobs: [] };
  const body = script.map((scene) => {
    const oldSlug = existingMap[scene.slug];
    const existing = oldSlug ? v4.jobs.filter((job) => job.sceneSlug === oldSlug && job.outputFile).map((job) => ({ ...job, source: "existing v4", outputFile: join(v4Dir, job.filename) })) : [];
    const fresh = v5.jobs.filter((job) => job.sceneSlug === scene.slug && job.outputFile).map((job) => ({ ...job, source: "new v5" }));
    const variants = [...fresh, ...existing];
    return `<section><h2>${escapeHtml(scene.title)}</h2><p><strong>Statement:</strong> ${escapeHtml(scene.line)}</p><p><strong>Image context:</strong> ${escapeHtml(scene.context)}</p><div class="grid">${variants.map((variant) => {
      const src = relative(siteDir, variant.outputFile).replaceAll("\\", "/");
      const value = `${variant.source}:${variant.filename}`;
      return `<label class="card"><img src="${escapeHtml(src)}" /><div><input type="radio" name="${escapeHtml(scene.slug)}" value="${escapeHtml(value)}"> ${escapeHtml(variant.source)} · ${escapeHtml(variant.style)}<br><code>${escapeHtml(variant.id)}</code></div></label>`;
    }).join("")}</div></section>`;
  }).join("");
  await writeFile(galleryPath, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VoidZero v5 Picker</title><style>:root{color-scheme:dark;font-family:system-ui;background:#08060d;color:white}body{margin:0;padding:32px;background:radial-gradient(circle at top left,#24202e,#08060d 420px)}h1{margin:0 0 8px}.intro,p{color:#ccc;max-width:1050px}.toolbar{position:sticky;top:0;background:rgba(8,6,13,.9);backdrop-filter:blur(12px);padding:12px 0;border-bottom:1px solid #292432;z-index:1}section{margin:36px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}.card{display:block;background:#131018;border:2px solid #302a3a;border-radius:14px;overflow:hidden;cursor:pointer}.card:has(input:checked){border-color:#ff7a1a;box-shadow:0 0 0 2px rgba(255,122,26,.25)}img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}.card div{padding:10px 12px;color:#ddd}code{font-size:12px;color:#ffb86b;word-break:break-all}button{border:0;border-radius:999px;padding:10px 14px;background:#ff7a1a;color:#08060d;font-weight:700}pre{background:#131018;border:1px solid #302a3a;border-radius:14px;padding:14px;white-space:pre-wrap}</style></head><body><h1>VoidZero v5 Picker</h1><p class="intro">Updated script lines. New v5 candidates appear first, followed by existing v4 candidates where available.</p><div class="toolbar"><button id="copy">Copy selections JSON</button></div>${body}<h2>Selections</h2><pre id="selections">{}</pre><script>const key='voidzero-v5-selections';const state=JSON.parse(localStorage.getItem(key)||'{}');for(const [name,value] of Object.entries(state)){const input=document.querySelector('input[name="'+CSS.escape(name)+'"][value="'+CSS.escape(value)+'"]');if(input)input.checked=true}function render(){const selections={};document.querySelectorAll('input[type="radio"]:checked').forEach(input=>selections[input.name]=input.value);localStorage.setItem(key,JSON.stringify(selections,null,2));document.querySelector('#selections').textContent=JSON.stringify(selections,null,2)}document.addEventListener('change',render);document.querySelector('#copy').addEventListener('click',async()=>navigator.clipboard.writeText(document.querySelector('#selections').textContent));render()</script></body></html>`);
}

await mkdir(outDir, { recursive: true });
await mkdir(siteDir, { recursive: true });

const uploadCache = new Map();
async function cachedUpload(path) {
  if (!uploadCache.has(path)) uploadCache.set(path, upload(path));
  return uploadCache.get(path);
}

console.log("Uploading person refs...");
await Promise.all([...new Set(regenScenes.flatMap((scene) => scene.refs))].map(cachedUpload));

const desired = regenScenes.flatMap((scene) => styles.map((style, index) => ({ scene, style, index })));
const manifest = { createdAt: new Date().toISOString(), model: "google/nano-banana-2", jobs: [] };
console.log(`Creating ${desired.length} predictions...`);
const jobs = await Promise.all(desired.map(async ({ scene, style, index }) => {
  const imageInput = [...await Promise.all(scene.refs.map(cachedUpload)), style.url];
  const prediction = await api("/models/google/nano-banana-2/predictions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: { prompt: `${globalPrompt}\n\nScene: ${scene.prompt}\n\nComposition: ${frame[index % frame.length]}\n\nArt style: ${style.direction}. Apply ${style.name} strongly from the style reference image without copying its subjects.`, image_input: imageInput, aspect_ratio: "16:9", resolution: "1K", output_format: "jpg" } }) });
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
