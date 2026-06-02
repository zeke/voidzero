import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";

const token = process.env.REPLICATE_API_TOKEN;
if (!token) throw new Error("REPLICATE_API_TOKEN is not set");

const root = new URL("..", import.meta.url).pathname;
const outDir = join(root, "data", "candidates", "06-short-v4");
const siteDir = join(root, "site");
const galleryPath = join(siteDir, "short-v4.html");
const manifestPath = join(outDir, "manifest.json");
const zekeAssets = join(root, "assets", "zeke");
const jamesAssets = join(root, "jamesquickfake");

const styles = [
  ["style-04", "https://lh3.googleusercontent.com/pw/AP1GczMZmxgTc-JdyH_3QDbl5H-H2kOKQJxuGlH9cAoIACjSNaTq8gqoxYYivjaxg9hAfOl7L1TX9rrICfcj-OCX9KNBco-KLkcAqKjS20WpDYV3OUJLbzaE=s1600-no", "graphic ink poster, bold contours, rich shadows"],
  ["style-05", "https://lh3.googleusercontent.com/pw/AP1GczM9NQo-Kfji5iwgFhK63l5xRxklPeTUyP_TOxalJDK0bZ8IahpL_JHwIP-7k5Y77YRBI3Vs0YDO3rASWjpMqkYZ0mTlTDfJhkL67oWB_tQaBvV6Jvlh=s1600-no", "soft painterly texture, warm color washes, expressive brushwork"],
  ["style-07", "https://lh3.googleusercontent.com/pw/AP1GczPW_YmLE7qbFhPGFsqDGCW1lvFQvzLrbcuw6DKCqC7BVePNva1oHJpTV3XCJXTKuN1CfmhRkCq6Dtt-jTK_ENWlmGqZwKzkSsBN-2i6DRnUlZ2p0cAt=s1600-no", "bright editorial illustration, playful geometry, clean negative space"],
  ["style-09", "https://lh3.googleusercontent.com/pw/AP1GczOJlF5YYqFRO-vW2b5_VV2z20K0Fls_IpcRY3sfpSmKzRpVsc_YmovuF9aG3xSwCXg3sMn-z8wj7F87hNem2FUdHOXVmzZcudBbGCEH4sLh4QSvfi-R=s1600-no", "moody charcoal and muted watercolor, atmospheric grain"],
  ["style-11", "https://lh3.googleusercontent.com/pw/AP1GczOLHJteTc-xFCJj9aPmrwDD8VsnhNl5jZ4dmrx_dXLk6_W3itoqbsHJYnhHBB4DytON4_Q7eIzda5f2jMlgKRLC87LjnXUOTysLaUpsdWqVsL-STSZK=s1600-no", "abstract collage, torn paper edges, layered shapes"],
  ["style-13", "https://lh3.googleusercontent.com/pw/AP1GczNrU25wjbsrvL9HnauuXQCi96vKm3nagE0EnJL1KDac4ZiSD_vCMMPuN5abZ5czp7Vc9z7rtUZpsiqAEMEh00ZqwPt2ESB0eSPy043rsOoRKt8GzB_O=s1600-no", "vintage printmaking, limited palette, tactile paper grain"],
  ["style-15", "https://lh3.googleusercontent.com/pw/AP1GczNm_HdGaWDPqXuIZocAKwlC_frXzD4UJgM5X_2LfwUQYlpbZR6G1rPUX5fnPV5jaQp_g3Cr8LOuGZRIfpxWy8i5EAdnypKuyW3KlkhkoiiSWZFHwYTg=s1600-no", "surreal fine-art painting, luminous forms, dreamlike composition"],
  ["style-17", "https://lh3.googleusercontent.com/pw/AP1GczOdlrf1pv206dtOMXKIc0LF7kZHRinxHMQFLm69t5rawz25b6yi2_sV-Osy_FzTTgj64GMROz2o_ADHbupMhZSaiVbw8X0OMIrX9h-IesFsZWKiZn3L=s1600-no", "flat modern poster art, elegant shapes, confident asymmetry"],
  ["style-19", "https://lh3.googleusercontent.com/pw/AP1GczNZmAPN-iCMi-IosFhrmPTubPeiecZA_IzXtCqV1pDJwI7Xb1AS5M8pz2QRhSJvdmeoCGeqE6duVlC67c5odJxLtRbsB6wS3qKsfbHkoeGM2N2rl95Q=s1600-no", "expressive gouache, high color contrast, handmade texture"],
  ["style-22", "https://lh3.googleusercontent.com/pw/AP1GczP-nOO60CcqyQ6LlDMv88x27MLY16fuTaSy0msYn6ELQ3eF8FTIT7OJnAhZzk93i3bwvIhvyli7FDACgjjVW_7AN3G8qrt_-o8LELWZeiqz8_hEbzbQ=s1600-no", "minimal atmospheric illustration, spacious composition, subtle gradients"],
].map(([name, url, direction]) => ({ name, url, direction }));

