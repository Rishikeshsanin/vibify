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
    if (stored === 'on') setEnabled(true);
  }, []);

  const toggle = () => {
    setEnabled(current => {
      const next = !current;
      window.localStorage.setItem(VIBE_MODE_KEY, next ? 'on' : 'off');
      return next;
    });
  };

  return (
    <div className={`vibe-mode-layer ${enabled ? 'vibe-mode-on' : ''}`} aria-hidden={false}>
      {track && (
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
        title="Vibe Mode uses the current track thumbnail for a stable ambient room theme. It never samples the changing YouTube video frames."
        aria-pressed={enabled}
      >
        <Sparkles size={15}/>
        <span>Vibe mode</span>
        <i aria-hidden="true"/>
      </button>
    </div>
  );
}
