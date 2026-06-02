import { createWriteStream, existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";

const token = process.env.REPLICATE_API_TOKEN;
if (!token) throw new Error("REPLICATE_API_TOKEN is not set");

const root = new URL("..", import.meta.url).pathname;
const outDir = join(root, "data", "candidates", "09-v7-adapter");
const siteDir = join(root, "site");
const galleryPath = join(siteDir, "v7-adapter.html");
const manifestPath = join(outDir, "manifest.json");
const v4Dir = join(root, "data", "candidates", "06-short-v4");
const v4ManifestPath = join(v4Dir, "manifest.json");
const v5Dir = join(root, "data", "candidates", "07-v5");
const v5ManifestPath = join(v5Dir, "manifest.json");
const jamesAssets = join(root, "jamesquickfake");

const styles = [
  ["style-04", "https://lh3.googleusercontent.com/pw/AP1GczMZmxgTc-JdyH_3QDbl5H-H2kOKQJxuGlH9cAoIACjSNaTq8gqoxYYivjaxg9hAfOl7L1TX9rrICfcj-OCX9KNBco-KLkcAqKjS20WpDYV3OUJLbzaE=s1600-no"],
  ["style-05", "https://lh3.googleusercontent.com/pw/AP1GczM9NQo-Kfji5iwgFhK63l5xRxklPeTUyP_TOxalJDK0bZ8IahpL_JHwIP-7k5Y77YRBI3Vs0YDO3rASWjpMqkYZ0mTlTDfJhkL67oWB_tQaBvV6Jvlh=s1600-no"],
  ["style-07", "https://lh3.googleusercontent.com/pw/AP1GczPW_YmLE7qbFhPGFsqDGCW1lvFQvzLrbcuw6DKCqC7BVePNva1oHJpTV3XCJXTKuN1CfmhRkCq6Dtt-jTK_ENWlmGqZwKzkSsBN-2i6DRnUlZ2p0cAt=s1600-no"],
  ["style-09", "https://lh3.googleusercontent.com/pw/AP1GczOJlF5YYqFRO-vW2b5_VV2z20K0Fls_IpcRY3sfpSmKzRpVsc_YmovuF9aG3xSwCXg3sMn-z8wj7F87hNem2FUdHOXVmzZcudBbGCEH4sLh4QSvfi-R=s1600-no"],
  ["style-11", "https://lh3.googleusercontent.com/pw/AP1GczOLHJteTc-xFCJj9aPmrwDD8VsnhNl5jZ4dmrx_dXLk6_W3itoqbsHJYnhHBB4DytON4_Q7eIzda5f2jMlgKRLC87LjnXUOTysLaUpsdWqVsL-STSZK=s1600-no"],
  ["style-13", "https://lh3.googleusercontent.com/pw/AP1GczNrU25wjbsrvL9HnauuXQCi96vKm3nagE0EnJL1KDac4ZiSD_vCMMPuN5abZ5czp7Vc9z7rtUZpsiqAEMEh00ZqwPt2ESB0eSPy043rsOoRKt8GzB_O=s1600-no"],
  ["style-15", "https://lh3.googleusercontent.com/pw/AP1GczNm_HdGaWDPqXuIZocAKwlC_frXzD4UJgM5X_2LfwUQYlpbZR6G1rPUX5fnPV5jaQp_g3Cr8LOuGZRIfpxWy8i5EAdnypKuyW3KlkhkoiiSWZFHwYTg=s1600-no"],
  ["style-17", "https://lh3.googleusercontent.com/pw/AP1GczOdlrf1pv206dtOMXKIc0LF7kZHRinxHMQFLm69t5rawz25b6yi2_sV-Osy_FzTTgj64GMROz2o_ADHbupMhZSaiVbw8X0OMIrX9h-IesFsZWKiZn3L=s1600-no"],
  ["style-19", "https://lh3.googleusercontent.com/pw/AP1GczNZmAPN-iCMi-IosFhrmPTubPeiecZA_IzXtCqV1pDJwI7Xb1AS5M8pz2QRhSJvdmeoCGeqE6duVlC67c5odJxLtRbsB6wS3qKsfbHkoeGM2N2rl95Q=s1600-no"],
  ["style-22", "https://lh3.googleusercontent.com/pw/AP1GczP-nOO60CcqyQ6LlDMv88x27MLY16fuTaSy0msYn6ELQ3eF8FTIT7OJnAhZzk93i3bwvIhvyli7FDACgjjVW_7AN3G8qrt_-o8LELWZeiqz8_hEbzbQ=s1600-no"],
].map(([name, url]) => ({ name, url }));

const refs = [
  join(jamesAssets, "Screen Shot 2026-06-01 at 13.48.47@2x.jpg"),
  join(jamesAssets, "Screen Shot 2026-06-01 at 13.49.14@2x.jpg"),
  join(jamesAssets, "Screen Shot 2026-06-01 at 13.50.59@2x.jpg"),
  join(jamesAssets, "Screen Shot 2026-06-01 at 13.51.12@2x.jpg"),
];

const slug = "11-james-adapter-dance";
const statement = "Basically, Vite stays portable, and Cloudflare does the adapting. Which is good, because developers have already done enough adapting for one lifetime.";
const basePrompt = "James explains the adapter joke at a cafe table or daylight desk. He is surrounded by a ridiculous tangle of dongles, adapters, USB hubs, and cables, but his face and mouth are fully visible. He calmly pushes adapters aside or untangles them with an amused expression. A laptop or monitor may show subtle Vite and Cloudflare visuals. The scene should be funny but polished, not slapstick.";
const global = "Create a 16:9 artistic talking-head portrait for a deepfake announcement video. Use person references only for identity. Preserve recognizable face shape, hair, beard, glasses, age, and expression. Full face and mouth must be unobstructed for lip-sync. No props in front of mouth. No subtitles, no watermark.";
const frame = ["left of center", "right of center", "over-the-table", "three-quarter view", "wider with negative space", "candid mid-action", "slight high angle", "foreground adapters create depth", "clean daylight desk", "cozy cafe booth"];

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
  if (!response.ok) throw new Error(`download failed ${response.status}`);
  await finished(Readable.fromWeb(response.body).pipe(createWriteStream(path)));
}
function esc(v) { return String(v).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
async function load(path, dir, source) {
  if (!existsSync(path)) return [];
  const m = JSON.parse(await readFile(path, "utf8"));
  return m.jobs.filter(j => j.sceneSlug === slug && j.outputFile).map(j => ({ ...j, source, outputFile: join(dir, j.filename) }));
}
async function writeGallery(manifest) {
  const prior = [...await load(v5ManifestPath, v5Dir, "prior v5"), ...await load(v4ManifestPath, v4Dir, "existing v4")];
  const variants = [...manifest.jobs.map(j => ({ ...j, source: "new v7" })), ...prior];
  const cards = variants.map(v => {
    const src = relative(siteDir, v.outputFile).replaceAll("\\", "/");
    const val = `${v.source}:${v.filename}`;
    return `<label class="card"><img src="${esc(src)}"><div><input type="radio" name="${slug}" value="${esc(val)}"> ${esc(v.source)} · ${esc(v.style)}<br><code>${esc(v.id)}</code></div></label>`;
  }).join("");
  await writeFile(galleryPath, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Adapter scene picker</title><style>:root{color-scheme:dark;font-family:system-ui;background:#08060d;color:white}body{margin:0;padding:32px;background:#08060d}p{color:#ccc;max-width:1000px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}.card{background:#131018;border:2px solid #302a3a;border-radius:14px;overflow:hidden;display:block}.card:has(input:checked){border-color:#ff7a1a}img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}.card div{padding:10px 12px;color:#ddd}code{font-size:12px;color:#ffb86b}button{border:0;border-radius:999px;padding:10px 14px;background:#ff7a1a;color:#08060d;font-weight:700}pre{background:#131018;border:1px solid #302a3a;border-radius:14px;padding:14px;white-space:pre-wrap}</style></head><body><h1>Adapter scene picker</h1><p><strong>Statement:</strong> ${esc(statement)}</p><p>New v7 options first, then prior options.</p><button id="copy">Copy selections JSON</button><div class="grid">${cards}</div><h2>Selection</h2><pre id="out">{}</pre><script>const key='voidzero-v7-adapter-selection';const state=JSON.parse(localStorage.getItem(key)||'{}');for(const [name,value] of Object.entries(state)){const input=document.querySelector('input[name="'+CSS.escape(name)+'"][value="'+CSS.escape(value)+'"]');if(input)input.checked=true}function render(){const s={};document.querySelectorAll('input[type=radio]:checked').forEach(i=>s[i.name]=i.value);localStorage.setItem(key,JSON.stringify(s,null,2));out.textContent=JSON.stringify(s,null,2)}document.addEventListener('change',render);copy.onclick=()=>navigator.clipboard.writeText(out.textContent);render()</script></body></html>`);
}

await mkdir(outDir, { recursive: true });
await mkdir(siteDir, { recursive: true });
const uploadedRefs = await Promise.all(refs.map(upload));
const manifest = { createdAt: new Date().toISOString(), model: "google/nano-banana-2", jobs: [] };
const jobs = await Promise.all(styles.map(async (style, i) => {
  const pred = await api("/models/google/nano-banana-2/predictions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: { prompt: `${global}\n\n${basePrompt}\n\nComposition: ${frame[i]}. Apply ${style.name} strongly from the style reference image.`, image_input: [...uploadedRefs, style.url], aspect_ratio: "16:9", resolution: "1K", output_format: "jpg" } }) });
  const job = { sceneSlug: slug, style: style.name, id: pred.id, status: pred.status, webUrl: pred.urls?.web };
  manifest.jobs.push(job);
  console.log(`${style.name}: ${pred.id}`);
  return { style, pred, job };
}));
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
const pending = new Map(jobs.map(j => [j.pred.id, j]));
while (pending.size) {
  await new Promise(r => setTimeout(r, 5000));
  await Promise.all([...pending.values()].map(async j => {
    const latest = await api(`/predictions/${j.pred.id}`);
    j.job.status = latest.status;
    if (latest.status === "succeeded") {
      const output = Array.isArray(latest.output) ? latest.output[0] : latest.output;
      const filename = `${slug}__${j.style.name}__${latest.id}${extname(new URL(output).pathname) || ".jpg"}`;
      const outputFile = join(outDir, filename);
      await download(output, outputFile);
      Object.assign(j.job, { outputUrl: output, outputFile, filename, metrics: latest.metrics });
      pending.delete(latest.id);
      console.log(`saved ${filename}`);
    } else if (["failed", "canceled", "aborted"].includes(latest.status)) {
      j.job.error = latest.error;
      pending.delete(latest.id);
    } else {
      console.log(`${latest.status} ${latest.id}`);
    }
  }));
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
await writeGallery(manifest);
console.log(`gallery ${galleryPath}`);