const framing = [
  "Place the subject slightly left of center with meaningful environment visible on the right.",
  "Place the subject slightly right of center with foreground objects creating depth on the left.",
  "Use a medium close-up from a slight high angle, with the subject in the lower third.",
  "Use a wider chest-up composition with generous negative space and the subject off-center.",
  "Use a three-quarter view with the subject turned slightly toward the camera, not centered.",
  "Use a cozy over-the-table perspective, face clear, props low and away from mouth.",
  "Use a layered composition with plants, cables, or furniture framing the person without blocking the face.",
  "Use a candid documentary-like pose, person paused mid-action, mouth visible.",
  "Use a calm symmetrical environment but place the person off-axis for visual interest.",
  "Use an intimate portrait crop with the face in one third and environment filling the rest.",
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

const globalPrompt = `Create a 16:9 artistic talking-head portrait for a deepfake announcement video. Use person reference images only for identity. Preserve recognizable face shape, hair, beard, glasses, age, and expression. Use the style reference image for palette, texture, abstraction, and mark-making. Make it feel like finished editorial art, not a photo. The person's full face must be visible, especially mouth, lips, jawline, and lower face for lip-sync animation. Do not place hands, phones, microphones, cups, toothbrushes, collars, blankets, shadows, plants, cables, laptops, or props in front of the mouth. If holding a phone, it is pressed to the ear only and does not cover cheek or mouth. If holding coffee or toothbrush, keep it low in frame. Devices may appear in the scene, but do not show their screens: make screens closed, turned away, dark, blank, out of focus, or cropped so no content is visible. No readable screen text. Keep branding very subtle: no large logos, no logo walls, no product ad feeling, no readable brand text. It is okay to include a tiny abstract lightning shape, soft orange glow, terminal motif, cable motif, or circular void motif as environmental texture. No subtitles, no watermark.`;

const scenes = [
  ["01-james-predawn-desk", "1A. James: pre-dawn desk", "James", "Wake up babe. VoidZero just joined Cloudflare.", jamesRefs, `James is at his home desk before sunrise, already fully awake, holding a phone to his ear while speaking. Laptop present but closed or angled away; a few monitors exist as dark blank rectangles or soft backlight only, no visible screen content. Coffee mug off to the side. Nerdy lived-in morning command center, human not corporate.`],
  ["01-zeke-bed-phone", "1B. Zeke: actually asleep", "Zeke", "Hey James. Good morning. You mean the veet guys? And why are you calling me babe?", zekeRefs, `Zeke is truly just waking up in bed, sleepy and rumpled, hair messy, holding a phone to his ear while speaking. This is the only scene where Zeke looks genuinely asleep. Soft morning light, cozy bedroom with subtle terminal-window shapes in the decor. Tiny lightning-shaped alarm light on nightstand.`],
  ["02-james-kitchen-laptops", "2A. James: kitchen multitask", "James", "Sorry, I just got excited. Yes, the veet people. Veet, Veet test, Rolldown, Oxc, Veet plus, the whole team.", jamesRefs, `James is in his kitchen making coffee while laptops and a tablet are physically present on the counter, but all screens are closed, blank, dark, or turned away. Cables snake between coffee gear and devices in a slightly absurd but tidy way. James looks excited and caffeinated. Coffee gear stays low, never blocking mouth.`],
  ["02-zeke-bathroom-toothbrush", "2B. Zeke: brushing teeth but awake", "Zeke", "Huh. That’s actually big. Huh.", zekeRefs, `Zeke is awake in a bathroom wearing a robe, facing camera directly or three-quarter, holding a toothbrush low at chest level far from his mouth. Phone sits on counter face-down or screen dark. He looks alert but still processing the news. Soft morning light, understated humor.`],
  ["03-james-standing-desk", "3A. James: standing desk verify", "James", "The main thing they’re saying is: veet stays veet. MIT licensed, open source, vendor agnostic, community driven.", jamesRefs, `James is at a standing desk in a brightening morning room, calmly checking open-source health. Devices are present but screens are angled away, blurred, or blank with no visible content. Use community metaphors in the room: pinned index cards, cords, corkboard lines, commit-dot-like beads, but no readable labels.`],
  ["03-zeke-kitchen-coffee", "3B. Zeke: pouring coffee", "Zeke", "Good. Because the fastest way to make JavaScript people nervous is to touch their build tool.", zekeRefs, `Zeke is awake in the kitchen pouring coffee into a mug placed low in frame, far below his mouth. He is no longer sleepy. Warm morning light, relaxed posture, subtle humor. Steam can form abstract tiny sparks or open-source-like shapes, but no logos or readable symbols.`],
  ["04-james-train-laptop", "4A. James: nerdy commute", "James", "Veet is kind of the shared road now. Vue, SvelteKit, Nuxt, Astro, Solid, Qwik, Angular, React Router, TanStack Start, a lot of people are building on it.", jamesRefs, `James is on a quiet morning train or transit stop with a laptop present but closed, angled away, or showing a blank dark screen. Outside the window or behind him are abstract transit lines and city routes, no readable labels. He looks engaged and animated, explaining the shared road idea.`],
  ["04-zeke-garden-coffee", "4B. Zeke: garden coffee", "Zeke", "Right. Not the same framework. Just the same road. Ideally one without potholes made of Webpack config.", zekeRefs, `Zeke is awake, seated beside plants in a serene indoor garden, framed in the left or right half of the image rather than centered. Coffee is low and away from face. Vines, roots, and stepping stones form a subtle path network. Calm green scene, dry joke energy.`],
  ["05-james-coworking-fund", "5A. James: community table", "James", "And they’re putting a million dollars into the veet ecosystem fund. Not a swag budget. Actual maintainer support, run by the veet core team.", jamesRefs, `James is at a warm coworking or community table in the morning. Laptops are present but closed or screens hidden; notebooks, coffee cups, sticky notes, and empty chairs suggest collaborators. Thin glowing threads connect physical notes and chairs like support flowing through a community. No corporate ad feeling.`],
  ["05-zeke-garden-awake", "5B. Zeke: fully awake in garden", "Zeke", "A million dollars for maintainers. Okay, now I’m awake.", zekeRefs, `Zeke sits in the same peaceful garden, clearly awake and interested. Coffee rests low in his hands, far below mouth. Healthy plants are supported by small stakes and trellises, a metaphor for maintained open source. Frame him off-center, with plants occupying much of the image. Gentle impressed expression.`],
  ["06-james-daylight-desk", "6A. James: daylight wrap", "James", "That’s the opportunity: keep veet portable, make Cloudflare’s app tooling feel more like veet, and build better primitives for full-stack apps and agents.", jamesRefs, `James is back at his desk in full morning daylight, calmer now, leaning back slightly with a satisfied look. Devices and monitors are present but screens are blank, dark, cropped, or turned away. Coffee cup, keyboard, and cables remain. The morning excitement has resolved into calm confidence.`],
  ["06-zeke-garden-finale", "6B. Zeke: garden finale", "Zeke", "Great. The coffee is kicking in, our precious build tools are safe, and I'm your babe. Not a bad start to the day.", zekeRefs, `Zeke sits relaxed in the garden, fully awake, mouth fully visible, coffee low in frame. He is framed off-center beside lush plants, with warm morning sunlight. Dry knowing smile, landing a callback joke. One tiny lightning-shaped garden ornament may appear, no text or logos.`],
].map(([slug, title, speaker, line, refs, prompt]) => ({ slug, title, speaker, line, refs, prompt }));

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
  await writeFile(galleryPath, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VoidZero Short v4 Images</title><style>:root{color-scheme:dark;font-family:system-ui;background:#08060d;color:white}body{margin:0;padding:32px;background:radial-gradient(circle at top left,#24202e,#08060d 420px)}h1{margin:0 0 8px}.intro{color:#bbb}.toolbar{position:sticky;top:0;background:rgba(8,6,13,.9);backdrop-filter:blur(12px);padding:12px 0;border-bottom:1px solid #292432;z-index:1}section{margin:36px 0}p{color:#ccc;max-width:980px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px}.card{display:block;background:#131018;border:2px solid #302a3a;border-radius:14px;overflow:hidden;cursor:pointer}.card:has(input:checked){border-color:#ff7a1a;box-shadow:0 0 0 2px rgba(255,122,26,.25)}img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}.card div{padding:10px 12px;color:#ddd}code{font-size:12px;color:#ffb86b;word-break:break-all}button{border:0;border-radius:999px;padding:10px 14px;background:#ff7a1a;color:#08060d;font-weight:700}pre{background:#131018;border:1px solid #302a3a;border-radius:14px;padding:14px;white-space:pre-wrap}</style></head><body><h1>VoidZero Short v4 Images</h1><p class="intro">10 variants per shot. More pose/framing variation, no visible device screens, minimal branding.</p><div class="toolbar"><button id="copy">Copy selections JSON</button></div>${body}<h2>Selections</h2><pre id="selections">{}</pre><script>const key='voidzero-short-v4-image-selections';const state=JSON.parse(localStorage.getItem(key)||'{}');for(const [name,value] of Object.entries(state)){const input=document.querySelector('input[name="'+CSS.escape(name)+'"][value="'+CSS.escape(value)+'"]');if(input)input.checked=true}function render(){const selections={};document.querySelectorAll('input[type="radio"]:checked').forEach(input=>selections[input.name]=input.value);localStorage.setItem(key,JSON.stringify(selections,null,2));document.querySelector('#selections').textContent=JSON.stringify(selections,null,2)}document.addEventListener('change',render);document.querySelector('#copy').addEventListener('click',async()=>navigator.clipboard.writeText(document.querySelector('#selections').textContent));render()</script></body></html>`);
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

const desired = scenes.flatMap((scene) => styles.map((style, index) => ({ scene, style, index })));
const manifest = { createdAt: new Date().toISOString(), model: "google/nano-banana-2", jobs: [] };
console.log(`Creating ${desired.length} predictions...`);
const jobs = await Promise.all(desired.map(async ({ scene, style, index }) => {
  const imageInput = [...await Promise.all(scene.refs.map(cachedUpload)), style.url];
  const prediction = await api("/models/google/nano-banana-2/predictions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: { prompt: `${globalPrompt}\n\nScene: ${scene.prompt}\n\nComposition variation: ${framing[index % framing.length]}\n\nArt style direction: ${style.direction}. Apply ${style.name} strongly from the style reference image, but do not copy the reference image subjects or objects.`, image_input: imageInput, aspect_ratio: "16:9", resolution: "1K", output_format: "jpg" } }) });
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
