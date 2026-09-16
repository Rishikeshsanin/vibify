'use client';

import { Check, Flame, ListPlus, Play, Search, Sparkles, ThumbsUp, X } from 'lucide-react';
import type { Track } from '@/lib/types';

export type VibePickView = {
  id: string;
  track: Track;
  suggestedBy: string;
  suggestedByName: string;
  createdAt: number;
  votes: number;
  votedByMe: boolean;
  voterNames: string[];
};

type Props = {
  picks: VibePickView[];
  isHost: boolean;
  listenerCount: number;
  onSuggest: () => void;
  onVote: (pick: VibePickView) => void;
  onQueue: (pick: VibePickView) => void;
  onPlay: (pick: VibePickView) => void;
  onPass: (pick: VibePickView) => void;
};

export function VibePicks({
  picks,
  isHost,
  listenerCount,
  onSuggest,
  onVote,
  onQueue,
  onPlay,
  onPass
}: Props) {
  return (
    <section className="vibe-picks-wrap">
      <section className="glass vibe-picks-panel">
        <header className="vibe-picks-head">
          <div>
            <span className="eyebrow"><Flame size={13}/> VIBE PICKS</span>
            <h2>Let the room pitch what comes next.</h2>
            <p>Guests suggest. The room votes. The host still decides what actually plays.</p>
          </div>
          {!isHost ? (
            <button className="vibe-suggest-button" onClick={onSuggest}>
              <Search size={16}/><span>Suggest a track</span>
            </button>
          ) : (
            <div className="vibe-host-badge"><Sparkles size={14}/><span>HOST REVIEW</span></div>
          )}
        </header>

        {picks.length === 0 ? (
          <div className="vibe-picks-empty">
            <span><Flame size={20}/></span>
            <div>
              <b>No pitches yet</b>
              <p>{isHost ? 'When friends suggest songs, their picks and live vote counts will appear here.' : 'Pitch the song you want the room to hear next.'}</p>
            </div>
            {!isHost && <button onClick={onSuggest}>Suggest the first track</button>}
          </div>
        ) : (
          <div className="vibe-picks-grid">
            {picks.map((pick, index) => {
              const threshold = listenerCount >= 2 ? Math.max(2, Math.ceil(listenerCount * 0.6)) : Number.POSITIVE_INFINITY;
              const roomWantsIt = pick.votes >= threshold;
              return (
                <article className={`vibe-pick-card ${roomWantsIt ? 'room-wants-it' : ''}`} key={pick.id}>
                  <div className="vibe-pick-art">
                    <img src={pick.track.thumbnail} alt="" />
                    <span className="vibe-pick-rank">#{index + 1}</span>
                    {roomWantsIt && <span className="room-wants-badge"><Flame size={12}/> ROOM WANTS THIS</span>}
                  </div>

                  <div className="vibe-pick-body">
                    <div className="vibe-pick-title">
                      <b>{pick.track.title}</b>
                      <span>{pick.track.channelTitle}</span>
                    </div>
                    <div className="vibe-pick-meta">
                      <span>Suggested by <b>{pick.suggestedByName}</b></span>
                      <span className="vibe-vote-count"><Flame size={13}/><b>{pick.votes}</b> {pick.votes === 1 ? 'vibe' : 'vibes'}</span>
                    </div>
                    {pick.voterNames.length > 0 && (
                      <p className="vibe-voters">{formatVoters(pick.voterNames)}</p>
                    )}

                    {isHost ? (
                      <div className="vibe-host-actions">
                        <button className="vibe-queue-action" onClick={() => onQueue(pick)}><ListPlus size={15}/>Add to queue</button>
                        <button onClick={() => onPlay(pick)}><Play size={14} fill="currentColor"/>Play now</button>
                        <button className="vibe-pass-action" onClick={() => onPass(pick)} title="Remove this suggestion"><X size={15}/>Pass</button>
                      </div>
                    ) : (
                      <button
                        className={`vibe-vote-button ${pick.votedByMe ? 'is-voted' : ''}`}
                        onClick={() => onVote(pick)}
                      >
                        {pick.votedByMe ? <Check size={16}/> : <ThumbsUp size={16}/>} 
                        <span>{pick.votedByMe ? 'Vibed' : '+1 Vibe'}</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}

function formatVoters(names: string[]) {
  if (names.length === 1) return `${names[0]} wants this`;
  if (names.length === 2) return `${names[0]} and ${names[1]} want this`;
  return `${names[0]}, ${names[1]} +${names.length - 2} more want this`;
}
