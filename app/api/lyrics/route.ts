import { NextRequest, NextResponse } from 'next/server';

type LrcRecord = {
  id: number;
  trackName?: string;
  name?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
};

type ScoredRecord = {
  record: LrcRecord;
  score: number;
};

const LRCLIB_HEADERS = {
  'Lrclib-Client': 'Vibify/2.0.0-alpha (https://github.com/Rishikeshsanin/vibify)'
};

export async function GET(request: NextRequest) {
  const rawTitle = request.nextUrl.searchParams.get('title')?.trim();
  const rawArtist = request.nextUrl.searchParams.get('artist')?.trim() ?? '';
  const duration = Number(request.nextUrl.searchParams.get('duration') ?? 0);

  if (!rawTitle) {
    return NextResponse.json({ error: 'Track title is required.' }, { status: 400 });
  }

  const metadata = deriveMetadata(rawTitle, rawArtist);
  const queries = buildQueries(metadata.title, metadata.artist, metadata.cleanTitle, metadata.channelArtist);

  try {
    const records: LrcRecord[] = [];

    for (const params of queries) {
      const response = await fetch(`https://lrclib.net/api/search?${params}`, {
        headers: LRCLIB_HEADERS,
        next: { revalidate: 60 * 60 * 24 }
      });

      if (response.status === 429) {
        return NextResponse.json({ error: 'Lyrics service is busy. Try again shortly.' }, { status: 429 });
      }
      if (!response.ok) continue;

      const nextRecords = (await response.json()) as LrcRecord[];
      if (Array.isArray(nextRecords)) records.push(...nextRecords);

      const early = pickBest(records, metadata.title, metadata.artist, duration);
      if (early && early.score >= 120) break;
    }

    const unique = Array.from(new Map(records.map(record => [record.id, record])).values());
    const best = pickBest(unique, metadata.title, metadata.artist, duration);

    if (!best || best.score < 58) {
      return NextResponse.json({
        found: false,
        query: [metadata.artist, metadata.title].filter(Boolean).join(' '),
        normalizedTitle: metadata.title,
        normalizedArtist: metadata.artist
      });
    }

    const record = best.record;
    const matchedDuration = record.duration ?? null;
    const durationDelta = duration > 0 && matchedDuration
      ? Math.round((duration - matchedDuration) * 10) / 10
      : null;

    return NextResponse.json({
      found: true,
      instrumental: Boolean(record.instrumental),
      trackName: record.trackName ?? record.name ?? metadata.title,
      artistName: record.artistName ?? metadata.artist,
      albumName: record.albumName ?? '',
      duration: matchedDuration,
      videoDuration: duration > 0 ? duration : null,
      durationDelta,
      confidence: Math.round(best.score),
      plainLyrics: record.plainLyrics ?? null,
      syncedLyrics: record.syncedLyrics ?? null,
      source: 'LRCLIB'
    });
  } catch {
    return NextResponse.json({ error: 'Lyrics are temporarily unavailable.' }, { status: 502 });
  }
}

function buildQueries(title: string, artist: string, cleanTitle: string, channelArtist: string) {
  const queries: URLSearchParams[] = [];
  const seen = new Set<string>();

  const add = (params: URLSearchParams) => {
    const key = params.toString();
    if (!key || seen.has(key)) return;
    seen.add(key);
    queries.push(params);
  };

  const structured = new URLSearchParams({ track_name: title });
  if (artist) structured.set('artist_name', artist);
  add(structured);

  const broad = [artist, title].filter(Boolean).join(' ').trim();
  if (broad) add(new URLSearchParams({ q: broad }));

  if (channelArtist && channelArtist !== artist) {
    add(new URLSearchParams({ q: `${channelArtist} ${title}`.trim() }));
  }

  if (cleanTitle && cleanTitle !== title) {
    add(new URLSearchParams({ q: cleanTitle }));
  }

  add(new URLSearchParams({ track_name: title, q: title }));
  return queries.slice(0, 4);
}

