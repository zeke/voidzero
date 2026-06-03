import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = new URL("..", import.meta.url).pathname;
const captionDir = join(root, "nice-ass-captions");
const inputDir = join(root, "data", "segments", "v5");
const outputDir = join(root, "data", "segments", "v5-captioned");
const transcriptDir = join(root, "transcripts");

const prompt = "Cloudflare, VoidZero, Vite, Vitest, Rolldown, Oxc, Vite+, Vite core team, Vue, Astro, React Router, TanStack Start, Zeke, James, babe";
// [video, transcript, words, position, timingMode, model?]. model defaults to large-v3-turbo.
const DEFAULT_MODEL = "large-v3-turbo";
const segments = [
  ["01-01-james-predawn-desk.mp4", "01-james-predawn-desk.txt", 5, "bottom", "whisper"],
  ["02-01-zeke-bed-phone.mp4", "02-zeke-bed-phone.txt", 4, "top", "whisper", "medium.en"],
  ["03-02-james-kitchen-laptops.mp4", "03-james-kitchen-laptops.txt", 5, "bottom", "whisper", "large-v3"],
  ["04-02-zeke-bathroom-toothbrush.mp4", "04-zeke-bathroom-toothbrush.txt", 5, "bottom", "whisper"],
  ["05-05-james-vite-explainer.mp4", "05-james-vite-explainer.txt", 5, "bottom", "whisper"],
  ["06-03-zeke-kitchen-coffee.mp4", "06-zeke-kitchen-coffee.txt", 6, "bottom", "whisper"],
  ["07-07-james-open-commitment.mp4", "07-james-open-commitment.txt", 5, "bottom", "whisper"],
  ["08-08-zeke-big-huh.mp4", "08-zeke-big-huh.txt", 5, "bottom", "uniform"],
  ["09-09-james-fund.mp4", "09-james-fund.txt", 6, "bottom", "whisper", "large-v3"],
  ["10-05-zeke-garden-awake.mp4", "10-zeke-garden-awake.txt", 5, "bottom", "whisper"],
  ["11-11-james-adapter-dance.mp4", "11-james-adapter-dance.txt", 6, "bottom", "whisper"],
  ["12-12-zeke-finale.mp4", "12-zeke-finale.txt", 6, "bottom", "whisper", "large-v3"],
];

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit" });
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
  });
}

await mkdir(outputDir, { recursive: true });
for (const [video, transcript, words, position, timingMode, model] of segments) {
  const args = [
    "run", "caption",
    join(inputDir, video),
    "--output", join(outputDir, video),
    "--palette-colors",
    "--transcript", join(transcriptDir, transcript),
    "--prompt", prompt,
    "--model", model ?? DEFAULT_MODEL,
    "--font-size", "48",
    "--words", String(words),
    "--hold-last",
    "--timing-mode", timingMode,
  ];
  if (position !== "bottom") args.push("--position", position);
  await run("uv", args, captionDir);
}

await writeFile(join(outputDir, "concat.txt"), segments.map(([video]) => `file '${join(outputDir, video)}'`).join("\n") + "\n");
