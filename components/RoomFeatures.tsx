'use client';

import {
  BookOpenText,
  ChevronDown,
  ChevronUp,
  ListMusic,
  LoaderCircle,
  Music2,
  Play,
  Plus,
  Trash2
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { QueueItem, Track } from '@/lib/types';

type LyricsPayload = {
  found?: boolean;
  instrumental?: boolean;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
  source?: string;
  error?: string;
};

type LyricLine = {
  time: number;
  text: string;
};

type Props = {
  track?: Track;
  currentTime: number;
  duration: number;
  queue: QueueItem[];
  isHost: boolean;
  onOpenSearch: () => void;
  onPlay: (item: QueueItem) => void;
  onRemove: (item: QueueItem) => void;
  onMove: (item: QueueItem, delta: -1 | 1) => void;
};

export function RoomFeatures({
  track,
  currentTime,
  duration,
  queue,
  isHost,
  onOpenSearch,
  onPlay,
  onRemove,
  onMove
}: Props) {
  const [lyrics, setLyrics] = useState<LyricsPayload | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState('');
  const lineRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (!track) {
      setLyrics(null);
      setLyricsError('');
      return;
    }

    const controller = new AbortController();
    setLyrics(null);
    setLyricsError('');
    setLyricsLoading(true);

    const params = new URLSearchParams({
      title: track.title,
      artist: track.channelTitle
    });
    if (duration > 1) params.set('duration', String(Math.round(duration)));

    fetch(`/api/lyrics?${params}`, { signal: controller.signal })
      .then(async response => {
        const data = (await response.json()) as LyricsPayload;
        if (!response.ok) throw new Error(data.error ?? 'Lyrics lookup failed.');
        return data;
      })
      .then(data => setLyrics(data))
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setLyricsError(error instanceof Error ? error.message : 'Lyrics are unavailable.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLyricsLoading(false);
      });

    return () => controller.abort();
  }, [track?.videoId]);

  const syncedLines = useMemo(
    () => parseSyncedLyrics(lyrics?.syncedLyrics ?? ''),
    [lyrics?.syncedLyrics]
  );

  const plainLines = useMemo(
    () => (lyrics?.plainLyrics ?? '').split('\n').map(line => line.trim()).filter(Boolean),
    [lyrics?.plainLyrics]
  );

  const activeLine = useMemo(() => {
    if (!syncedLines.length) return -1;
    let index = -1;
    for (let i = 0; i < syncedLines.length; i += 1) {
      if (syncedLines[i].time <= currentTime + 0.12) index = i;
      else break;
    }
    return index;
  }, [currentTime, syncedLines]);

  useEffect(() => {
    if (activeLine < 0) return;
    lineRefs.current[activeLine]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeLine]);

  return (
    <section className="room-features">
      <section className="glass lyrics-panel-v2">
        <header className="feature-head">
          <div>
            <span className="eyebrow"><BookOpenText size={13}/> LIVE LYRICS</span>
            <h2>{lyrics?.trackName || track?.title || 'Lyrics'}</h2>
            <p>{lyrics?.artistName || track?.channelTitle || 'Choose a track to begin.'}</p>
          </div>
          {lyrics?.source && <span className="feature-chip">{lyrics.source}</span>}
        </header>

        <div className="lyrics-window">
          {!track && <FeatureEmpty icon={<Music2/>} title="No track playing" copy="Lyrics will appear here when the host starts a song." />}
          {track && lyricsLoading && <FeatureEmpty icon={<LoaderCircle className="spin"/>} title="Finding lyrics" copy="Matching this track with a lyrics source…" />}
          {track && !lyricsLoading && lyricsError && <FeatureEmpty icon={<BookOpenText/>} title="Lyrics unavailable" copy={lyricsError} />}
          {track && !lyricsLoading && !lyricsError && lyrics?.instrumental && <FeatureEmpty icon={<Music2/>} title="Instrumental track" copy="No vocal lyrics are expected for this track." />}
          {track && !lyricsLoading && !lyricsError && lyrics?.found === false && <FeatureEmpty icon={<BookOpenText/>} title="No confident match" copy="We could not safely match lyrics to this YouTube result yet." />}

          {syncedLines.length > 0 && (
            <div className="synced-lyrics" aria-live="off">
              {syncedLines.map((line, index) => (
                <div
                  key={`${line.time}-${index}`}
                  ref={element => { lineRefs.current[index] = element; }}
                  className={`lyric-line ${index === activeLine ? 'active' : ''} ${index < activeLine ? 'past' : ''}`}
                >
                  {line.text || '♪'}
                </div>
              ))}
            </div>
          )}

          {syncedLines.length === 0 && plainLines.length > 0 && (
            <div className="plain-lyrics">
              {plainLines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}
            </div>
          )}
        </div>
        {syncedLines.length > 0 && <div className="lyrics-foot">Synced to the room playback position</div>}
      </section>

      <section className="glass queue-panel-v2">
        <header className="feature-head queue-head-v2">
          <div>
            <span className="eyebrow"><ListMusic size={13}/> UP NEXT</span>
            <h2>Room queue</h2>
            <p>{queue.length ? `${queue.length} track${queue.length === 1 ? '' : 's'} waiting` : 'Build the next part of the session.'}</p>
          </div>
          {isHost && <button className="queue-add-v2" onClick={onOpenSearch}><Plus size={16}/> Add</button>}
        </header>

        <div className="queue-list-v2">
          {queue.length === 0 && <FeatureEmpty icon={<ListMusic/>} title="Queue is empty" copy={isHost ? 'Search for music and add tracks without interrupting what is playing.' : 'The host has not queued anything yet.'} />}
          {queue.map((item, index) => (
            <article className="queue-item-v2" key={item.id}>
              <span className="queue-number-v2">{String(index + 1).padStart(2, '0')}</span>
              <img src={item.track.thumbnail} alt="" />
              <div className="queue-copy-v2">
                <b>{item.track.title}</b>
                <small>{item.track.channelTitle}</small>
              </div>
              {isHost && (
                <div className="queue-actions-v2">
                  <button title="Play now" onClick={() => onPlay(item)}><Play size={14} fill="currentColor"/></button>
                  <button title="Move up" disabled={index === 0} onClick={() => onMove(item, -1)}><ChevronUp size={14}/></button>
                  <button title="Move down" disabled={index === queue.length - 1} onClick={() => onMove(item, 1)}><ChevronDown size={14}/></button>
                  <button className="queue-remove-v2" title="Remove" onClick={() => onRemove(item)}><Trash2 size={14}/></button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function FeatureEmpty({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return (
    <div className="feature-empty-v2">
      <span>{icon}</span>
      <b>{title}</b>
      <p>{copy}</p>
    </div>
  );
}

function parseSyncedLyrics(value: string): LyricLine[] {
  if (!value) return [];
  return value
    .split('\n')
    .map(line => {
      const match = line.match(/^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s?(.*)$/);
      if (!match) return null;
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      const fractionRaw = match[3] ?? '0';
      const fraction = Number(fractionRaw.padEnd(3, '0').slice(0, 3)) / 1000;
      return {
        time: minutes * 60 + seconds + fraction,
        text: match[4].trim()
      } satisfies LyricLine;
    })
    .filter((line): line is LyricLine => Boolean(line));
}
