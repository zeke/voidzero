// Builds the full looping final video:
//   intro + 12 captioned segments + outro (intro reversed)
// then mixes audio: original dialogue + ducked music bed + a ringback tone
// over the intro. Writes data/final/voidzero-final-NNN.mp4 (auto-incrementing).
//
// Re-runnable. Tweak the constants below, re-run, get a new numbered file.
//
// Requires ffmpeg/ffprobe on PATH. No API calls, no cost.

import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const INTRO = join(ROOT, "intro/out/intro.mp4");
const OUTRO = join(ROOT, "intro/out/outro.mp4");
const SEG_DIR = join(ROOT, "data/segments/v5-captioned");
const MUSIC = join(ROOT, "data/music/pancake-parade.mp3");
const RING = join(ROOT, "data/sfx/originals/ringback-us.wav");
const TMP = join(ROOT, "data/tmp/final-build");
const FINAL_DIR = join(ROOT, "data/final");

// --- tunables -------------------------------------------------------------
// Ringback (plays over the intro, like the call ringing before pickup).
const RING_CROP = 0; // crop this much off the start of ringback-us
const RING_FADE_IN = 0.15; // quick fade-in
const RING_PLAY = 3.1; // seconds of ring audio to use (≈ intro length)
const RING_FADE_OUT = 0.4; // fades out as segment 1 begins
const RING_GAIN = 0.6; // ring level in the mix

// Music bed (fades in from the start, ducks under dialogue, fades out at end).
const MUSIC_GAIN = 0.3; // level when no one is speaking (intro/outro)
const MUSIC_FADE_IN = 5.0; // slow fade-in from t=0
const MUSIC_FADE_OUT = 3.0; // fade-out over the final seconds (the outro)
// Sidechain ducking: music dips while dialogue is present.
const DUCK_THRESHOLD = 0.05;
const DUCK_RATIO = 8;
const DUCK_ATTACK = 20; // ms
const DUCK_RELEASE = 400; // ms

// Match the captioned segments so the concat is a stream copy.
const A_RATE = 32000;
const A_CH = 1;
// --------------------------------------------------------------------------

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
  if (r.status !== 0) {
    process.stderr.write(r.stderr?.toString() ?? "");
    throw new Error(`${cmd} exited ${r.status}`);
  }
  return r.stdout.toString().trim();
}

function ffprobeDuration(file) {
  return parseFloat(
    run("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "csv=p=0",
      file,
    ]),
  );
}

function matchClip(src, dst) {
  // Transcode a (possibly silent / mismatched) clip to the segments' params
  // and give it a silent mono AAC track so concat -c copy works.
  run("ffmpeg", [
    "-y", "-loglevel", "error",
    "-i", src,
    "-f", "lavfi", "-i", `anullsrc=channel_layout=mono:sample_rate=${A_RATE}`,
    "-map", "0:v:0", "-map", "1:a:0",
    "-c:v", "libx264", "-profile:v", "high", "-level", "3.1",
    "-pix_fmt", "yuv420p", "-r", "25", "-video_track_timescale", "12800",
    "-c:a", "aac", "-ar", String(A_RATE), "-ac", String(A_CH),
    "-shortest",
    dst,
  ]);
}

function nextOutputPath() {
  const re = /^voidzero-final-(\d+)\.mp4$/;
  let max = 0;
  for (const f of readdirSync(FINAL_DIR)) {
    const m = f.match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const n = String(max + 1).padStart(3, "0");
  return join(FINAL_DIR, `voidzero-final-${n}.mp4`);
}

// --- 1. matched intro / outro ---------------------------------------------
mkdirSync(TMP, { recursive: true });
const introMatched = join(TMP, "intro-matched.mp4");
const outroMatched = join(TMP, "outro-matched.mp4");
console.log("Transcoding intro/outro to match segments...");
matchClip(INTRO, introMatched);
matchClip(OUTRO, outroMatched);

// --- 2. concat (stream copy) ----------------------------------------------
const segFiles = readdirSync(SEG_DIR)
  .filter((f) => /^\d\d-.*\.mp4$/.test(f))
  .sort();
const concatList = join(TMP, "concat.txt");
const lines = [
  introMatched,
  ...segFiles.map((f) => join(SEG_DIR, f)),
  outroMatched,
].map((p) => `file '${p}'`);
writeFileSync(concatList, lines.join("\n") + "\n");

const base = join(TMP, "base.mp4");
console.log(`Concatenating ${segFiles.length} segments + intro + outro...`);
run("ffmpeg", [
  "-y", "-loglevel", "error",
  "-f", "concat", "-safe", "0",
  "-i", concatList,
  "-c", "copy",
  base,
]);
const total = ffprobeDuration(base);
console.log(`Base video: ${total.toFixed(2)}s`);

// --- 3. mix audio ----------------------------------------------------------
const musicFadeOutStart = Math.max(0, total - MUSIC_FADE_OUT);
const ringFadeOutStart = Math.max(0, RING_PLAY - RING_FADE_OUT);

const filter = [
  // duplicate dialogue: one to mix, one as the ducking key
  `[0:a]aresample=${A_RATE},asplit=2[dia][key]`,
  // music bed: audio only, level, slow fade in, fade out at end, trim to length
  `[1:a]aresample=${A_RATE},volume=${MUSIC_GAIN},` +
    `afade=t=in:st=0:d=${MUSIC_FADE_IN},` +
    `afade=t=out:st=${musicFadeOutStart.toFixed(3)}:d=${MUSIC_FADE_OUT},` +
    `atrim=0:${total.toFixed(3)},asetpts=N/SR/TB[mus]`,
  // duck music under dialogue
  `[mus][key]sidechaincompress=threshold=${DUCK_THRESHOLD}:ratio=${DUCK_RATIO}:` +
    `attack=${DUCK_ATTACK}:release=${DUCK_RELEASE}[duck]`,
  // ringback over the intro
  `[2:a]aresample=${A_RATE},atrim=${RING_CROP}:${(RING_CROP + RING_PLAY).toFixed(3)},` +
    `asetpts=N/SR/TB,volume=${RING_GAIN},` +
    `afade=t=in:st=0:d=${RING_FADE_IN},` +
    `afade=t=out:st=${ringFadeOutStart.toFixed(3)}:d=${RING_FADE_OUT}[ring]`,
  // sum (no renormalize), then limit to avoid clipping
  `[dia][duck][ring]amix=inputs=3:normalize=0:duration=longest[mixed]`,
  `[mixed]alimiter=limit=0.95[out]`,
].join(";");

const out = nextOutputPath();
console.log("Mixing dialogue + ducked music + ringback...");
run("ffmpeg", [
  "-y", "-loglevel", "error",
  "-i", base,
  "-i", MUSIC,
  "-i", RING,
  "-filter_complex", filter,
  "-map", "0:v:0", "-map", "[out]",
  "-c:v", "copy",
  "-c:a", "aac", "-ar", String(A_RATE), "-ac", String(A_CH), "-b:a", "192k",
  "-movflags", "+faststart",
  out,
]);

console.log(`\nDone: ${out}`);
console.log(`Duration: ${ffprobeDuration(out).toFixed(2)}s`);
