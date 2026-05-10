const fs = require('node:fs');

function summarizeBuild({ expectedCount, generatedFlacCount, generatedAlacCount, skipFlac }) {
  const flacOk = skipFlac || expectedCount === generatedFlacCount;
  const ok = flacOk && expectedCount === generatedAlacCount;

  const parts = [];
  if (!skipFlac) parts.push(`${generatedFlacCount} FLAC`);
  parts.push(`${generatedAlacCount} ALAC`);

  return { ok, message: parts.join(', ') };
}

function verifyOutput({ flacDir, alacDir, manifest, skipFlac }) {
  const flacFiles = (flacDir && fs.existsSync(flacDir))
    ? fs.readdirSync(flacDir).filter((f) => f.endsWith('.flac'))
    : [];
  const alacFiles = fs.readdirSync(alacDir).filter((f) => f.endsWith('.m4a'));

  return summarizeBuild({
    expectedCount: manifest.tracks.length,
    generatedFlacCount: flacFiles.length,
    generatedAlacCount: alacFiles.length,
    skipFlac: skipFlac || false,
  });
}

module.exports = { summarizeBuild, verifyOutput };
