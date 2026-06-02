import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const siteDir = join(root, "site");
const outPath = join(siteDir, "all-candidates.html");

const sources = [
  ["first", "data/candidates/01-first", "data/candidates/01-first/first-images-manifest.json"],
  ["v1 variants", "data/candidates/02-variants", "data/candidates/02-variants/manifest.json"],
  ["remaining v1", "data/candidates/03-remaining", "data/candidates/03-remaining/manifest.json"],
  ["remaining v2", "data/candidates/04-remaining-v2", "data/candidates/04-remaining-v2/manifest.json"],
  ["short v3", "data/candidates/05-short-v3", "data/candidates/05-short-v3/manifest.json"],
  ["short v4", "data/candidates/06-short-v4", "data/candidates/06-short-v4/manifest.json"],
  ["v5", "data/candidates/07-v5", "data/candidates/07-v5/manifest.json"],
  ["v6 focused", "data/candidates/08-v6-focused", "data/candidates/08-v6-focused/manifest.json"],
  ["v7 adapter", "data/candidates/09-v7-adapter", "data/candidates/09-v7-adapter/manifest.json"],
  ["v8 fund", "data/candidates/10-v8-fund", "data/candidates/10-v8-fund/manifest.json"],
];

const sections = [
  {
    slug: "01-james-predawn-desk",
    title: "1. James",
    statement: "Wake up babe. VoidZero just joined Cloudflare.",
    context: "Predawn desk, phone call.",
    aliases: ["01-james-wakeup-phone", "01-james-predawn-desk"],
  },
  {
    slug: "01-zeke-bed-phone",
    title: "2. Zeke",
    statement: "Good morning, James... You mean the Vite guys? And since when do you call me babe?",
    context: "Waking in bed, phone call.",
    aliases: ["01-zeke-bed-phone"],
  },
  {
    slug: "02-james-kitchen-laptops",
    title: "3. James",
    statement: "Sorry, I got excited. Yes, the Vite people. The team behind Vite, Vitest, Rolldown, Oxc, Vite+, all of it.",
    context: "Kitchen coffee with devices.",
    aliases: ["02-james-matrix-news", "02-james-kitchen-laptops"],
  },
  {
    slug: "02-zeke-bathroom-toothbrush",
    title: "4. Zeke",
    statement: "Remind me. What’s Vite again?",
    context: "Bathroom, robe, toothbrush.",
    aliases: ["02-zeke-bathroom-robe", "02-zeke-bathroom-toothbrush"],
  },
  {
    slug: "05-james-vite-explainer",
    title: "5. James",
    statement: "Have you been living under a rock, my guy? Vite is the de facto build tool of the JavaScript ecosystem. Fast dev server, fast feedback loop, used by frameworks like Vue, Astro, React Router, TanStack Start. Ring a bell?",
    context: "James explains what Vite is.",
    aliases: ["05-james-vite-explainer"],
  },
  {
    slug: "03-zeke-kitchen-coffee",
    title: "6. Zeke",
    statement: "Oh yeah. Sure. Sure. I know Vite. Obviously. Use it all the time. Cool. So what happens now that they’ve joined Cloudflare?",
    context: "Kitchen, pouring coffee.",
    aliases: ["03-zeke-kitchen-coffee"],
  },
  {
    slug: "07-james-open-commitment",
    title: "7. James",
    statement: "The tooling stays open source, MIT licensed, vendor agnostic, and community driven. Same team, same commitment: keep it that way.",
    context: "Open-source commitment.",
    aliases: ["03-james-open-source-laptop", "03-james-standing-desk", "07-james-open-commitment"],
  },
  {
    slug: "08-zeke-big-huh",
    title: "8. Zeke",
    statement: "Huh, that’s actually big. That’s. Hmmmmm.",
    context: "Garden, absorbing news.",
    aliases: ["04-zeke-plant-garden", "04-zeke-garden-coffee", "08-zeke-big-huh"],
  },
  {
    slug: "09-james-fund",
    title: "9. James",
    statement: "A million dollars is going into the Vite ecosystem fund, run by the Vite core team. That’s real support for the people keeping the lights on.",
    context: "Maintainer funding metaphor.",
    aliases: ["05-james-ecosystem-fund", "05-james-coworking-fund", "09-james-fund"],
  },
  {
    slug: "05-zeke-garden-awake",
    title: "10. Zeke",
    statement: "A million dollars for maintainers? Wow. Okay. Now I’m awake.",
    context: "Awake in garden.",
    aliases: ["05-zeke-maintainer-garden", "05-zeke-garden-awake"],
  },
  {
    slug: "11-james-adapter-dance",
    title: "11. James",
    statement: "Basically, Vite stays portable, and Cloudflare does the adapting. Which is good, because developers have already done enough adapting for one lifetime.",
    context: "Less adapter dance.",
    aliases: ["06-james-workerd-lab", "06-james-daylight-desk", "08-james-fullstack-city", "11-james-adapter-dance"],
  },
  {
    slug: "12-zeke-finale",
    title: "12. Zeke",
    statement: "Gotcha. Vite stays Vite, maintainers get paid, the build tools are safe, and life keeps getting better. Thanks for the update, babe!",
    context: "Garden finale.",
    aliases: ["06-zeke-train-local-prod", "06-zeke-garden-finale", "08-zeke-finale-platform-exit", "12-zeke-finale"],
  },
];

