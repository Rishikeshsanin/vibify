'use client';

import {
  ArrowLeft,
  Check,
  ChevronRight,
  ChevronsRight,
  Copy,
  Headphones,
  ListPlus,
  LoaderCircle,
  LogOut,
  Music2,
  Pause,
  Play,
  Plus,
  Radio,
  Search,
  SkipBack,
  SkipForward,
  Sparkles,
  Users,
  Volume2,
  X
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { firebaseConfigured } from '@/lib/firebase';
import {
  addToQueue,
  bindServerClock,
  createRoom,
  joinRoom,
  leaveRoom,
  playQueueItem,
  removeQueueItem,
  reorderQueue,
  roomPlaybackPosition,
  serverNow,
  setLyricsOffset,
  setTrack,
  subscribeRoom,
  writePlayback
} from '@/lib/room';
import type { Participant, QueueItem, Room, Track } from '@/lib/types';
import { RoomChat } from './RoomChat';
import { RoomFeatures } from './RoomFeatures';
import { YouTubePlayer, type YouTubeHandle } from './YouTubePlayer';

type View = 'home' | 'room';

const FALLBACK_TRACKS: Track[] = [
  {
    videoId: 'jfKfPfyJRdk',
    title: 'lofi hip hop radio 📚 beats to relax/study to',
    channelTitle: 'Lofi Girl',
    thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg'
  },
  {
    videoId: '5qap5aO4i9A',
    title: 'lofi hip hop radio 🌿 beats to relax/study to',
    channelTitle: 'Lofi Girl',
    thumbnail: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg'
  }
];

export function VibifyApp() {
  const playerRef = useRef<YouTubeHandle>(null);
  const advancingRef = useRef(false);
  const [view, setView] = useState<View>('home');
  const [roomCode, setRoomCode] = useState('');
  const [uid, setUid] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [controlBusy, setControlBusy] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [localPlayerState, setLocalPlayerState] = useState(-1);
  const [followingVibe, setFollowingVibe] = useState(true);
  const [error, setError] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Track[]>([]);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [duration, setDuration] = useState(0);
  const [displayTime, setDisplayTime] = useState(0);
  const [seekDraft, setSeekDraft] = useState<number | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => bindServerClock(), []);

  useEffect(() => {
    const storedName = localStorage.getItem('vibify-name');
    if (storedName) setName(storedName);
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room')?.toUpperCase();
    if (code) setJoinCode(code);
  }, []);

  useEffect(() => {
    if (!roomCode) return;
    return subscribeRoom(roomCode, nextRoom => {
      if (!nextRoom) {
        setError('This room has ended.');
        setRoom(null);
        return;
      }
      setRoom(nextRoom);
    });
  }, [roomCode]);

  useEffect(() => {
    setLocalPlayerState(-1);
    setFollowingVibe(true);
    if (!room?.track) {
      setDuration(0);
      setDisplayTime(0);
      return;
    }
    const timer = window.setInterval(() => {
      const d = playerRef.current?.getDuration() ?? 0;
      if (d > 0) setDuration(d);
      setDisplayTime(playerRef.current?.getCurrentTime() ?? 0);
      setLocalPlayerState(playerRef.current?.getPlayerState() ?? -1);
    }, 300);
    return () => clearInterval(timer);
  }, [room?.track?.videoId]);

  const me = uid ? room?.participants?.[uid] : undefined;
  const isHost = Boolean(room && uid && room.hostUid === uid);
  const participants = useMemo(
    () => Object.values(room?.participants ?? {}).filter(p => p.online !== false),
    [room?.participants]
  );
  const queueItems = useMemo(
    () => Object.values(room?.queue ?? {}).sort((a, b) => (a.order - b.order) || (a.addedAt - b.addedAt)),
    [room?.queue]
  );
  const readyCount = room?.track
    ? participants.filter(p => p.readyFor === room.track?.videoId).length
    : 0;

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  };

  const enterRoom = (code: string, newUid: string) => {
    setRoomCode(code);
    setUid(newUid);
    setView('room');
    setAudioUnlocked(false);
    setAutoplayBlocked(false);
    setPlayerReady(false);
    setLocalPlayerState(-1);
    setFollowingVibe(true);
    const url = new URL(window.location.href);
    url.searchParams.set('room', code);
    history.replaceState({}, '', url);
  };

  const handleCreate = async () => {
    if (!name.trim()) return setError('Give yourself a name first.');
    if (!firebaseConfigured) return setError('Firebase credentials are needed before rooms can go live.');
    setBusy(true);
    setError('');
    try {
      localStorage.setItem('vibify-name', name.trim());
      const result = await createRoom(name.trim());
      enterRoom(result.code, result.uid);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create room.');
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (event?: FormEvent) => {
    event?.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!name.trim()) return setError('Give yourself a name first.');
    if (code.length !== 6) return setError('Room codes are six characters.');
    if (!firebaseConfigured) return setError('Firebase credentials are needed before rooms can go live.');
    setBusy(true);
    setError('');
    try {
      localStorage.setItem('vibify-name', name.trim());
      const result = await joinRoom(code, name.trim());
      enterRoom(code, result.uid);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join room.');
    } finally {
      setBusy(false);
    }
  };

  const exitRoom = async () => {
    if (roomCode && uid) await leaveRoom(roomCode, uid);
    setView('home');
    setRoom(null);
    setRoomCode('');
    setUid('');
    setAudioUnlocked(false);
    setAutoplayBlocked(false);
    setPlayerReady(false);
    setLocalPlayerState(-1);
    setFollowingVibe(true);
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    history.replaceState({}, '', url.pathname);
  };

  const unlockAudio = () => {
    if (!playerReady) {
      notify('Player is still loading');
      return;
    }
    playerRef.current?.unlockAudio();
    setAudioUnlocked(true);
    setAutoplayBlocked(false);
    notify('Audio enabled for this room');
  };

  const catchUpToVibe = () => {
    if (!playerReady || !room?.track) return;
    playerRef.current?.syncToRoom();
    setFollowingVibe(true);
    setAudioUnlocked(true);
    setAutoplayBlocked(false);
    notify('Caught up to the vibe');
  };

  const performControl = async (action: () => Promise<void>) => {
    if (controlBusy) return;
    setControlBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Playback command failed. Please try again.');
      notify('Playback command failed');
    } finally {
      setControlBusy(false);
    }
  };

  const sendPlay = async () => {
    if (!room || !isHost || !room.track || !playerReady) return;
    const position = room.playback.status === 'playing'
      ? roomPlaybackPosition(room.playback)
      : (playerRef.current?.getCurrentTime() ?? room.playback.position);
    await performControl(() => writePlayback(roomCode, {
      status: 'playing',
      position,
      executeAt: serverNow() + 650,
      version: room.playback.version + 1
    }));
  };

  const sendPause = async () => {
    if (!room || !isHost || !room.track || !playerReady) return;
    const lead = 260;
    const position = room.playback.status === 'playing'
      ? roomPlaybackPosition(room.playback, serverNow() + lead)
      : room.playback.position;
    await performControl(() => writePlayback(roomCode, {
      status: 'paused',
      position,
      executeAt: serverNow() + lead,
      version: room.playback.version + 1
    }));
  };

  const sendSeek = async (position: number) => {
    if (!room || !isHost || !room.track || !playerReady) return;
    const target = Math.max(0, Math.min(duration || Number.MAX_SAFE_INTEGER, position));
    await performControl(() => writePlayback(roomCode, {
      status: room.playback.status,
      position: target,
      executeAt: serverNow() + 320,
      version: room.playback.version + 1
    }));
  };

  const searchSongs = async (event: FormEvent) => {
    event.preventDefault();
    if (searchQuery.trim().length < 2) return;
    setSearching(true);
    setError('');
    try {
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Search failed.');
      setResults(data.tracks ?? []);
    } catch (e) {
      setResults(FALLBACK_TRACKS);
      setError(e instanceof Error ? `${e.message} Showing demo tracks for now.` : 'Search unavailable.');
    } finally {
      setSearching(false);
    }
  };

  const chooseTrack = async (track: Track) => {
    if (!room || !isHost) return;
    try {
      await setTrack(roomCode, track, room.playback.version);
      setSearchOpen(false);
      notify('Playing selection ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change track.');
    }
  };

  const queueTrack = async (track: Track) => {
    if (!room || !isHost) return;
    try {
      await addToQueue(roomCode, track, uid, name.trim() || room.hostName);
      notify('Added to queue');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add to queue.');
    }
  };

  const playQueued = async (item: QueueItem) => {
    if (!room || !isHost) return;
    await performControl(async () => {
      await playQueueItem(roomCode, item, room.playback.version, true);
      notify('Playing from queue');
    });
  };

  const removeQueued = async (item: QueueItem) => {
    if (!isHost) return;
    try {
      await removeQueueItem(roomCode, item.id);
      notify('Removed from queue');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update queue.');
    }
  };

  const moveQueued = async (item: QueueItem, delta: -1 | 1) => {
    if (!isHost) return;
    const index = queueItems.findIndex(entry => entry.id === item.id);
    const nextIndex = index + delta;
    if (index < 0 || nextIndex < 0 || nextIndex >= queueItems.length) return;
    const nextQueue = [...queueItems];
    [nextQueue[index], nextQueue[nextIndex]] = [nextQueue[nextIndex], nextQueue[index]];
    try {
      await reorderQueue(roomCode, nextQueue);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reorder queue.');
    }
  };

  const handleTrackEnded = async () => {
    if (!room || !isHost || queueItems.length === 0 || advancingRef.current) return;
    advancingRef.current = true;
    try {
      await playQueueItem(roomCode, queueItems[0], room.playback.version, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not advance the queue.');
    } finally {
      window.setTimeout(() => { advancingRef.current = false; }, 1200);
    }
  };

  const changeLyricsOffset = async (offsetMs: number) => {
    if (!isHost) return;
    try {
      await setLyricsOffset(roomCode, offsetMs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update lyrics timing.');
    }
  };

  const copyInvite = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomCode);
    await navigator.clipboard.writeText(url.toString());
    notify('Invite link copied');
  };

  if (view === 'home') {
    return (
      <main className="home-shell">
        <Ambient />
        <nav className="nav"><Logo /><span className="nav-tag">SYNCED LISTENING</span></nav>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><Radio size={14} /> ONE ROOM · ONE SONG · EVERY DEVICE</div>
            <h1>Press play once.<br /><span>Everyone hears it.</span></h1>
            <p>Vibify turns a room code into a shared listening session. Phones and laptops stream the same track directly from YouTube while the host keeps everyone together.</p>
            <div className="hero-chips"><span><Volume2 size={15}/> Direct playback</span><span><Radio size={15}/> Live room sync</span><span><Headphones size={15}/> Phone + laptop</span></div>
          </div>
          <div className="entry-card glass">
            <div className="entry-top"><span>START A SESSION</span><Sparkles size={18}/></div>
            <label>Your name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="What should the room call you?" maxLength={24} />
            <button className="primary" onClick={handleCreate} disabled={busy}>{busy ? <LoaderCircle className="spin"/> : <Plus/>}<span>Create listening room</span><ChevronRight/></button>
            <div className="or"><span/>OR JOIN WITH A CODE<span/></div>
            <form onSubmit={handleJoin} className="join-form">
              <input className="code-input" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="ABC123" maxLength={6}/>
              <button type="submit" className="secondary" disabled={busy}>Join</button>
            </form>
            {error && <p className="error-text">{error}</p>}
            {!firebaseConfigured && <div className="setup-note"><span className="pulse-dot"/><b>Build ready.</b> Firebase keys are the only thing missing for live rooms.</div>}
          </div>
        </section>
        <section className="how-strip">
          <div><b>01</b><span>Create a code</span></div><div><b>02</b><span>Friends join</span></div><div><b>03</b><span>Pick a track</span></div><div><b>04</b><span>Listen together</span></div>
        </section>
      </main>
    );
  }

  if (!room) {
    return <main className="loading-screen"><Logo/><LoaderCircle className="spin"/><span>Joining room {roomCode}…</span>{error && <p>{error}</p>}</main>;
  }

  const roomTimelineTime = roomPlaybackPosition(room.playback);
  const currentTime = seekDraft ?? displayTime;
  const localGapMs = Math.round((displayTime - roomTimelineTime) * 1000);
  const controlsDisabled = !isHost || !room.track || !playerReady || controlBusy;
  const actualPlaybackStatus =
    isHost && audioUnlocked && localPlayerState === 1
      ? 'playing'
      : isHost && audioUnlocked && [0, 2, 5].includes(localPlayerState)
        ? 'paused'
        : room.playback.status;
  const vibeStatus = describeVibeStatus({
    hasTrack: Boolean(room.track),
    following: followingVibe,
    gapMs: localGapMs,
    localPlayerState,
    roomStatus: room.playback.status
  });
  const lyricsTime = followingVibe ? roomTimelineTime : displayTime;

  return (
    <main className="room-shell v2-room-shell">
      <Ambient />
      <nav className="room-nav">
        <div className="nav-left"><button className="icon-button" onClick={exitRoom}><ArrowLeft/></button><Logo/></div>
        <div className="room-code-pill"><span className="live-dot"/>ROOM <b>{roomCode}</b><button onClick={copyInvite}><Copy size={15}/></button></div>
        <div className="nav-right"><span><Users size={16}/>{participants.length}</span><button className="icon-button" onClick={exitRoom}><LogOut/></button></div>
      </nav>

      <div className="room-grid">
        <section className="player-column">
          <div className="now-card glass">
            <div className="video-wrap">
              {room.track ? (
                <YouTubePlayer
                  ref={playerRef}
                  roomCode={roomCode}
                  uid={uid}
                  track={room.track}
                  playback={room.playback}
                  onReadyChange={setPlayerReady}
                  onPlayerStateChange={setLocalPlayerState}
                  onFollowingRoomChange={setFollowingVibe}
                  onEnded={() => { void handleTrackEnded(); }}
                  onAutoplayBlocked={() => {
                    setAutoplayBlocked(true);
                    setAudioUnlocked(false);
                  }}
                />
              ) : (
                <div className="empty-player"><div className="disc"><Music2/></div><h2>No track yet</h2><p>{isHost ? 'Search for something everyone should hear.' : `${room.hostName} is choosing the first track.`}</p></div>
              )}
              {room.track && (!audioUnlocked || autoplayBlocked) && (
                <div className="unlock-overlay">
                  <button onClick={unlockAudio} disabled={!playerReady}><Volume2/><span><b>{playerReady ? 'Enable audio' : 'Loading player…'}</b><small>{playerReady ? 'Only once for this room' : 'One moment'}</small></span></button>
                </div>
              )}
            </div>

            <div className="track-area">
              <div className="track-copy">
                <span className="eyebrow">NOW PLAYING</span>
                <h1>{room.track?.title ?? 'Waiting for music'}</h1>
                <p>{room.track?.channelTitle ?? `Hosted by ${room.hostName}`}</p>
              </div>
              {isHost && <button className="add-track" onClick={() => setSearchOpen(true)}><Search size={18}/>Find music</button>}
            </div>

            {room.track && (
              <div className={`local-vibe-strip ${followingVibe ? 'is-following' : 'is-local'}`}>
                <div className="local-vibe-icon"><Radio size={17}/></div>
                <div className="local-vibe-copy">
                  <b>{followingVibe ? 'With the vibe' : 'You are listening locally'}</b>
                  <span>
                    {followingVibe
                      ? (isHost ? 'Your Vibify controls move the whole room.' : 'YouTube controls affect only your device.')
                      : `${formatGap(localGapMs)} · the room keeps moving without you.`}
                  </span>
                </div>
                {!followingVibe && (
                  <button className="catch-up-button" onClick={catchUpToVibe} disabled={!playerReady}>
                    <ChevronsRight size={16}/> Catch up to the vibe
                  </button>
                )}
              </div>
            )}

            {isHost ? (
              <div className="controls host-room-controls">
                <div className="timeline">
                  <input
                    type="range"
                    min={0}
                    max={Math.max(duration, 1)}
                    step={0.1}
                    value={Math.min(currentTime, Math.max(duration, 1))}
                    disabled={controlsDisabled}
                    onChange={e => setSeekDraft(Number(e.target.value))}
                    onPointerUp={() => { if (seekDraft !== null) void sendSeek(seekDraft); setSeekDraft(null); }}
                    onKeyUp={() => { if (seekDraft !== null) void sendSeek(seekDraft); setSeekDraft(null); }}
                    onBlur={() => { if (seekDraft !== null) void sendSeek(seekDraft); setSeekDraft(null); }}
                  />
                  <div><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
                </div>
                <div className="transport">
                  <button disabled={controlsDisabled} onClick={() => { void sendSeek(roomTimelineTime - 10); }}><SkipBack/></button>
                  <button className="main-play" disabled={controlsDisabled} onClick={() => { void (actualPlaybackStatus === 'playing' ? sendPause() : sendPlay()); }}>
                    {controlBusy ? <LoaderCircle className="spin"/> : actualPlaybackStatus === 'playing' ? <Pause/> : <Play fill="currentColor"/>}
                  </button>
                  <button disabled={controlsDisabled} onClick={() => { void sendSeek(roomTimelineTime + 10); }}><SkipForward/></button>
                </div>
                <p className="control-note">The Vibify bar controls the whole room. The YouTube controls above are local to this device.</p>
              </div>
            ) : (
              <div className="guest-local-note">
                <Volume2 size={16}/>
                <span><b>Your YouTube controls are personal.</b> Pause, resume or seek without stopping anyone else. Catch up whenever you want.</span>
              </div>
            )}
          </div>
        </section>

        <aside className="side-column">
          <section className="glass sync-panel">
            <div className="panel-title"><div><span className="eyebrow">ROOM HEALTH</span><h2>Room vibe</h2></div><div className="sync-badge"><span/>LIVE</div></div>
            <div className="sync-stat">
              <div><span>Ready for this track</span><b>{room.track ? `${readyCount}/${participants.length}` : '—'}</b></div>
              <div title="Your local player compared with the room clock."><span>Your status</span><b className={!followingVibe || Math.abs(localGapMs) > 1500 ? 'warn' : ''}>{vibeStatus}</b></div>
            </div>
            <div className="member-list">
              {participants.map(participant => <ParticipantRow key={participant.uid} participant={participant} hostUid={room.hostUid} trackId={room.track?.videoId}/>) }
            </div>
            <button className="invite-button" onClick={copyInvite}><Copy size={17}/>Copy invite link</button>
          </section>

          <RoomChat roomCode={roomCode} uid={uid} name={name.trim() || me?.name || 'Listener'} participants={participants}/>
        </aside>
      </div>

      <RoomFeatures
        track={room.track}
        playbackTime={lyricsTime}
        duration={duration}
        queue={queueItems}
        isHost={isHost}
        followingVibe={followingVibe}
        localGapMs={localGapMs}
        lyricsOffsetMs={room.lyricsOffsetMs ?? 0}
        onLyricsOffsetChange={offset => { void changeLyricsOffset(offset); }}
        onOpenSearch={() => setSearchOpen(true)}
        onPlay={item => { void playQueued(item); }}
        onRemove={item => { void removeQueued(item); }}
        onMove={(item, delta) => { void moveQueued(item, delta); }}
      />

      {searchOpen && (
        <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setSearchOpen(false); }}>
          <section className="search-modal glass v2-search-modal">
            <div className="search-head"><div><span className="eyebrow">HOST MUSIC SEARCH</span><h2>What should the room hear?</h2></div><button className="icon-button" onClick={() => setSearchOpen(false)}><X/></button></div>
            <form className="search-box" onSubmit={searchSongs}><Search/><input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search songs, artists, moods…"/><button type="submit" disabled={searching}>{searching ? <LoaderCircle className="spin"/> : 'Search'}</button></form>
            {error && <p className="search-error">{error}</p>}
            <div className="results-list">
              {results.length === 0 && !searching && <div className="search-empty"><Music2/><b>Search YouTube</b><span>Play now or build the room queue.</span></div>}
              {results.map(track => (
                <div key={track.videoId} className="track-result track-result-v2">
                  <img src={track.thumbnail} alt=""/>
                  <span><b>{track.title}</b><small>{track.channelTitle}</small></span>
                  <div className="result-actions-v2">
                    <button title="Play now" onClick={() => { void chooseTrack(track); }}><Play size={16} fill="currentColor"/><span>Play</span></button>
                    <button title="Add to queue" onClick={() => { void queueTrack(track); }}><ListPlus size={16}/><span>Queue</span></button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {toast && <div className="toast"><Check size={16}/>{toast}</div>}
    </main>
  );
}

function ParticipantRow({ participant, hostUid, trackId }: { participant: Participant; hostUid: string; trackId?: string }) {
  const ready = Boolean(trackId && participant.readyFor === trackId);
  const drift = participant.driftMs ?? 0;
  const following = participant.followingRoom !== false;
  const stateLabel = !trackId
    ? 'JOINED'
    : !ready
      ? 'LOADING'
      : !following
        ? 'LOCAL'
        : participant.playerState === 3
          ? 'BUFFERING'
          : 'WITH VIBE';
  return (
    <div className="member-row">
      <div className="avatar">{participant.name.charAt(0).toUpperCase()}</div>
      <div className="member-copy"><b>{participant.name}</b><span>{participant.device}{participant.uid === hostUid ? ' · host' : ''}</span></div>
      <div className="member-state">
        <span className={ready && following ? 'ready' : 'waiting'}>{stateLabel}</span>
        {ready && <small>{following ? formatParticipantDrift(drift) : formatGap(drift)}</small>}
      </div>
    </div>
  );
}

function Logo() {
  return <div className="logo"><span className="logo-mark"><i/><i/><i/></span><b>VIBIFY</b></div>;
}

function Ambient() {
  return <div className="ambient" aria-hidden="true"><i/><i/><i/></div>;
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function formatGap(gapMs: number) {
  const seconds = Math.abs(gapMs) / 1000;
  if (seconds < 0.75) return 'less than a second apart';
  const value = seconds < 10 ? `${seconds.toFixed(1)}s` : `${Math.round(seconds)}s`;
  return gapMs < 0 ? `${value} behind` : `${value} ahead`;
}

function formatParticipantDrift(driftMs: number) {
  if (Math.abs(driftMs) < 500) return 'together';
  return formatGap(driftMs);
}

function describeVibeStatus({
  hasTrack,
  following,
  gapMs,
  localPlayerState,
  roomStatus
}: {
  hasTrack: boolean;
  following: boolean;
  gapMs: number;
  localPlayerState: number;
  roomStatus: 'playing' | 'paused';
}) {
  if (!hasTrack) return '—';
  if (!following) return formatGap(gapMs);
  if (localPlayerState === 3) return 'Buffering';
  if (roomStatus === 'paused') return 'Room paused';
  if (Math.abs(gapMs) < 900) return 'Together';
  return 'Catching up';
}
