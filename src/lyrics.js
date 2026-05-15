// Lyrics fetcher — Netease Cloud Music (primary) + Genius HTML scrape (fallback).
const https = require('node:https');
const http = require('node:http');
const zlib = require('node:zlib');

// ── HTTP helpers ──

const PROXY_URL = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || 'http://127.0.0.1:7897';

function proxyTunnel(hostname, port) {
  return new Promise((resolve, reject) => {
    const proxy = new URL(PROXY_URL);
    const req = http.request({
      hostname: proxy.hostname,
      port: proxy.port || 7897,
      method: 'CONNECT',
      path: `${hostname}:${port}`,
    });
    req.on('connect', (_res, socket) => resolve(socket));
    req.on('error', reject);
    req.end();
  });
}

function request(opts) {
  return new Promise((resolve, reject) => {
    const u = new URL(opts.url);
    const reqOpts = {
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: opts.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...opts.headers,
      },
    };

    function handleRes(res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(request({ ...opts, url: res.headers.location }));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} from ${opts.url}`));
      }
      if (opts.raw) {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        return;
      }
      const chunks = [];
      const stream = res.headers['content-encoding'] === 'gzip'
        ? res.pipe(zlib.createGunzip())
        : res;
      stream.on('data', (c) => chunks.push(c));
      stream.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch (e) { reject(e); }
      });
    }

    function doReq() {
      const req = https.get(reqOpts, handleRes);
      req.on('error', reject);
      req.end();
    }

    if (PROXY_URL && new URL(PROXY_URL).hostname) {
      proxyTunnel(u.hostname, u.port || 443)
        .then((socket) => {
          https.get({ ...reqOpts, socket, agent: false }, handleRes).on('error', reject);
        })
        .catch(() => doReq());
    } else {
      doReq();
    }
  });
}

// ── Netease Cloud Music ──

async function searchNetease(keyword) {
  const data = await request({
    url: `https://music.163.com/api/search/get?s=${encodeURIComponent(keyword)}&type=1&offset=0&limit=5`,
    headers: { 'Referer': 'https://music.163.com/' },
  });
  if (data.code !== 200 || !data.result || !data.result.songs) return [];
  return data.result.songs.map((s) => ({
    id: s.id,
    title: s.name,
    artists: (s.artists || []).map((a) => a.name).join('/'),
  }));
}

async function fetchNeteaseLyrics(songId) {
  const data = await request({
    url: `https://music.163.com/api/song/lyric?os=pc&id=${songId}&lv=-1&tv=-1`,
    headers: { 'Referer': 'https://music.163.com/' },
  });
  if (data.code !== 200) return null;
  const result = {};
  if (data.lrc && data.lrc.lyric) result.lrc = data.lrc.lyric;
  if (data.tlyric && data.tlyric.lyric) result.tlyric = data.tlyric.lyric;
  return result;
}

// ── Genius (fallback) ──

async function fetchGeniusLyrics(url) {
  const html = await request({ url, raw: true });
  const containerRegex = /<div[^>]*data-lyrics-container="true"[^>]*>(.*?)<\/div>/gs;
  const matches = html.match(containerRegex);
  if (!matches || matches.length === 0) return null;

  const noiseRegex = /(?:^\d+\s*)?(?:Contributors?|Translations?|Romanization|English\s*Translation|Embed|Share|Copy|Copy\s*Link|by\s+Genius).*$/gim;

  const lines = [];
  for (const match of matches) {
    let text = match
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(noiseRegex, '')
      .trim();
    if (text) lines.push(text);
  }
  return lines.join('\n\n');
}

// ── LRC to plain text ──

function lrcToPlain(lrc) {
  return lrc
    .split('\n')
    .map((line) => line.replace(/\[\d{2}:\d{2}[.:]\d{2,3}\]/g, '').trim())
    .filter(Boolean)
    .join('\n');
}

// ── Main entry point ──

async function fetchLyricsForTrack(artist, title) {
  const keyword = `${artist} ${title}`.trim();
  const results = await searchNetease(keyword);
  if (results.length === 0) return null;

  const best = results[0];
  const lyricData = await fetchNeteaseLyrics(best.id);
  if (!lyricData || !lyricData.lrc) return null;

  return {
    text: lrcToPlain(lyricData.lrc),
    source: 'netease',
    neteaseId: best.id,
    neteaseTitle: best.title,
  };
}

module.exports = { fetchLyricsForTrack, searchNetease, fetchNeteaseLyrics, fetchGeniusLyrics, lrcToPlain, request };
