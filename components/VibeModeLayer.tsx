'use client';

import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { subscribeRoomTrack } from '@/lib/room';
import type { Track } from '@/lib/types';

const VIBE_MODE_KEY = 'vibify-vibe-mode';

type Props = {
  roomCode: string;
};

export function VibeModeLayer({ roomCode }: Props) {
  const [track, setTrack] = useState<Track | undefined>();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => subscribeRoomTrack(roomCode, setTrack), [roomCode]);

  useEffect(() => {
    const stored = window.localStorage.getItem(VIBE_MODE_KEY);
    if (stored === 'off') setEnabled(false);
    else setEnabled(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('vibe-mode-on', enabled);
    root.classList.toggle('vibe-has-track', enabled && Boolean(track));

    return () => {
      root.classList.remove('vibe-mode-on');
      root.classList.remove('vibe-has-track');
    };
  }, [enabled, track?.videoId]);

  const toggle = () => {
    setEnabled(current => {
      const next = !current;
      window.localStorage.setItem(VIBE_MODE_KEY, next ? 'on' : 'off');
      return next;
    });
  };

  return (
    <div className="vibe-mode-layer">
      {track && enabled && (
        <div
          className="vibe-artwork-aura"
          aria-hidden="true"
          style={{ backgroundImage: `url(${track.thumbnail})` }}
        />
      )}
      <button
        type="button"
        className={`vibe-mode-toggle ${enabled ? 'is-on' : ''}`}
        onClick={toggle}
        title="Vibe Mode uses the current track artwork as a stable ambient room theme. It never follows the changing video frames."
        aria-pressed={enabled}
      >
        <Sparkles size={15}/>
        <span>{enabled ? 'Vibe mode on' : 'Vibe mode off'}</span>
        <i aria-hidden="true"/>
      </button>
    </div>
  );
}