const currentSelections = {
  "01-james-predawn-desk": "01-james-predawn-desk__style-19__geg9003mexrmt0cygnm9fbw958.jpeg",
  "01-zeke-bed-phone": "01-zeke-bed-phone__style-07__8efr40kmfdrmw0cygnm82pdkc4.jpeg",
  "02-james-kitchen-laptops": "02-james-kitchen-laptops__style-19__chpz6fvmdhrmw0cygnm9vzdgs8.jpeg",
  "02-zeke-bathroom-toothbrush": "02-zeke-bathroom-toothbrush__style-22__y50wrme8b5rmt0cyh648g9h9pc.jpeg",
  "05-james-vite-explainer": "05-james-vite-explainer__style-19__yczmb8abh1rmt0cyh5psye8h9m.jpeg",
  "03-zeke-kitchen-coffee": "03-zeke-kitchen-coffee__style-11__2g24mavmq9rmw0cygnmb7em1j0.jpeg",
  "07-james-open-commitment": "07-james-open-commitment__style-15__y4hn7ftbv5rmr0cyh5pv3h8yhm.jpeg",
  "08-zeke-big-huh": "08-zeke-big-huh__style-07__35acwnjbt9rmr0cyh5pvwx3cgc.jpeg",
  "09-james-fund": "09-james-fund__style-07__sqyzwwabwxrmr0cyh5psa2h2j4.jpeg",
  "05-zeke-garden-awake": "05-zeke-garden-awake__style-13__a55x4mbmz9rmt0cygnm9q4c694.jpeg",
  "11-james-adapter-dance": "11-james-adapter-dance__style-22__p3vrf1qb3srmy0cyh6ftfvgbf8.jpeg",
  "12-zeke-finale": "06-zeke-garden-finale__style-19__rwd63wvmxhrmw0cygnmahfdwdg.jpeg",
};

function esc(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

async function loadCandidates() {
  const candidates = [];
  for (const [label, dirRel, manifestRel] of sources) {
    const manifestPath = join(root, manifestRel);
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    for (const job of manifest.jobs ?? []) {
      const filename = job.filename || (job.outputFile ? job.outputFile.split("/").pop() : null);
      if (!filename) continue;
      const outputFile = join(root, dirRel, filename);
      if (!existsSync(outputFile)) continue;
      candidates.push({
        source: label,
        sceneSlug: job.sceneSlug || job.slug,
        filename,
        outputFile,
        style: job.style || "n/a",
        id: job.id || "n/a",
        concept: job.concept || "",
      });
    }
  }
  return candidates;
}

await mkdir(siteDir, { recursive: true });
const candidates = await loadCandidates();
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>All VoidZero Candidates</title><style>:root{color-scheme:dark;font-family:system-ui;background:#08060d;color:white}body{margin:0;padding:32px;background:radial-gradient(circle at top left,#24202e,#08060d 420px)}h1{margin:0 0 8px}.intro,p{color:#ccc;max-width:1100px}.toolbar{position:sticky;top:0;background:rgba(8,6,13,.9);backdrop-filter:blur(12px);padding:12px 0;border-bottom:1px solid #292432;z-index:1}section{margin:40px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}.card{display:block;background:#131018;border:2px solid #302a3a;border-radius:14px;overflow:hidden;cursor:pointer}.card.current{border-color:#20c997}.card:has(input:checked){border-color:#ff7a1a;box-shadow:0 0 0 2px rgba(255,122,26,.25)}img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}.meta{padding:10px 12px;color:#ddd}.source{color:#aaa;font-size:12px}.currentBadge{color:#20c997;font-weight:700}code{font-size:11px;color:#ffb86b;word-break:break-all}button{border:0;border-radius:999px;padding:10px 14px;background:#ff7a1a;color:#08060d;font-weight:700}pre{background:#131018;border:1px solid #302a3a;border-radius:14px;padding:14px;white-space:pre-wrap}</style></head><body><h1>All VoidZero candidate images</h1><p class="intro">Every image candidate generated so far, grouped by the current 12-scene script. Green border means current selected image.</p><div class="toolbar"><button id="copy">Copy selections JSON</button></div>${sections.map(section => {
  const matches = candidates.filter(candidate => section.aliases.includes(candidate.sceneSlug));
  const cards = matches.map(candidate => {
    const src = relative(siteDir, candidate.outputFile).replaceAll("\\", "/");
    const current = candidate.filename === currentSelections[section.slug];
    const value = `${candidate.source}:${candidate.filename}`;
    return `<label class="card${current ? " current" : ""}"><img src="${esc(src)}"><div class="meta"><input type="radio" name="${esc(section.slug)}" value="${esc(value)}" ${current ? "checked" : ""}> ${current ? `<span class="currentBadge">current</span> · ` : ""}${esc(candidate.style)}${candidate.concept ? ` · ${esc(candidate.concept)}` : ""}<br><span class="source">${esc(candidate.source)} · ${esc(candidate.sceneSlug)}</span><br><code>${esc(candidate.id)}</code></div></label>`;
  }).join("");
  return `<section><h2>${esc(section.title)}</h2><p><strong>Statement:</strong> ${esc(section.statement)}</p><p><strong>Context:</strong> ${esc(section.context)} · ${matches.length} candidates</p><div class="grid">${cards}</div></section>`;
}).join("")}<h2>Selections</h2><pre id="out">{}</pre><script>const key='voidzero-all-candidates-selection';function render(){const s={};document.querySelectorAll('input[type=radio]:checked').forEach(i=>s[i.name]=i.value);localStorage.setItem(key,JSON.stringify(s,null,2));out.textContent=JSON.stringify(s,null,2)}const saved=JSON.parse(localStorage.getItem(key)||'{}');for(const [name,value] of Object.entries(saved)){const input=document.querySelector('input[name="'+CSS.escape(name)+'"][value="'+CSS.escape(value)+'"]');if(input)input.checked=true}document.addEventListener('change',render);copy.onclick=()=>navigator.clipboard.writeText(out.textContent);render()</script></body></html>`;
await writeFile(outPath, html);
console.log(outPath);
