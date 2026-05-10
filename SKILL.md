---
name: album-extractor
description: Use when the user has a concert/live audio or video file with fuzzy timestamps and wants to split it into a clean, normalized album with cover art — for Apple Music (ALAC) or personal archive (FLAC). Triggers on requests like "split this concert", "extract tracks from this live", "make an album from this recording", or when the user provides timestamps.md alongside a concert source file.
---

# Album Extractor

## Overview

Split concert/live recordings into clean, properly-named album tracks. The AI agent handles research and normalization; CLI scripts handle deterministic execution. The manifest is the contract between them.

**CRITICAL: The CLI is the contract. Do NOT read source code before invoking commands.** Run `node tool.js <command>` directly. Only read source files if a command fails with an unexpected error.

## When to Use

- User has a concert audio/video + timestamps (handwritten, possibly noisy)
- User wants split tracks with metadata, cover art, and normalized titles
- User mentions Apple Music, ALAC, FLAC, or "like an official album"
- User provides a directory containing source audio, cover image, and timestamps.md

**Not for:** Studio albums that don't need splitting, single-track extraction, or recordings without any timestamp reference.

## Workflow

```
1. COLLECT  → Discover artist, album name, source file, timestamps, cover.
2. RESEARCH → Web-search the official setlist AND album title using credibility tiers.
              Normalize albumTitle (e.g. directory "turn 2024" → official "SAKANAQUARIUM 2024 turn").
              Match raw track titles to official names. Normalize only from A/B/C sources.
3. REVIEW   → Present manifest (with normalized album + track titles). User confirms or edits.
              Set "approved": true when ready.
4. BUILD    → Run `node tool.js build --manifest <path> --no-flac`.
              10-worker pool processes tracks in parallel.
              Only ALAC is built when `--no-flac` is set (recommended to save space).
              Add `--use-refalac` for sources with high sample rate (96kHz) or embedded chapters.
              Always overwrites — re-run produces fresh output.
              After build, ask: "Move to Apple Music auto-import folder?"
```

## Credibility Tiers

| Tier | Source | Action |
|------|--------|--------|
| **A** | Artist/label official site, official Blu-ray/CD product page | Use directly as evidenceUrl |
| **B** | Spotify, Apple Music, ORICON, Natalie.mu | Use, note "source confidence: high" |
| **C** | Wikipedia (with citations), setlist.fm (multiple confirmers) | Use only if A/B unavailable, mark "needs verification" |
| **D** | Forums, comments, search result snippets | NEVER use for normalization. Use only as discovery hints. |

**Search strategy:** Use the artist's native language first (Japanese artists → search in Japanese, `.jp` domains). This does NOT mean translating titles — if the official title is "hana", keep "hana".

## Core Principles

1. **Do not add information.** `normalizedTitle` and `albumTitle` must be verifiable from an evidence URL. No romanizations, translations, or unsourced annotations.
2. **Do not rewrite titles.** Official title is "hana"? Keep "hana". Do not convert to 花 or Flower.
3. **Album title gets the same normalization.** The directory name is a hint — the official album title comes from research.
4. **Every correction gets a note.** When a normalized field differs from the raw input, explain why in `notes`.
5. **Code is deterministic, AI is fuzzy.** Scripts parse, split, and encode. AI searches, matches, and normalizes.
6. **When uncertain, preserve the raw value.** Flag it "needs review" rather than guessing.
7. **Preserve the intro.** If Track 1's start time is not 00:00, prepend an "Intro" track from 00:00 to the first timestamp. The AI agent adds it manually during manifest construction.

## Pre-Flight Checks

1. **File paths must be ASCII-safe.** Rename files with curly quotes, fullwidth chars, or special Unicode before processing.
2. **ffmpeg must be reachable.** Set `FFMPEG_HOME` env var, or place ffmpeg.exe in `~/Downloads/`.
3. **Cover must be a real image file** (jpg/png).
4. **refalac (if using `--use-refalac`).** Download `qaac` from [github.com/nu774/qaac](https://github.com/nu774/qaac) and extract to `~/Downloads/qaac/`. Only needed for sources that trigger ffmpeg ALAC compatibility issues (96kHz sample rate, embedded chapters).

## CLI Reference

### Manifest (generate reviewable track list)

```bash
# Directory mode — auto-discovers source, cover, timestamps in album dir
node tool.js manifest <album-dir> [--artist <name>]

# Explicit mode — all paths specified
node tool.js manifest \
  --artist <name> --album <title> \
  --source <audio.flac> --timestamps <timestamps.md> --cover <cover.jpg> \
  [--output <dir>]
```

The manifest command applies local title cleaning (strips translations, marks MC/talk tracks). The AI agent must do the full research and normalization — editing `normalizedTitle`, `evidenceUrl`, and `notes` in the manifest before approving.

### Build (split and encode)

```bash
node tool.js build --manifest <manifest.json> [--no-flac] [--use-refalac]
```

Requires `"approved": true` in manifest. Always overwrites existing output files. Produces `<output>/ALAC/*.m4a`, and `<output>/tracks/*.flac` unless `--no-flac` is set.

`--use-refalac` uses Apple's reference ALAC encoder instead of ffmpeg native. Use for 96kHz sources or sources with embedded chapters that cause ffmpeg ALAC output to be rejected by Apple Music.

## Output Structure

```
<output-dir>/          ← default: <source-dir>/<source-filename-stem>/
  manifest.json
  tracks/
    01_Title.flac
    02_Title.flac
    ...
  ALAC/
    01_Title.m4a       ← with attached_pic disposition for Apple Music
    02_Title.m4a
    ...
```

## Manifest Key Fields

| Field | Description |
|-------|-------------|
| `approved` | Set to `true` by AI after human review |
| `albumTitle` | Official album title from research (not the raw directory name) |
| `albumEvidenceUrl` | Source URL for the official album title |
| `artist` | Normalized artist name |
| `year` | Concert year (AI fills from research) |
| `notes` | Album-level notes (research summary, normalization decisions) |
| `tracks[].rawTitle` | Original text from timestamps — never modified |
| `tracks[].normalizedTitle` | Official title, verifiable from evidenceUrl |
| `tracks[].evidenceUrl` | Source URL for the normalized title |
| `tracks[].notes` | Correction explanations, flags like "needs review" |

## Boundaries

- Does NOT download source files. User provides them.
- Does NOT do lossy transcoding. FLAC ↔ ALAC is lossless container conversion.
- Does NOT work without timestamps. A timestamps.md (or equivalent) is required.
- Does NOT modify original files. All output goes to new directories.
- Video sources (.mkv, .mp4, .mov, .ts, .m2ts) are supported. Audio stream is extracted via `-map 0:a`. Warn if the audio track is lossy (AAC/Opus).
