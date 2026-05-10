// Short error codes for CLI output.
// Long explanations live in docs/reference.md#error-codes.

const CODES = {
  E_MISSING_COVER: 'cover.jpg or cover.png not found',
  E_UNAPPROVED_MANIFEST: 'set "approved": true after review',
  E_MISSING_TIMESTAMPS: 'timestamps.md not found',
  E_MISSING_SOURCE: 'audio/video source file not found',
  E_PARSE_TIMESTAMPS: 'failed to parse timestamps.md',
  E_BUILD_FAILED: 'build step failed',
  E_VERIFY_FAILED: 'output verification failed',
  E_NO_TRACKS: 'no tracks found in manifest',
  E_MISSING_MANIFEST: 'manifest.json not found',
  E_FFMPEG_NOT_FOUND: 'ffmpeg binary not found',
  E_REFALAC_NOT_FOUND: 'refalac64.exe not found',
};

function formatError(code, detail) {
  const base = `${code}: ${CODES[code] || 'unknown error'}`;
  return detail ? `${base}\n  ${detail}` : base;
}

module.exports = { CODES, formatError };
