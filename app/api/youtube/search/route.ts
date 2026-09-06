import { NextRequest, NextResponse } from 'next/server';
import type { Track } from '@/lib/types';

const cache = new Map<string, { expiresAt: number; tracks: Track[] }>();
const CACHE_MS = 1000 * 60 * 60 * 6;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ error: 'Enter at least two characters.' }, { status: 400 });
  }

  const cacheKey = query.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return NextResponse.json({ tracks: cached.tracks });

  const key = process.env.YOUTUBE_DATA_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'YouTube API key is not configured yet.' }, { status: 503 });
  }

  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    videoEmbeddable: 'true',
    videoSyndicated: 'true',
    maxResults: '10',
    q: `${query} music`,
    key
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
    next: { revalidate: 21600 }
  });

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json({ error: 'YouTube search failed.', detail }, { status: response.status });
  }

  const data = await response.json();
  const tracks: Track[] = (data.items ?? [])
    .filter((item: any) => item.id?.videoId)
    .map((item: any) => ({
      videoId: item.id.videoId,
      title: decodeHtml(item.snippet.title),
      channelTitle: decodeHtml(item.snippet.channelTitle),
      thumbnail: item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.medium?.url ?? ''
    }));

  cache.set(cacheKey, { expiresAt: Date.now() + CACHE_MS, tracks });
  return NextResponse.json({ tracks });
}

function decodeHtml(input: string) {
  return input
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}
