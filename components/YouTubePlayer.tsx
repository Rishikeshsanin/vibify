'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { serverNow, updateParticipant } from '@/lib/room';
import type { PlaybackState, Track } from '@/lib/types';

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }
  namespace YT {
    class Player {
      constructor(element: HTMLElement, options: Record<string, unknown>);
      cueVideoById(options: { videoId: string; startSeconds?: number }): void;
      playVideo(): void;
      pauseVideo(): void;
      seekTo(seconds: number, allowSeekAhead: boolean): void;
      getCurrentTime(): number;
      getDuration(): number;
      getPlayerState(): number;
      destroy(): void;
    }
    interface OnStateChangeEvent { data: number }
  }
}

export type YouTubeHandle = {
  getCurrentTime: () => number;
  getDuration: () => number;
  unlockAudio: () => void;
  seekLocal: (seconds: number) => void;
};

type Props = {
  roomCode: string;
  uid: string;
  track?: Track;
  playback: PlaybackState;
  onAutoplayBlocked?: () => void;
  onReadyChange?: (ready: boolean) => void;
  onEnded?: () => void;
};

let apiPromise: Promise<void> | null = null;

function loadYouTubeAPI() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise(resolve => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    }
  });
  return apiPromise;
}

export const YouTubePlayer = forwardRef<YouTubeHandle, Props>(function YouTubePlayer(
  { roomCode, uid, track, playback, onAutoplayBlocked, onReadyChange, onEnded },
  refHandle
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const trackRef = useRef<Track | undefined>(track);
  const playbackRef = useRef(playback);
  const correctionRef = useRef(0);
  const commandStartRef = useRef(Date.now());
  const commandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoplayBlockedRef = useRef(onAutoplayBlocked);
  const readyChangeRef = useRef(onReadyChange);
  const endedRef = useRef(onEnded);
  const lastBufferingAtRef = useRef(0);
  const lastTelemetryAtRef = useRef(0);
  const lastReportedDriftRef = useRef<number | null>(null);
  const lastPlayerStateRef = useRef<number | null>(null);
  const [playerReady, setPlayerReady] = useState(false);

  useEffect(() => {
    autoplayBlockedRef.current = onAutoplayBlocked;
    readyChangeRef.current = onReadyChange;
    endedRef.current = onEnded;
  }, [onAutoplayBlocked, onReadyChange, onEnded]);

  useImperativeHandle(refHandle, () => ({
    getCurrentTime: () => playerRef.current?.getCurrentTime?.() ?? 0,
    getDuration: () => playerRef.current?.getDuration?.() ?? 0,
    unlockAudio: () => {
      const player = playerRef.current;
      if (!player || !trackRef.current) return;
      player.playVideo();
      window.setTimeout(() => {
        if (playbackRef.current.status === 'paused') player.pauseVideo();
      }, 180);
    },
    seekLocal: seconds => playerRef.current?.seekTo?.(seconds, true)
  }));

  useEffect(() => {
    let disposed = false;
    loadYouTubeAPI().then(() => {
      if (disposed || !mountRef.current || playerRef.current) return;
      playerRef.current = new window.YT.Player(mountRef.current, {
        width: '100%',
        height: '100%',
        playerVars: {
          playsinline: 1,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin
        },
        events: {
          onReady: () => {
            setPlayerReady(true);
            readyChangeRef.current?.(true);
            if (trackRef.current) {
              playerRef.current?.cueVideoById({ videoId: trackRef.current.videoId, startSeconds: 0 });
            }
          },
          onStateChange: (event: YT.OnStateChangeEvent) => {
            lastPlayerStateRef.current = event.data;
            if (event.data === 3) lastBufferingAtRef.current = Date.now();
            if (event.data === 0) endedRef.current?.();

            const currentTrack = trackRef.current;
            if (currentTrack && [1, 2, 5].includes(event.data)) {
              void updateParticipant(roomCode, uid, {
                readyFor: currentTrack.videoId,
                playerState: event.data
              });
            } else {
              void updateParticipant(roomCode, uid, { playerState: event.data });
            }
          },
          onAutoplayBlocked: () => autoplayBlockedRef.current?.()
        }
      });
    });
    return () => {
      disposed = true;
      if (commandTimerRef.current) clearTimeout(commandTimerRef.current);
      readyChangeRef.current?.(false);
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [roomCode, uid]);

  useEffect(() => {
    trackRef.current = track;
    if (!playerReady || !track || !playerRef.current) return;
    lastTelemetryAtRef.current = 0;
    lastReportedDriftRef.current = null;
    correctionRef.current = 0;
    playerRef.current.cueVideoById({ videoId: track.videoId, startSeconds: 0 });
    void updateParticipant(roomCode, uid, { readyFor: '', driftMs: 0 });
  }, [track?.videoId, playerReady, roomCode, uid]);

  useEffect(() => {
    playbackRef.current = playback;
    commandStartRef.current = Date.now();
    const player = playerRef.current;
    if (!playerReady || !track?.videoId || !player) return;
    if (commandTimerRef.current) clearTimeout(commandTimerRef.current);

    const apply = () => {
      const state = playbackRef.current;
      const now = serverNow();
      const elapsed = Math.max(0, now - state.executeAt) / 1000;
      const target = Math.max(0, state.position + (state.status === 'playing' ? elapsed : 0));
      const actual = player.getCurrentTime();
      const seekThreshold = state.status === 'playing' ? 0.4 : 0.2;

      if (!Number.isFinite(actual) || Math.abs(actual - target) > seekThreshold) {
        player.seekTo(target, true);
      }

      if (state.status === 'playing') player.playVideo();
      else player.pauseVideo();
    };

    const delay = Math.max(0, playback.executeAt - serverNow());
    commandTimerRef.current = setTimeout(apply, delay);
    return () => {
      if (commandTimerRef.current) clearTimeout(commandTimerRef.current);
    };
  }, [playback.version, playback.status, playback.executeAt, playback.position, playerReady, track?.videoId]);

  useEffect(() => {
    if (!playerReady || !track?.videoId) return;
    const interval = window.setInterval(() => {
      const player = playerRef.current;
      const state = playbackRef.current;
      if (!player || state.status !== 'playing' || player.getPlayerState() !== 1) return;

      const expected = Math.max(0, state.position + Math.max(0, serverNow() - state.executeAt) / 1000);
      const actual = player.getCurrentTime();
      const drift = actual - expected;
      const driftMs = Math.round(drift * 1000);
      const now = Date.now();

      const telemetryDue = now - lastTelemetryAtRef.current > 5000;
      const changedMeaningfully =
        lastReportedDriftRef.current === null ||
        Math.abs(driftMs - lastReportedDriftRef.current) > 250;

      if (telemetryDue || Math.abs(driftMs) > 1500 || changedMeaningfully && now - lastTelemetryAtRef.current > 2500) {
        lastTelemetryAtRef.current = now;
        lastReportedDriftRef.current = driftMs;
        void updateParticipant(roomCode, uid, {
          driftMs,
          playerState: lastPlayerStateRef.current ?? player.getPlayerState()
        });
      }

      const recentlyBuffered = now - lastBufferingAtRef.current < 4500;
      const settling = now - commandStartRef.current < 6000;
      const threshold = settling ? 0.8 : 1.15;
      const cooldown = settling ? 8000 : 12000;

      if (
        !recentlyBuffered &&
        Math.abs(drift) > threshold &&
        now - correctionRef.current > cooldown
      ) {
        correctionRef.current = now;
        player.seekTo(expected, true);
      }
    }, 1200);
    return () => clearInterval(interval);
  }, [playerReady, roomCode, track?.videoId, uid]);

  return <div className="youtube-frame" ref={mountRef} aria-label="YouTube player" />;
});
