# AGENTS.md

Technical guide for agents working on this project. Keep this file updated when the pipeline or layout changes.

## What this project is

A 12-segment captioned deepfake video announcing VoidZero joining Cloudflare, structured as a back-and-forth phone call between two characters (James and Zeke). Each segment is one spoken line, generated independently and stitched at the end.

## Pipeline overview

For each segment:

1. Image generation: `google/nano-banana-2` via Replicate, using person identity reference images plus an art-style reference image (and sometimes brand icons) to produce a 16:9 stylized portrait.
2. TTS: `minimax/speech-2.8-hd` with per-speaker cloned voice IDs.
3. Lip-sync video: `veed/fabric-1.0` (image + audio -> talking head).
4. Normalize + replace audio: ffmpeg to 1280x720 / 25fps, then swap in the clean TTS track.
5. Captions: local patched `nice-ass-captions` burns word-highlighted captions using the exact transcript.
6. Stitch: ffmpeg concat of all 12 captioned segments.

## Requirements

- Env var `REPLICATE_API_TOKEN` (read from environment; never hardcode).
- `ffmpeg` and `ffprobe` on PATH (Homebrew `ffmpeg` is fine for the build scripts; `nice-ass-captions` needs `ffmpeg-full` with libass).
- `whisper-cli` (Homebrew `whisper-cpp`) and whisper models in `~/.cache/nice-ass-captions/` (uses `ggml-large-v3-turbo.bin`).
- Node 18+ for the `.mjs` scripts (they use global `fetch`, run with `node`).
- `uv` for running the captioner (`uv run caption ...` inside `nice-ass-captions/`).

## Repo layout

```
scripts/                       generation, captioning, stitching, gallery builders
transcripts/                   exact spoken line per segment (drives captions)
assets/zeke/                   Zeke identity reference images + voice sample
jamesquickfake/                James identity reference images + voice sample mp4
site/                          local review galleries (static HTML)
data/
  candidates/                  all nano-banana-2 candidate image sets
    01-first 02-variants 03-remaining 04-remaining-v2 05-short-v3
    06-short-v4 07-v5 08-v6-focused 09-v7-adapter 10-v8-fund
  audio/                       proof/ short-v4/ v5/ + voices.json
  segments/                    per-segment finished clips: proof/ short-v4/ v5/ v5-captioned/
  final/                       stitched outputs (voidzero-v5.mp4, voidzero-v5-captioned.mp4, milestones)
  tmp/                         scratch (gitignored, recreated at runtime)
```

External dependency: several `generate-*` scripts read Zeke source images from `assets/zeke/` (copied into the repo). The original source lives outside the repo at `/Users/z/git/zeke/zekefake/assets`.

## Scripts

Generators (each calls Replicate; do not re-run casually, they cost money and overwrite):

- `generate-first-images.mjs` first 6-image probe
- `generate-variant-images.mjs` 5 styles x 6 scenes
- `generate-remaining-variant-images.mjs`, `...-v2.mjs` later scene passes
- `generate-short-v3-images.mjs`, `generate-short-v4-images.mjs` full 12-scene passes
- `generate-v5-replacement-images.mjs` rework pass for the conversational rewrite
- `generate-v6-focused-images.mjs` explainer + toothbrush rework
- `generate-v7-adapter-images.mjs` adapter scene
- `generate-v8-fund-images.mjs` money/vault concepts for the fund scene

Video pipeline:

- `build-proof-video.mjs` original 6-segment proof (legacy)
- `build-short-v4-video.mjs` 12-segment short v4 (legacy)
- `build-v5-video.mjs` current builder. Holds the `selections` map (scene -> `source:filename`) and the 12 spoken lines. `resolveSelection()` maps a source prefix (`short v3`, `short v4`, `v5`, `v6 focused`, `v7 adapter`, `v8 fund`, plus legacy `existing v4`/`new v5`/`prior v5`) to a `data/candidates/*` dir. Per-segment audio uses speaker -> voice ID; segment-specific speed/pitch tweaks live in `createTtsPrediction()`. Caches by file existence, so deleting a segment's audio/raw/video forces regeneration of just that segment.

Captioning + stitch:

- `caption-v5-final.mjs` runs the local captioner over all 12 segment clips with per-segment word counts, position, and timing mode, then writes a concat list. Edit the `segments` array to change words-per-chunk, caption position, or `whisper` vs `uniform` timing per segment.

Galleries (no API calls, safe to re-run):

- `build-all-candidates-gallery.mjs` writes `site/all-candidates.html`, grouping every candidate by the 12-scene script. `sources` lists candidate dirs/manifests; `sections[].aliases` maps historical scene slugs to current scenes; `currentSelections` marks the chosen image per scene.
- `build-image-replacement-picker.mjs` focused picker for specific scenes.

## Voices

`data/audio/voices.json` holds the cloned James voice ID. Zeke voice ID is a constant in the build scripts (`R8_JURR4DHK`). James was cloned with `minimax/voice-cloning` from the extracted `jamesquickfake/flagship-voice-sample.mp4` audio; the clone input is passed as a base64 data URL because the Replicate file URL lacks an audio extension the clone endpoint accepts.

## nice-ass-captions (local, patched)

Cloned into `nice-ass-captions/` and patched locally. Patches (subject of an upstream PR):

- `--font-size N` to scale caption text (final video uses 48).
- `--timing-mode whisper|uniform`. `uniform` distributes exact transcript words evenly across the clip duration; used for short/noisy segments where whisper DTW timing jumps around.
- Exact transcript forcing: when `--transcript` is given, the displayed words come from the transcript (correct spelling/punctuation) mapped onto whisper timings via `force_transcript_words()` with canonical aliasing (e.g. `Vite` <-> `veet`, `Vitest` <-> `veet test`, `Vite+` <-> `veet plus`).
- Paragraph-break chunking: blank lines in a transcript force caption-line breaks (`chunk_words_with_transcript_groups`). Used to keep `Thanks for the update, babe!` on its own line.
- `repair_word_timings()` removes zero-duration/overlapping word spans that made highlights look stuck or skip.
- `--hold-last` keeps the final caption visible until the end of the clip.
- UTF-8 tolerance: whisper `.wts` is read with `errors="replace"`.
- DTW preset mapping: `large-v3-turbo` model maps to the `large.v3.turbo` DTW preset name that `whisper-cli` expects.

The captioner is a separate git repo and is gitignored here; do not commit it into this repo.

## Reproduce / re-run

Set `REPLICATE_API_TOKEN`, then from repo root:

- Rebuild the current uncaptioned video: `node scripts/build-v5-video.mjs`
- Re-caption + write concat list: `node scripts/caption-v5-final.mjs`
- Stitch captioned: ffmpeg concat of `data/segments/v5-captioned/*.mp4` into `data/final/voidzero-v5-captioned.mp4`
- Regenerate the review gallery: `node scripts/build-all-candidates-gallery.mjs` then serve `site/` with a static server.

To redo one segment, delete that segment's files under `data/audio/v5/`, `data/tmp/v5/`, and `data/segments/v5/`, then re-run the builder. Image regeneration scripts cost money; prefer reusing existing candidates from `data/candidates/`.

## Gotchas

- Image-generation scripts hit the Replicate API and incur cost. Treat them as expensive.
- Manifests store absolute `outputFile` paths from when they ran; galleries recompute paths from `filename` + the candidate dir, so moving folders is safe as long as the gallery `sources` are updated.
- Passing `--position top` (and other flags) through a shell loop needs careful quoting; `caption-v5-final.mjs` passes args as an array to avoid that.
