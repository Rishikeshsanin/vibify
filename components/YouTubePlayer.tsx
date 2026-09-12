'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { roomPlaybackPosition, serverNow, updateParticipant, writePlayback } from '@/lib/room';
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
  getPlayerState: () => number;
  unlockAudio: () => void;
  seekLocal: (seconds: number) => void;
  syncToRoom: () => void;
};

type Props = {
  roomCode: string;
  uid: string;
  isHost?: boolean;
  track?: Track;
  playback: PlaybackState;
  onAutoplayBlocked?: () => void;
  onReadyChange?: (ready: boolean) => void;
  onPlayerStateChange?: (state: number) => void;
  onFollowingRoomChange?: (following: boolean) => void;
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
  {
    roomCode,
    uid,
    isHost = false,
    track,
    playback,
    onAutoplayBlocked,
    onReadyChange,
    onPlayerStateChange,
    onFollowingRoomChange,
    onEnded
  },
  refHandle
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const trackRef = useRef<Track | undefined>(track);
  const playbackRef = useRef(playback);
  const correctionRef = useRef(0);
  const commandStartRef = useRef(Date.now());
  const roomCommandGraceRef = useRef(0);
  const commandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoplayBlockedRef = useRef(onAutoplayBlocked);
  const readyChangeRef = useRef(onReadyChange);
  const playerStateChangeRef = useRef(onPlayerStateChange);
  const followingChangeRef = useRef(onFollowingRoomChange);
  const endedRef = useRef(onEnded);
  const lastBufferingAtRef = useRef(0);
  const lastTelemetryAtRef = useRef(0);
  const lastReportedDriftRef = useRef<number | null>(null);
  const followingRoomRef = useRef(true);
  const hostNativeWriteAtRef = useRef(0);
  const localVersionRef = useRef(playback.version);
  const [playerReady, setPlayerReady] = useState(false);

  useEffect(() => {
    autoplayBlockedRef.current = onAutoplayBlocked;
    readyChangeRef.current = onReadyChange;
    playerStateChangeRef.current = onPlayerStateChange;
    followingChangeRef.current = onFollowingRoomChange;
    endedRef.current = onEnded;
  }, [onAutoplayBlocked, onReadyChange, onPlayerStateChange, onFollowingRoomChange, onEnded]);

  const setFollowingRoom = (following: boolean) => {
    const next = isHost ? true : following;
    if (followingRoomRef.current === next) return;
    followingRoomRef.current = next;
    followingChangeRef.current?.(next);
    void updateParticipant(roomCode, uid, { followingRoom: next });
  };

  const publishHostNativeState = (forcedStatus?: 'playing' | 'paused') => {
    if (!isHost) return;
    const player = playerRef.current;
    if (!player || !trackRef.current) return;

    const now = Date.now();
    if (now <= roomCommandGraceRef.current || now - hostNativeWriteAtRef.current < 550) return;

    const actual = player.getCurrentTime();
    if (!Number.isFinite(actual)) return;

    const playerState = player.getPlayerState();
    const status = forcedStatus ?? (playerState === 1 ? 'playing' : 'paused');
    const lead = status === 'playing' ? 450 : 180;
    const nextVersion = Math.max(localVersionRef.current, playbackRef.current.version) + 1;
    localVersionRef.current = nextVersion;
    hostNativeWriteAtRef.current = now;
    roomCommandGraceRef.current = now + 1500;
    commandStartRef.current = now;
    setFollowingRoom(true);

    void writePlayback(roomCode, {
      status,
      position: Math.max(0, actual + (status === 'playing' ? lead / 1000 : 0)),
      executeAt: serverNow() + lead,
      version: nextVersion
    }).catch(() => {
      roomCommandGraceRef.current = 0;
    });
  };

  const applyRoomState = () => {
    const player = playerRef.current;
    const state = playbackRef.current;
    if (!player || !trackRef.current) return;

    const target = roomPlaybackPosition(state);
    const actual = player.getCurrentTime();
    roomCommandGraceRef.current = Date.now() + 1800;
    commandStartRef.current = Date.now();
    setFollowingRoom(true);

    if (!Number.isFinite(actual) || Math.abs(actual - target) > 0.22) {
      player.seekTo(target, true);
    }

    if (state.status === 'playing') player.playVideo();
    else player.pauseVideo();
  };

  useImperativeHandle(refHandle, () => ({
    getCurrentTime: () => playerRef.current?.getCurrentTime?.() ?? 0,
    getDuration: () => playerRef.current?.getDuration?.() ?? 0,
    getPlayerState: () => playerRef.current?.getPlayerState?.() ?? -1,
    unlockAudio: () => {
      const player = playerRef.current;
      if (!player || !trackRef.current) return;
      roomCommandGraceRef.current = Date.now() + 1200;
      player.playVideo();
      window.setTimeout(() => {
        if (playbackRef.current.status === 'paused') player.pauseVideo();
      }, 180);
    },
    seekLocal: seconds => playerRef.current?.seekTo?.(seconds, true),
    syncToRoom: applyRoomState
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
          disablekb: 0,
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin
        },
        events: {
          onReady: () => {
            setPlayerReady(true);
            readyChangeRef.current?.(true);
            followingChangeRef.current?.(true);
            if (trackRef.current) {
              playerRef.current?.cueVideoById({ videoId: trackRef.current.videoId, startSeconds: 0 });
            }
          },
          onStateChange: (event: YT.OnStateChangeEvent) => {
            const now = Date.now();
            const player = playerRef.current;
            playerStateChangeRef.current?.(event.data);
            if (event.data === 3) lastBufferingAtRef.current = now;

            const state = playbackRef.current;
            const outsideRoomCommand = now > roomCommandGraceRef.current;
            if (outsideRoomCommand && player && [1, 2, 5].includes(event.data)) {
              const gap = player.getCurrentTime() - roomPlaybackPosition(state);
              const stateConflict =
                (event.data === 2 && state.status === 'playing') ||
                (event.data === 1 && state.status === 'paused');

              if (isHost) {
                if (event.data === 1) publishHostNativeState('playing');
                else if (event.data === 2 || (event.data === 5 && Math.abs(gap) > 0.8)) publishHostNativeState('paused');
              } else if (stateConflict || Math.abs(gap) > 1.25) {
                setFollowingRoom(false);
              }
            }

            if (event.data === 0 && followingRoomRef.current) endedRef.current?.();

            const currentTrack = trackRef.current;
            if (currentTrack && [1, 2, 5].includes(event.data)) {
              void updateParticipant(roomCode, uid, {
                readyFor: currentTrack.videoId,
                playerState: event.data,
                followingRoom: isHost ? true : followingRoomRef.current
              });
            } else {
              void updateParticipant(roomCode, uid, {
                playerState: event.data,
                followingRoom: isHost ? true : followingRoomRef.current
              });
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
  }, [roomCode, uid, isHost]);

  useEffect(() => {
    trackRef.current = track;
    if (!playerReady || !track || !playerRef.current) return;
    lastTelemetryAtRef.current = 0;
    lastReportedDriftRef.current = null;
    correctionRef.current = 0;
    followingRoomRef.current = true;
    followingChangeRef.current?.(true);
    roomCommandGraceRef.current = Date.now() + 1800;
    playerRef.current.cueVideoById({ videoId: track.videoId, startSeconds: 0 });
    void updateParticipant(roomCode, uid, {
      readyFor: '',
      driftMs: 0,
      followingRoom: true
    });
  }, [track?.videoId, playerReady, roomCode, uid]);

  useEffect(() => {
    playbackRef.current = playback;
    localVersionRef.current = Math.max(localVersionRef.current, playback.version);
    commandStartRef.current = Date.now();
    const player = playerRef.current;
    if (!playerReady || !track?.videoId || !player) return;
    if (commandTimerRef.current) clearTimeout(commandTimerRef.current);

    const apply = () => applyRoomState();
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
      if (!player) return;

      const expected = roomPlaybackPosition(state);
      const actual = player.getCurrentTime();
      if (!Number.isFinite(actual)) return;
      const drift = actual - expected;
      const driftMs = Math.round(drift * 1000);
      const now = Date.now();
      const playerState = player.getPlayerState();

      const telemetryDue = now - lastTelemetryAtRef.current > 4200;
      const changedMeaningfully =
        lastReportedDriftRef.current === null ||
        Math.abs(driftMs - lastReportedDriftRef.current) > 400;

      if (telemetryDue || Math.abs(driftMs) > 1800 || (changedMeaningfully && now - lastTelemetryAtRef.current > 2400)) {
        lastTelemetryAtRef.current = now;
        lastReportedDriftRef.current = driftMs;
        void updateParticipant(roomCode, uid, {
          driftMs,
          playerState,
          followingRoom: isHost ? true : followingRoomRef.current
        });
      }

      const recentlyBuffered = now - lastBufferingAtRef.current < 6000;
      const outsideCommand = now > roomCommandGraceRef.current;

      if (isHost) {
        if (outsideCommand && !recentlyBuffered && [1, 2, 5].includes(playerState)) {
          const stateConflict =
            (playerState === 2 && state.status === 'playing') ||
            (playerState === 1 && state.status === 'paused');
          if (stateConflict || Math.abs(drift) > 0.9) {
            publishHostNativeState(playerState === 1 ? 'playing' : 'paused');
          }
        }
        return;
      }

      if (
        followingRoomRef.current &&
        outsideCommand &&
        !recentlyBuffered &&
        Math.abs(drift) > 2.2
      ) {
        setFollowingRoom(false);
        return;
      }

      if (!followingRoomRef.current || state.status !== 'playing' || playerState !== 1) return;

      const settling = now - commandStartRef.current < 6000;
      const threshold = settling ? 0.85 : 1.2;
      const cooldown = settling ? 8000 : 12000;
      if (
        !recentlyBuffered &&
        Math.abs(drift) > threshold &&
        now - correctionRef.current > cooldown
      ) {
        correctionRef.current = now;
        roomCommandGraceRef.current = now + 1400;
        player.seekTo(expected, true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [playerReady, roomCode, track?.videoId, uid, isHost]);

  return <div className="youtube-frame" ref={mountRef} aria-label="YouTube player" />;
});
