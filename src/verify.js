const fs = require('node:fs');
const path = require('node:path');

function summarizeBuild({ expectedCount, generatedFlacCount, generatedAlacCount, lyricFailures, skipFlac }) {
  const flacOk = skipFlac || expectedCount === generatedFlacCount;
  const ok = flacOk && expectedCount === generatedAlacCount && lyricFailures.length === 0;

  const parts = [];
  if (!skipFlac) parts.push(`${generatedFlacCount} FLAC`);
  parts.push(`${generatedAlacCount} ALAC`);
  if (lyricFailures.length > 0) parts.push(`${lyricFailures.length} lyric failures`);

  return { ok, message: parts.join(', ') };
}

function verifyOutput({ flacDir, alacDir, manifest, skipFlac }) {
  const musicTracks = manifest.tracks.filter((t) => !t.lyricLookupTitle || t.lyricLookupTitle !== null);

  const flacFiles = (flacDir && fs.existsSync(flacDir))
    ? fs.readdirSync(flacDir).filter((f) => f.endsWith('.flac'))
    : [];
  const alacFiles = fs.readdirSync(alacDir).filter((f) => f.endsWith('.m4a'));

  const expectedCount = manifest.tracks.length;
  const lyricFailures = [];

  if (manifest.wantsLyrics) {
    for (const track of musicTracks) {
      if (!track.lyricText) {
        lyricFailures.push({ track: track.normalizedTitle, reason: 'No lyric text in manifest' });
      }
    }
  }

  return summarizeBuild({
    expectedCount,
    generatedFlacCount: flacFiles.length,
    generatedAlacCount: alacFiles.length,
    lyricFailures,
    skipFlac: skipFlac || false,
  });
}

module.exports = { summarizeBuild, verifyOutput };
