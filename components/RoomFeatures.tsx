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
  RotateCcw,
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
  duration?: number | null;
  videoDuration?: number | null;
  durationDelta?: number | null;
  confidence?: number;
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
  roomTime: number;
  duration: number;
  queue: QueueItem[];
  isHost: boolean;
  lyricsOffsetMs: number;
  onLyricsOffsetChange: (offsetMs: number) => void;
  onOpenSearch: () => void;
  onPlay: (item: QueueItem) => void;
  onRemove: (item: QueueItem) => void;
  onMove: (item: QueueItem, delta: -1 | 1) => void;
};

export function RoomFeatures({
  track,
  roomTime,
  duration,
  queue,
  isHost,
  lyricsOffsetMs,
  onLyricsOffsetChange,
  onOpenSearch,
  onPlay,
  onRemove,
  onMove
}: Props) {
  const [lyrics, setLyrics] = useState<LyricsPayload | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState('');
  const lineRefs = useRef<Array<HTMLDivElement | null>>([]);
  const lyricsWindowRef = useRef<HTMLDivElement>(null);
  const durationKey = duration > 1 ? Math.round(duration) : 0;

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

    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        title: track.title,
        artist: track.channelTitle
      });
      if (durationKey > 0) params.set('duration', String(durationKey));

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
    }, durationKey > 0 ? 80 : 900);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [track?.videoId, durationKey]);

  const syncedLines = useMemo(
    () => parseSyncedLyrics(lyrics?.syncedLyrics ?? ''),
    [lyrics?.syncedLyrics]
  );

  const plainLines = useMemo(
    () => (lyrics?.plainLyrics ?? '').split('\n').map(line => line.trim()).filter(Boolean),
    [lyrics?.plainLyrics]
  );

  const lyricsClock = Math.max(0, roomTime - lyricsOffsetMs / 1000);

  const activeLine = useMemo(() => {
    if (!syncedLines.length) return -1;
    let index = -1;
    for (let i = 0; i < syncedLines.length; i += 1) {
      if (syncedLines[i].time <= lyricsClock + 0.08) index = i;
      else break;
    }
    return index;
  }, [lyricsClock, syncedLines]);

  useEffect(() => {
    if (activeLine < 0) return;
    const container = lyricsWindowRef.current;
    const line = lineRefs.current[activeLine];
    if (!container || !line) return;

    const containerRect = container.getBoundingClientRect();
    const lineRect = line.getBoundingClientRect();
    const target =
      container.scrollTop +
      (lineRect.top - containerRect.top) -
      container.clientHeight / 2 +
      lineRect.height / 2;

    container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  }, [activeLine]);

  const durationDelta = typeof lyrics?.durationDelta === 'number' ? lyrics.durationDelta : null;
  const timingMismatch = durationDelta !== null && Math.abs(durationDelta) >= 4;

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

        {syncedLines.length > 0 && (
          <div className="lyrics-sync-strip">
            <div>
              <b>ROOM-SYNCED LYRICS</b>
              <span>{formatOffset(lyricsOffsetMs)}{timingMismatch ? ` · video differs by ${formatDelta(durationDelta ?? 0)}` : ''}</span>
            </div>
            {isHost ? (
              <div className="lyrics-calibration" aria-label="Lyrics timing calibration">
                <button onClick={() => onLyricsOffsetChange(lyricsOffsetMs - 5000)} title="Move lyrics 5 seconds earlier">−5s</button>
                <button onClick={() => onLyricsOffsetChange(lyricsOffsetMs - 250)} title="Move lyrics 0.25 seconds earlier">−.25</button>
                <button className="lyrics-reset" onClick={() => onLyricsOffsetChange(0)} title="Reset lyrics timing"><RotateCcw size={13}/></button>
                <button onClick={() => onLyricsOffsetChange(lyricsOffsetMs + 250)} title="Delay lyrics 0.25 seconds">+.25</button>
                <button onClick={() => onLyricsOffsetChange(lyricsOffsetMs + 5000)} title="Delay lyrics 5 seconds">+5s</button>
              </div>
            ) : (
              <span className="lyrics-shared-note">Host calibration applies to everyone</span>
            )}
          </div>
        )}

        <div className="lyrics-window" ref={lyricsWindowRef}>
          {!track && <FeatureEmpty icon={<Music2/>} title="No track playing" copy="Lyrics will appear here when the host starts a song." />}
          {track && lyricsLoading && <FeatureEmpty icon={<LoaderCircle className="spin"/>} title="Finding lyrics" copy="Matching the YouTube result against multiple track/artist variants…" />}
          {track && !lyricsLoading && lyricsError && <FeatureEmpty icon={<BookOpenText/>} title="Lyrics unavailable" copy={lyricsError} />}
          {track && !lyricsLoading && !lyricsError && lyrics?.instrumental && <FeatureEmpty icon={<Music2/>} title="Instrumental track" copy="No vocal lyrics are expected for this track." />}
          {track && !lyricsLoading && !lyricsError && lyrics?.found === false && <FeatureEmpty icon={<BookOpenText/>} title="No confident match" copy="This source does not have a reliable match yet. Vibify already tried cleaned title, parsed artist and broad fallbacks." />}

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
        {syncedLines.length > 0 && <div className="lyrics-foot">Every device follows the same room clock · host timing correction is shared live</div>}
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

function formatOffset(offsetMs: number) {
  if (!offsetMs) return '0.00s';
  const seconds = offsetMs / 1000;
  return `${seconds > 0 ? '+' : ''}${seconds.toFixed(Math.abs(seconds) >= 10 ? 1 : 2)}s delay`;
}

function formatDelta(deltaSeconds: number) {
  const rounded = Math.abs(deltaSeconds).toFixed(Math.abs(deltaSeconds) >= 10 ? 0 : 1);
  return `${rounded}s ${deltaSeconds > 0 ? 'longer' : 'shorter'}`;
}
