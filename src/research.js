const Genius = require('genius-lyrics');

// ── pure helpers ──

const VERSION_KEYWORDS = /\b(DJ|版|ver\.?|version|live|acoustic|mix|remix|arrange|edit|201\d|202\d)\b/i;
const NON_MUSIC_PATTERN = /MC|MC环节|MC×\d|讲话|成员介绍|开场|揭幕|开幕|開場|開幕|幕間|Interlude|Talk|メンバー紹介|エムシー/i;

function cleanTitle(rawTitle) {
  let title = rawTitle.trim();

  // Strip Japanese corner brackets
  title = title.replace(/^『|』$/g, '');

  // Strip slash-separated translations (keep first segment — the Japanese original)
  if (title.includes('/')) {
    title = title.split('/')[0].trim();
  }

  // Strip fullwidth parenthetical translations (Chinese/English after Japanese)
  // Only strip if content looks like a translation (not a version marker)
  title = title.replace(/\s*（([^）]*)）$/u, (_full, inner) => {
    if (VERSION_KEYWORDS.test(inner)) return _full;
    return '';
  });

  title = title.trim();
  if (!title) return rawTitle.trim();
  return title;
}

function isNonMusicTrack(rawTitle) {
  return NON_MUSIC_PATTERN.test(rawTitle.trim());
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Genius client ──

let _geniusClient = null;
function getGeniusClient() {
  if (!_geniusClient) {
    _geniusClient = new Genius.Client();
  }
  return _geniusClient;
}

// ── async research ──

async function searchGenius(query, geniusClient) {
  const searches = await geniusClient.songs.search(query, { sanitizeQuery: false });
  if (!searches || searches.length === 0) return null;
  return {
    title: searches[0].title,
    url: searches[0].url,
    id: searches[0].id,
  };
}

async function researchTrack(track, artist, geniusClient) {
  if (isNonMusicTrack(track.rawTitle)) {
    return {
      ...track,
      normalizedTitle: track.rawTitle,
      evidenceUrl: null,
      lyricLookupTitle: null,
      isNonMusic: true,
      notes: ['MC/talk segment'],
    };
  }

  const cleaned = cleanTitle(track.rawTitle);
  const query = `${artist} ${cleaned}`;

  let geniusResult = null;
  let researchError = null;

  try {
    geniusResult = await searchGenius(query, geniusClient);
  } catch (err) {
    researchError = err.message;
  }

  if (researchError) {
    return {
      ...track,
      normalizedTitle: cleaned,
      evidenceUrl: null,
      lyricLookupTitle: query,
      isNonMusic: false,
      researchError,
      notes: [`Genius search failed: ${researchError}`],
    };
  }

  if (!geniusResult) {
    return {
      ...track,
      normalizedTitle: cleaned,
      evidenceUrl: null,
      lyricLookupTitle: query,
      isNonMusic: false,
      notes: ['No Genius match found — review needed'],
    };
  }

  return {
    ...track,
    normalizedTitle: geniusResult.title,
    evidenceUrl: geniusResult.url,
    lyricLookupTitle: query,
    isNonMusic: false,
    notes: [],
  };
}

async function researchAlbum({ tracks, artist, options = {} }) {
  const {
    rateLimitMs = 1000,
    geniusClient = null,
    offline = false,
  } = options;

  if (offline) {
    return tracks.map((track) => {
      if (isNonMusicTrack(track.rawTitle)) {
        return {
          ...track,
          normalizedTitle: track.rawTitle,
          evidenceUrl: null,
          lyricLookupTitle: null,
          isNonMusic: true,
          notes: ['MC/talk segment (offline)'],
        };
      }
      const cleaned = cleanTitle(track.rawTitle);
      return {
        ...track,
        normalizedTitle: cleaned,
        evidenceUrl: null,
        lyricLookupTitle: `${artist} ${cleaned}`,
        isNonMusic: false,
        notes: ['Offline mode — title cleaned locally, not verified against Genius'],
      };
    });
  }

  const client = geniusClient ?? getGeniusClient();
  const results = [];

  for (let i = 0; i < tracks.length; i++) {
    const result = await researchTrack(tracks[i], artist, client);
    results.push(result);

    if (i < tracks.length - 1) {
      await sleep(rateLimitMs);
    }
  }

  return results;
}

module.exports = {
  cleanTitle,
  isNonMusicTrack,
  researchAlbum,
};
