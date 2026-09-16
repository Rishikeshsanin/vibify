'use client';

import { Eye, EyeOff, Flame, LoaderCircle, MessageCircle, Music2, Search, Send, Smile, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  addToQueue,
  clearVibePick,
  playTrackNow,
  removeChatMessage,
  removeReaction,
  sendChatMessage,
  sendReaction,
  serverNow,
  setVibeVote,
  suggestVibePick
} from '@/lib/room';
import type { ChatMessage, Participant, ReactionEvent, Track } from '@/lib/types';
import { VibePicks, type VibePickView } from './VibePicks';

const REACTIONS = ['🔥', '❤️', '😂', '✨', '🎧', '🫶'];
const FLOATING_REACTIONS_KEY = 'vibify-floating-reactions';

type Props = {
  roomCode: string;
  uid: string;
  name: string;
  participants: Participant[];
};

export function RoomChat({ roomCode, uid, name, participants }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(() => serverNow());
  const [floatingReactions, setFloatingReactions] = useState(true);
  const [boardOpen, setBoardOpen] = useState(false);
  const [suggestSearchOpen, setSuggestSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [pickBusyId, setPickBusyId] = useState('');
  const [pickError, setPickError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const me = participants.find(participant => participant.uid === uid);
  const isHost = me?.role === 'host';
  const listenerCount = participants.filter(participant => participant.role === 'guest').length;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(serverNow()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(FLOATING_REACTIONS_KEY);
    if (stored === 'off') {
      setFloatingReactions(false);
      return;
    }
    if (stored === 'on') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) setFloatingReactions(false);
  }, []);

  const messages = useMemo(() => {
    const all: ChatMessage[] = [];
    participants.forEach(participant => {
      Object.values(participant.messages ?? {}).forEach(message => {
        if (message.expiresAt > now) all.push(message);
      });
    });
    return all.sort((a, b) => a.createdAt - b.createdAt).slice(-40);
  }, [participants, now]);

  const reactions = useMemo(() => {
    if (!floatingReactions) return [];
    const all: ReactionEvent[] = [];
    participants.forEach(participant => {
      Object.values(participant.reactions ?? {}).forEach(reaction => {
        if (reaction.expiresAt > now) all.push(reaction);
      });
    });
    return all.sort((a, b) => a.createdAt - b.createdAt);
  }, [participants, now, floatingReactions]);

  const vibePicks = useMemo(() => {
    const map = new Map<string, VibePickView>();

    participants.forEach(participant => {
      Object.values(participant.vibePicks ?? {}).forEach(proposal => {
        const current = map.get(proposal.id);
        if (!current || proposal.createdAt < current.createdAt) {
          map.set(proposal.id, { ...proposal, votes: 0, votedByMe: false, voterNames: [] });
        }
      });
    });

    participants.forEach(participant => {
      Object.entries(participant.vibeVotes ?? {}).forEach(([videoId, active]) => {
        if (!active) return;
        const pick = map.get(videoId);
        if (!pick) return;
        pick.votes += 1;
        pick.voterNames.push(participant.name);
        if (participant.uid === uid) pick.votedByMe = true;
      });
    });

    return Array.from(map.values()).sort((a, b) => (b.votes - a.votes) || (a.createdAt - b.createdAt));
  }, [participants, uid]);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    const mine = participants.find(participant => participant.uid === uid);
    if (!mine) return;
    const expiredMessages = Object.values(mine.messages ?? {}).filter(message => message.expiresAt <= now);
    const expiredReactions = Object.values(mine.reactions ?? {}).filter(reaction => reaction.expiresAt <= now);
    expiredMessages.forEach(message => { void removeChatMessage(roomCode, uid, message.id); });
    expiredReactions.forEach(reaction => { void removeReaction(roomCode, uid, reaction.id); });
  }, [Math.floor(now / 30000), participants, roomCode, uid]);

  const submitMessage = async (event: FormEvent) => {
    event.preventDefault();
    const clean = text.trim();
    if (!clean || sending) return;
    setSending(true);
    try {
      await sendChatMessage(roomCode, uid, name, clean);
      setText('');
    } finally {
      setSending(false);
    }
  };

  const react = async (emoji: string) => {
    try { await sendReaction(roomCode, uid, name, emoji); } catch {}
  };

  const toggleFloatingReactions = () => {
    setFloatingReactions(current => {
      const next = !current;
      window.localStorage.setItem(FLOATING_REACTIONS_KEY, next ? 'on' : 'off');
      return next;
    });
  };

  const searchSongs = async (event: FormEvent) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (query.length < 2) return;
    setSearching(true);
    setPickError('');
    try {
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Search failed.');
      setSearchResults(data.tracks ?? []);
    } catch (error) {
      setPickError(error instanceof Error ? error.message : 'Could not search right now.');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const suggestTrack = async (track: Track) => {
    if (isHost || pickBusyId) return;
    setPickBusyId(track.videoId);
    setPickError('');
    try {
      const existing = vibePicks.find(pick => pick.id === track.videoId);
      if (existing) await setVibeVote(roomCode, uid, track.videoId, true);
      else await suggestVibePick(roomCode, uid, name, track);
      setSuggestSearchOpen(false);
      setBoardOpen(true);
    } catch (error) {
      setPickError(error instanceof Error ? error.message : 'Could not suggest that track.');
    } finally {
      setPickBusyId('');
    }
  };

  const voteForPick = async (pick: VibePickView) => {
    if (isHost || pickBusyId) return;
    setPickBusyId(pick.id);
    setPickError('');
    try {
      await setVibeVote(roomCode, uid, pick.id, !pick.votedByMe);
    } catch (error) {
      setPickError(error instanceof Error ? error.message : 'Could not update your vote.');
    } finally {
      setPickBusyId('');
    }
  };

  const participantUids = () => participants.map(participant => participant.uid);

  const queuePick = async (pick: VibePickView) => {
    if (!isHost || pickBusyId) return;
    setPickBusyId(pick.id);
    setPickError('');
    try {
      await addToQueue(roomCode, pick.track, pick.suggestedBy, pick.suggestedByName);
      await clearVibePick(roomCode, pick.id, participantUids());
    } catch (error) {
      setPickError(error instanceof Error ? error.message : 'Could not add that pick to the queue.');
    } finally {
      setPickBusyId('');
    }
  };

  const playPick = async (pick: VibePickView) => {
    if (!isHost || pickBusyId) return;
    setPickBusyId(pick.id);
    setPickError('');
    try {
      await playTrackNow(roomCode, pick.track);
      await clearVibePick(roomCode, pick.id, participantUids());
      setBoardOpen(false);
    } catch (error) {
      setPickError(error instanceof Error ? error.message : 'Could not play that pick.');
    } finally {
      setPickBusyId('');
    }
  };

  const passPick = async (pick: VibePickView) => {
    if (!isHost || pickBusyId) return;
    setPickBusyId(pick.id);
    setPickError('');
    try {
      await clearVibePick(roomCode, pick.id, participantUids());
    } catch (error) {
      setPickError(error instanceof Error ? error.message : 'Could not clear that pick.');
    } finally {
      setPickBusyId('');
    }
  };

  return (
    <>
      <section className="glass vibe-chat">
        <header className="vibe-chat-head">
          <div className="vibe-chat-title">
            <span className="eyebrow"><MessageCircle size={13}/> VIBE CHAT</span>
            <h3>Room chat</h3>
          </div>
          <div className="vibe-chat-head-actions">
            <button type="button" className={`reaction-visibility-toggle ${floatingReactions ? '' : 'is-muted'}`} onClick={toggleFloatingReactions} aria-pressed={!floatingReactions} title={floatingReactions ? 'Hide floating emoji reactions on this device' : 'Show floating emoji reactions on this device'}>
              {floatingReactions ? <EyeOff size={16}/> : <Eye size={16}/>}
              <span><b>{floatingReactions ? 'Calm the vibe' : 'Reactions off'}</b><small>{floatingReactions ? 'Hide floating emojis' : 'Show floating emojis'}</small></span>
            </button>
            <span className="chat-ttl" tabIndex={0} data-tooltip="Messages disappear 10 minutes after they are sent — keeping the room fresh and in the moment." aria-label="Messages disappear 10 minutes after they are sent">10 MIN</span>
          </div>
        </header>

        <div className="vibe-messages" ref={listRef}>
          {messages.length === 0 ? (
            <div className="chat-empty"><Smile size={20}/><b>Say something</b><span>Messages disappear automatically after 10 minutes.</span></div>
          ) : messages.map(message => (
            <article className={`vibe-message ${message.uid === uid ? 'mine' : ''}`} key={message.id}>
              <div><b>{message.uid === uid ? 'You' : message.name}</b><small>{formatRemaining(message.expiresAt - now)}</small></div>
              <p>{message.text}</p>
            </article>
          ))}
        </div>

        <div className="quick-reactions" aria-label="Quick reactions">
          {REACTIONS.map(emoji => <button key={emoji} onClick={() => { void react(emoji); }} title={`React ${emoji}`}>{emoji}</button>)}
        </div>

        <form className="vibe-chat-form" onSubmit={submitMessage}>
          <input value={text} onChange={event => setText(event.target.value.slice(0, 180))} placeholder="Message the room…" aria-label="Room message" maxLength={180}/>
          <button type="submit" disabled={!text.trim() || sending} aria-label="Send message"><Send size={16}/></button>
        </form>
      </section>

      <section className="glass vibe-picks-dock">
        <div className="vibe-picks-dock-icon"><Flame size={17}/></div>
        <div className="vibe-picks-dock-copy">
          <span className="eyebrow">VIBE PICKS</span>
          <b>{vibePicks.length ? `${vibePicks.length} live ${vibePicks.length === 1 ? 'pitch' : 'pitches'}` : 'What should play next?'}</b>
          <small>{vibePicks.length ? `${vibePicks[0].votes} ${vibePicks[0].votes === 1 ? 'vibe' : 'vibes'} on the top pick` : (isHost ? 'Friends can pitch songs for your approval.' : 'Suggest a track and let the room vote.')}</small>
        </div>
        <button onClick={() => setBoardOpen(true)}>{vibePicks.length ? 'Open board' : (isHost ? 'View board' : 'Pitch a track')}</button>
      </section>

      {floatingReactions && <div className="reaction-layer" aria-hidden="true">{reactions.map(reaction => <span key={reaction.id} className={`reaction-burst lane-${hashLane(reaction.id)}`} title={reaction.name}>{reaction.emoji}</span>)}</div>}

      {boardOpen && (
        <div className="vibe-board-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setBoardOpen(false); }}>
          <button className="vibe-board-close" onClick={() => setBoardOpen(false)} aria-label="Close Vibe Picks"><X/></button>
          <VibePicks picks={vibePicks} isHost={Boolean(isHost)} listenerCount={listenerCount} onSuggest={() => setSuggestSearchOpen(true)} onVote={pick => { void voteForPick(pick); }} onQueue={pick => { void queuePick(pick); }} onPlay={pick => { void playPick(pick); }} onPass={pick => { void passPick(pick); }}/>
          {pickError && <div className="vibe-pick-error">{pickError}</div>}
        </div>
      )}

      {suggestSearchOpen && !isHost && (
        <div className="vibe-suggest-search-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSuggestSearchOpen(false); }}>
          <section className="search-modal glass v2-search-modal vibe-suggest-search">
            <div className="search-head"><div><span className="eyebrow">PITCH A TRACK</span><h2>What should the room hear next?</h2></div><button className="icon-button" onClick={() => setSuggestSearchOpen(false)}><X/></button></div>
            <form className="search-box" onSubmit={searchSongs}><Search/><input autoFocus value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search songs or artists…"/><button type="submit" disabled={searching}>{searching ? <LoaderCircle className="spin"/> : 'Search'}</button></form>
            {pickError && <p className="search-error">{pickError}</p>}
            <div className="results-list">
              {searchResults.length === 0 && !searching && <div className="search-empty"><Music2/><b>Pitch your next song</b><span>It will go to Vibe Picks for the room to vote on.</span></div>}
              {searchResults.map(track => {
                const existing = vibePicks.find(pick => pick.id === track.videoId);
                const alreadyVoted = existing?.votedByMe ?? false;
                return (
                  <div key={track.videoId} className="track-result track-result-v2">
                    <img src={track.thumbnail} alt=""/>
                    <span><b>{track.title}</b><small>{track.channelTitle}</small></span>
                    <div className="result-actions-v2 vibe-result-actions">
                      <button className="vibe-result-suggest" disabled={alreadyVoted || Boolean(pickBusyId)} onClick={() => { void suggestTrack(track); }}>
                        {pickBusyId === track.videoId ? <LoaderCircle className="spin" size={16}/> : <Flame size={16}/>}<span>{alreadyVoted ? 'Already vibed' : existing ? '+1 Vibe' : 'Suggest'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function hashLane(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash % 6;
}

function formatRemaining(ms: number) {
  const minutes = Math.max(1, Math.ceil(ms / 60000));
  return `${minutes}m`;
}