function deriveMetadata(rawTitle: string, rawArtist: string) {
  const cleanTitle = normalizeYouTubeTitle(rawTitle);
  const channelArtist = normalizeArtist(rawArtist);
  let title = cleanTitle;
  let artist = channelArtist;

  const split = cleanTitle.match(/^(.{1,80}?)\s+[\-–—|]\s+(.{1,140})$/);
  if (split) {
    const left = cleanArtistCandidate(split[1]);
    const right = cleanTrackCandidate(split[2]);
    if (left && right && !looksLikeGenericChannel(left)) {
      artist = left;
      title = right;
    }
  }

  return { title, artist, cleanTitle, channelArtist };
}

function normalizeYouTubeTitle(value: string) {
  return value
    .replace(/\([^)]*(official|video|audio|lyrics?|lyrical|visualizer|4k|hd)[^)]*\)/gi, ' ')
    .replace(/\[[^\]]*(official|video|audio|lyrics?|lyrical|visualizer|4k|hd)[^\]]*\]/gi, ' ')
    .replace(/\b(official\s+music\s+video|official\s+video|official\s+audio|lyrics?|lyrical\s+video|visualizer|full\s+song|audio\s+only)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTrackCandidate(value: string) {
  return value
    .replace(/\([^)]*(official|video|audio|lyrics?|lyrical|visualizer|4k|hd)[^)]*\)/gi, ' ')
    .replace(/\[[^\]]*(official|video|audio|lyrics?|lyrical|visualizer|4k|hd)[^\]]*\]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanArtistCandidate(value: string) {
  return value
    .replace(/\b(official|music|lyrics?|vevo)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeArtist(value: string) {
  if (!value) return '';
  const cleaned = value.replace(/\s+-\s+Topic$/i, '').trim();
  return looksLikeGenericChannel(cleaned) ? '' : cleaned;
}

function looksLikeGenericChannel(value: string) {
  return /\b(records?|music|vevo|label|topic|entertainment|productions?|lyrics?|clouds?|sounds?|india|worldwide)\b/i.test(value);
}

function normalize(value: string | undefined) {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenScore(left: string, right: string) {
  const a = new Set(normalize(left).split(' ').filter(Boolean));
  const b = new Set(normalize(right).split(' ').filter(Boolean));
  if (!a.size || !b.size) return 0;
  let matches = 0;
  a.forEach(token => {
    if (b.has(token)) matches += 1;
  });
  return matches / Math.max(a.size, b.size);
}

function pickBest(records: LrcRecord[], title: string, artist: string, duration: number): ScoredRecord | undefined {
  return records
    .filter(record => record.syncedLyrics || record.plainLyrics || record.instrumental)
    .map(record => ({ record, score: scoreRecord(record, title, artist, duration) }))
    .sort((a, b) => b.score - a.score)[0];
}

function scoreRecord(record: LrcRecord, title: string, artist: string, duration: number) {
  const candidateTitle = record.trackName ?? record.name ?? '';
  let score = tokenScore(candidateTitle, title) * 105;
  const nt = normalize(title);
  const nc = normalize(candidateTitle);

  if (nt && nc && nt === nc) score += 65;
  else if (nt && nc && (nt.includes(nc) || nc.includes(nt))) score += 32;

  if (artist && record.artistName) {
    const artistScore = tokenScore(record.artistName, artist);
    score += artistScore * 55;
    if (normalize(record.artistName) === normalize(artist)) score += 28;
  }

  if (duration > 0 && record.duration) {
    const delta = Math.abs(record.duration - duration);
    if (delta <= 2) score += 42;
    else if (delta <= 6) score += 24;
    else if (delta <= 12) score += 8;
    else if (delta > 30) score -= 28;
  }

  if (record.syncedLyrics) score += 14;
  return score;
}
