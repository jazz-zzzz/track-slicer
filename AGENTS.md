# AGENTS.md

## Project: Album Extractor

A Claude Code skill that splits concert/live recordings into clean, properly-named album tracks. AI handles research and normalization; CLI handles deterministic execution.

## Architecture

- **This repo** is the canonical source for the `track-slicer` skill
- **Windows junction** at `~/.claude/skills/track-slicer/` points to this directory
- After `git pull`, the skill updates automatically with zero maintenance

## Layout

```
track-slicer/           ← repo root (this directory)
├── SKILL.md               ← skill definition (AI agent contract)
├── tool.js                ← CLI: manifest & build commands
├── src/                   ← core modules (build, discover, ffmpeg, manifest, parse, research, verify)
├── tests/                 ← Node native test suite
```

User data (`albums/`) lives at `../albums/` — outside version control.

## Commands

- `npm test` — run all tests
- `node tool.js manifest <album-dir>` — generate manifest
- `node tool.js build --manifest <path>` — split & encode
- `node tool.js lyrics --manifest <path> [--embed]` — fetch lyrics from Netease

## Junction setup

```powershell
cmd /c rmdir "$env:USERPROFILE\.claude\skills\track-slicer"
New-Item -Path "$env:USERPROFILE\.claude\skills\track-slicer" -ItemType Junction -Target "<repo-path>\track-slicer"
```

## Language

All interactions in Simplified Chinese (简体中文).
