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
  { roomCode, uid, track, playback, onAutoplayBlocked, onReadyChange },
  refHandle
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const trackRef = useRef<Track | undefined>(track);
  const playbackRef = useRef(playback);
  const correctionRef = useRef(0);
  const commandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playerReady, setPlayerReady] = useState(false);

  useImperativeHandle(refHandle, () => ({
    getCurrentTime: () => playerRef.current?.getCurrentTime?.() ?? 0,
    getDuration: () => playerRef.current?.getDuration?.() ?? 0,
    unlockAudio: () => {
      const player = playerRef.current;
      if (!player || !trackRef.current) return;
      player.playVideo();
      window.setTimeout(() => {
        if (playbackRef.current.status === 'paused') player.pauseVideo();
      }, 220);
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
            onReadyChange?.(true);
            if (trackRef.current) {
              playerRef.current?.cueVideoById({ videoId: trackRef.current.videoId, startSeconds: 0 });
            }
          },
          onStateChange: (event: YT.OnStateChangeEvent) => {
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
          onAutoplayBlocked: () => onAutoplayBlocked?.()
        }
      });
    });
    return () => {
      disposed = true;
      if (commandTimerRef.current) clearTimeout(commandTimerRef.current);
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [onAutoplayBlocked, onReadyChange, roomCode, uid]);

  useEffect(() => {
    trackRef.current = track;
    if (!playerReady || !track || !playerRef.current) return;
    playerRef.current.cueVideoById({ videoId: track.videoId, startSeconds: 0 });
    void updateParticipant(roomCode, uid, { readyFor: '', driftMs: 0 });
  }, [track?.videoId, playerReady, roomCode, uid]);

  useEffect(() => {
    playbackRef.current = playback;
    const player = playerRef.current;
    if (!playerReady || !track || !player) return;
    if (commandTimerRef.current) clearTimeout(commandTimerRef.current);

    const apply = () => {
      const state = playbackRef.current;
      const now = serverNow();
      const elapsed = Math.max(0, now - state.executeAt) / 1000;
      const target = Math.max(0, state.position + (state.status === 'playing' ? elapsed : 0));
      player.seekTo(target, true);
      if (state.status === 'playing') player.playVideo();
      else player.pauseVideo();
    };

    const delay = Math.max(0, playback.executeAt - serverNow());
    commandTimerRef.current = setTimeout(apply, delay);
    return () => {
      if (commandTimerRef.current) clearTimeout(commandTimerRef.current);
    };
  }, [playback.version, playback.status, playback.executeAt, playback.position, playerReady, track]);

  useEffect(() => {
    if (!playerReady || !track) return;
    const interval = window.setInterval(() => {
      const player = playerRef.current;
      const state = playbackRef.current;
      if (!player || state.status !== 'playing' || player.getPlayerState() !== 1) return;
      const expected = Math.max(0, state.position + Math.max(0, serverNow() - state.executeAt) / 1000);
      const actual = player.getCurrentTime();
      const drift = actual - expected;
      const driftMs = Math.round(drift * 1000);
      void updateParticipant(roomCode, uid, { driftMs, playerState: player.getPlayerState() });

      // Repeated seeking is what made the previous audio prototype break up.
      // Vibify corrects only obvious drift and applies a cooldown between corrections.
      if (Math.abs(drift) > 0.85 && Date.now() - correctionRef.current > 5000) {
        correctionRef.current = Date.now();
        player.seekTo(expected, true);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [playerReady, roomCode, track, uid]);

  return <div className="youtube-frame" ref={mountRef} aria-label="YouTube player" />;
});
