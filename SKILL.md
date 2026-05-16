---
name: album-extractor
description: Use when the user has a concert/live audio or video file with fuzzy timestamps and wants to split it into a clean, normalized album with cover art — for Apple Music (ALAC) or personal archive (FLAC). Triggers on requests like "split this concert", "extract tracks from this live", "make an album from this recording", or when the user provides timestamps.md alongside a concert source file.
---

# Album Extractor

Split concert/live recordings into album tracks. AI handles research and normalization; CLI handles deterministic split/encode. The manifest is the contract. Detailed reference: `docs/reference.md`.

**CRITICAL: The CLI is the contract.** Do NOT read source code before invoking commands. Run `node tool.js <command>` directly.

## When to Use

- Concert/live audio or video + timestamps.md + cover image
- User wants split tracks with metadata, cover art, normalized titles
- User mentions Apple Music, ALAC, FLAC, or "like an official album"

**Not for:** Studio albums, single-track extraction, recordings without timestamps.

## Workflow

```
1. COLLECT  → Discover artist, album name, source, timestamps, cover from directory.
              Run `node tool.js manifest <album-dir>` to generate draft manifest.
2. RESEARCH → Batch-search official setlist first (see reference for search priority).
              Only search individually for unmatched tracks. Use credibility tiers (see reference).
3. REVIEW   → Run `node tool.js summary --manifest <path>` to show diff.
              Present only needs_review items to user. Set "approved": true when confirmed.
4. BUILD    → `node tool.js build --manifest <path> --no-flac`
              Add `--use-refalac` for 96kHz or chapter-heavy sources.
              After build: offer to move ALAC to Apple Music.
5. LYRICS   → `node tool.js lyrics --manifest <path>` fetches from Netease.
              Add `--embed` to write lyrics into audio file metadata (ALAC/FLAC).
```

## Core Principles

1. **Do not add information.** Every `normalizedTitle` and `albumTitle` must link to an evidence URL.
2. **Every correction gets a note.** When normalized ≠ raw, explain why.
3. **When uncertain, preserve the raw value.** Flag `needs_review` — never guess.
4. **Preserve the intro.** If Track 1 ≠ 00:00, prepend an Intro track (trackKind: "intro").

## Key Rules

- **Lyrics from Netease Cloud Music.** Primary source via `music.163.com` API. Genius as fallback (requires proxy). `lyricSource` records origin; credits (作词/作曲/编曲) are auto-stripped. Use `--embed` to write lyrics into audio `©lyr` metadata. Apple Music shows custom-embedded lyrics as small-font static text; full-screen TTML sync is Apple-catalog-exclusive (platform limitation, verified).
- **Batch research.** Search for official setlist first. If not found, cross-reference with studio album tracklists. Only search individually as last resort.
- **Show diff, not full JSON.** Use `summary` command for review. Only show changed/needs_review tracks.
- **`normalizationStatus` and `trackKind`** fields carry state — use them instead of natural language explanations.
- **Refer to `docs/reference.md`** for credibility tiers, manifest field tables, error codes, and Pre-Flight setup.
- **Never download source files.** All audio/video must be user-provided.

## Commands

```bash
node tool.js manifest <album-dir> [--artist <name>]           # generate draft manifest
node tool.js summary --manifest <manifest.json>               # show review summary (diff only)
node tool.js build --manifest <manifest.json> [--no-flac] [--use-refalac]  # split & encode
node tool.js lyrics --manifest <manifest.json> [--embed]      # fetch lyrics from Netease
```

## Limits

- Source files and timestamps must be user-provided. The tool never downloads.
- No lossy-to-lossless upscaling. AAC source → ALAC container is transparent repackaging.
- Output always goes to new directories. Original files untouched.
- Video sources (.mkv, .mp4) supported via `-map 0:a`. Warn if audio track is lossy.
- `"approved": true` required before build runs.
