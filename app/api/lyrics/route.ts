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

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get('title')?.trim();
  const artist = request.nextUrl.searchParams.get('artist')?.trim() ?? '';
  const duration = Number(request.nextUrl.searchParams.get('duration') ?? 0);

  if (!title) {
    return NextResponse.json({ error: 'Track title is required.' }, { status: 400 });
  }

  const cleanTitle = normalizeYouTubeTitle(title);
  const cleanArtist = normalizeArtist(artist);
  const query = [cleanTitle, cleanArtist].filter(Boolean).join(' ').trim();

  try {
    const params = new URLSearchParams({ q: query || cleanTitle || title });
    const response = await fetch(`https://lrclib.net/api/search?${params}`, {
      headers: {
        'Lrclib-Client': 'Vibify/2.0.0-alpha (https://github.com/Rishikeshsanin/vibify)'
      },
      next: { revalidate: 60 * 60 * 24 }
    });

    if (response.status === 429) {
      return NextResponse.json({ error: 'Lyrics service is busy. Try again shortly.' }, { status: 429 });
    }
    if (!response.ok) {
      return NextResponse.json({ error: 'Lyrics lookup failed.' }, { status: 502 });
    }

    const records = (await response.json()) as LrcRecord[];
    const candidates = records.filter(record => record.syncedLyrics || record.plainLyrics || record.instrumental);
    const best = candidates
      .map(record => ({ record, score: scoreRecord(record, cleanTitle, cleanArtist, duration) }))
      .sort((a, b) => b.score - a.score)[0]?.record;

    if (!best) {
      return NextResponse.json({ found: false, query });
    }

    return NextResponse.json({
      found: true,
      instrumental: Boolean(best.instrumental),
      trackName: best.trackName ?? best.name ?? cleanTitle,
      artistName: best.artistName ?? '',
      albumName: best.albumName ?? '',
      duration: best.duration ?? null,
      plainLyrics: best.plainLyrics ?? null,
      syncedLyrics: best.syncedLyrics ?? null,
      source: 'LRCLIB'
    });
  } catch {
    return NextResponse.json({ error: 'Lyrics are temporarily unavailable.' }, { status: 502 });
  }
}

function normalizeYouTubeTitle(value: string) {
  return value
    .replace(/\([^)]*(official|video|audio|lyrics?|lyrical|visualizer|4k|hd)[^)]*\)/gi, ' ')
    .replace(/\[[^\]]*(official|video|audio|lyrics?|lyrical|visualizer|4k|hd)[^\]]*\]/gi, ' ')
    .replace(/\b(official\s+music\s+video|official\s+video|official\s+audio|lyrics?|lyrical\s+video|visualizer|full\s+song)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeArtist(value: string) {
  if (!value) return '';
  if (/\b(records?|music|vevo|label|topic|entertainment|productions?)\b/i.test(value)) return '';
  return value.replace(/\s+-\s+Topic$/i, '').trim();
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

function scoreRecord(record: LrcRecord, title: string, artist: string, duration: number) {
  const candidateTitle = record.trackName ?? record.name ?? '';
  let score = tokenScore(candidateTitle, title) * 100;
  const nt = normalize(title);
  const nc = normalize(candidateTitle);
  if (nt && nc && (nt.includes(nc) || nc.includes(nt))) score += 45;

  if (artist && record.artistName) {
    score += tokenScore(record.artistName, artist) * 30;
  }

  if (duration > 0 && record.duration) {
    const delta = Math.abs(record.duration - duration);
    if (delta <= 2) score += 35;
    else if (delta <= 8) score += 12;
    else if (delta > 25) score -= 15;
  }

  if (record.syncedLyrics) score += 12;
  return score;
}
