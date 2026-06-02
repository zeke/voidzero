import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const siteDir = join(root, "site");
const outPath = join(siteDir, "image-replacements.html");
const sources = [
  { label: "v5", dir: join(root, "data", "candidates", "07-v5"), manifest: join(root, "data", "candidates", "07-v5", "manifest.json") },
  { label: "v4", dir: join(root, "data", "candidates", "06-short-v4"), manifest: join(root, "data", "candidates", "06-short-v4", "manifest.json") },
];
const scenes = [
  {
    slug: "07-james-open-commitment",
    title: "7. James open-source commitment",
    statement: "The tooling stays open source, MIT licensed, vendor agnostic, and community driven. Same team, same commitment: keep it that way.",
    aliases: ["07-james-open-commitment", "03-james-standing-desk"],
  },
  {
    slug: "09-james-fund",
    title: "9. James ecosystem fund",
    statement: "A million dollars is going into the Vite ecosystem fund, run by the Vite core team. That’s real support for the people keeping the lights on.",
    aliases: ["09-james-fund", "05-james-coworking-fund"],
  },
];

function esc(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

async function loadJobs() {
  const jobs = [];
  for (const source of sources) {
    if (!existsSync(source.manifest)) continue;
    const manifest = JSON.parse(await readFile(source.manifest, "utf8"));
    for (const job of manifest.jobs) {
      if (!job.filename) continue;
      jobs.push({ ...job, source: source.label, outputFile: join(source.dir, job.filename) });
    }
  }
  return jobs;
}

await mkdir(siteDir, { recursive: true });
const jobs = await loadJobs();
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Image replacements</title><style>:root{color-scheme:dark;font-family:system-ui;background:#08060d;color:white}body{margin:0;padding:32px;background:#08060d}p{color:#ccc;max-width:1000px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}.card{display:block;background:#131018;border:2px solid #302a3a;border-radius:14px;overflow:hidden;cursor:pointer}.card:has(input:checked){border-color:#ff7a1a;box-shadow:0 0 0 2px rgba(255,122,26,.25)}img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}.card div{padding:10px 12px;color:#ddd}code{font-size:12px;color:#ffb86b;word-break:break-all}button{border:0;border-radius:999px;padding:10px 14px;background:#ff7a1a;color:#08060d;font-weight:700}pre{background:#131018;border:1px solid #302a3a;border-radius:14px;padding:14px;white-space:pre-wrap}</style></head><body><h1>Image replacements</h1><p>Pick replacement images for the two James scenes.</p><button id="copy">Copy selections JSON</button>${scenes.map(scene => {
  const cards = jobs.filter(job => scene.aliases.includes(job.sceneSlug)).map(job => {
    const src = relative(siteDir, job.outputFile).replaceAll("\\", "/");
    const value = `${job.source}:${job.filename}`;
    return `<label class="card"><img src="${esc(src)}"><div><input type="radio" name="${esc(scene.slug)}" value="${esc(value)}"> ${esc(job.source)} · ${esc(job.style)}<br><code>${esc(job.id)}</code></div></label>`;
  }).join("");
  return `<section><h2>${esc(scene.title)}</h2><p><strong>Statement:</strong> ${esc(scene.statement)}</p><div class="grid">${cards}</div></section>`;
}).join("")}<h2>Selections</h2><pre id="out">{}</pre><script>const key='voidzero-image-replacements';const state=JSON.parse(localStorage.getItem(key)||'{}');for(const [name,value] of Object.entries(state)){const input=document.querySelector('input[name="'+CSS.escape(name)+'"][value="'+CSS.escape(value)+'"]');if(input)input.checked=true}function render(){const s={};document.querySelectorAll('input[type=radio]:checked').forEach(i=>s[i.name]=i.value);localStorage.setItem(key,JSON.stringify(s,null,2));out.textContent=JSON.stringify(s,null,2)}document.addEventListener('change',render);copy.onclick=()=>navigator.clipboard.writeText(out.textContent);render()</script></body></html>`;
await writeFile(outPath, html);
console.log(outPath);
