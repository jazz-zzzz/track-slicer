function sanitizeFilename(title) {
  return title.replace(/[<>:"/\\|?*]/g, '_');
}

function buildFlacCommand({
  sourceAudioPath,
  coverPath,
  outputPath,
  track,
  albumTitle,
  artist,
  year,
}) {
  const args = [
    '-y',
    '-i', sourceAudioPath,
    '-i', coverPath,
    '-ss', track.start,
  ];

  if (track.end) args.push('-to', track.end);

  args.push(
    '-map_chapters', '-1',
    '-map', '0:a',
    '-map', '1:v',
    '-c:a', 'flac',
    '-compression_level', '8',
    '-c:v', 'copy',
    '-disposition:v:0', 'attached_pic',
    '-metadata', `title=${track.normalizedTitle}`,
    '-metadata', `track=${String(track.number)}`,
    '-metadata', `album=${albumTitle}`,
    '-metadata', `artist=${artist}`,
  );

  if (year) args.push('-metadata', `date=${String(year)}`);
  if (track.lyricText) args.push('-metadata', `LYRICS=${track.lyricText}`);

  args.push(outputPath);
  return args;
}

function buildAlacCommand({
  sourceAudioPath,
  coverPath,
  outputPath,
  track,
  albumTitle,
  artist,
  year,
}) {
  const args = [
    '-y',
    '-i', sourceAudioPath,
    '-i', coverPath,
    '-ss', track.start,
  ];

  if (track.end) args.push('-to', track.end);

  args.push(
    '-map_chapters', '-1',
    '-map', '0:a',
    '-map', '1:v',
    '-c:a', 'alac',
    '-c:v', 'copy',
    '-disposition:v:0', 'attached_pic',
    '-metadata', `title=${track.normalizedTitle}`,
    '-metadata', `track=${String(track.number)}`,
    '-metadata', `album=${albumTitle}`,
    '-metadata', `artist=${artist}`,
  );

  if (year) args.push('-metadata', `date=${String(year)}`);
  if (track.lyricText) args.push('-metadata', `lyrics=${track.lyricText}`);

  args.push(outputPath);
  return args;
}

// Refalac pipeline (Apple reference ALAC encoder) — for sources that
// trigger ffmpeg ALAC compatibility issues (e.g. high sample rate).
function buildExtractWavCommand({
  sourceAudioPath,
  outputPath,
  track,
}) {
  const args = [
    '-y',
    '-i', sourceAudioPath,
    '-ss', track.start,
  ];

  if (track.end) args.push('-to', track.end);

  args.push(
    '-map_chapters', '-1',
    '-map', '0:a',
    '-ar', '48000',
    outputPath,
  );

  return args;
}

function buildRefalacCommand({
  wavPath,
  coverPath,
  outputPath,
  track,
  albumTitle,
  artist,
  year,
}) {
  const args = [
    '--artist', artist,
    '--album', albumTitle,
    '--band', artist,
    '--title', track.normalizedTitle,
    '--track', String(track.number),
  ];

  if (year) args.push('--date', String(year));
  if (coverPath) {
    args.push('--artwork', coverPath);
    args.push('--artwork-size', '1200');
  }

  args.push('-o', outputPath);
  args.push(wavPath);

  return args;
}

function buildTrackFileName(track, ext) {
  const safe = sanitizeFilename(track.normalizedTitle);
  return `${String(track.number).padStart(2, '0')}_${safe}.${ext}`;
}

module.exports = {
  buildFlacCommand,
  buildAlacCommand,
  buildExtractWavCommand,
  buildRefalacCommand,
  buildTrackFileName,
  sanitizeFilename,
};
