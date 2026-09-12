'use client';

import { MessageCircle, Send, Smile } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  removeChatMessage,
  removeReaction,
  sendChatMessage,
  sendReaction,
  serverNow
} from '@/lib/room';
import type { ChatMessage, Participant, ReactionEvent } from '@/lib/types';

const REACTIONS = ['🔥', '❤️', '😂', '✨', '🎧', '🫶'];

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
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(serverNow()), 1000);
    return () => window.clearInterval(timer);
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
    const all: ReactionEvent[] = [];
    participants.forEach(participant => {
      Object.values(participant.reactions ?? {}).forEach(reaction => {
        if (reaction.expiresAt > now) all.push(reaction);
      });
    });
    return all.sort((a, b) => a.createdAt - b.createdAt);
  }, [participants, now]);

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
    try {
      await sendReaction(roomCode, uid, name, emoji);
    } catch {
      // Reactions are intentionally lightweight; a failed burst should not
      // interrupt playback or the rest of the room UI.
    }
  };

  return (
    <>
      <section className="glass vibe-chat">
        <header className="vibe-chat-head">
          <div>
            <span className="eyebrow"><MessageCircle size={13}/> VIBE CHAT</span>
            <h3>Room chat</h3>
          </div>
          <span className="chat-ttl">10 MIN</span>
        </header>

        <div className="vibe-messages" ref={listRef}>
          {messages.length === 0 ? (
            <div className="chat-empty">
              <Smile size={20}/>
              <b>Say something</b>
              <span>Messages disappear automatically after 10 minutes.</span>
            </div>
          ) : messages.map(message => (
            <article className={`vibe-message ${message.uid === uid ? 'mine' : ''}`} key={message.id}>
              <div>
                <b>{message.uid === uid ? 'You' : message.name}</b>
                <small>{formatRemaining(message.expiresAt - now)}</small>
              </div>
              <p>{message.text}</p>
            </article>
          ))}
        </div>

        <div className="quick-reactions" aria-label="Quick reactions">
          {REACTIONS.map(emoji => (
            <button key={emoji} onClick={() => { void react(emoji); }} title={`React ${emoji}`}>{emoji}</button>
          ))}
        </div>

        <form className="vibe-chat-form" onSubmit={submitMessage}>
          <input
            value={text}
            onChange={event => setText(event.target.value.slice(0, 180))}
            placeholder="Message the room…"
            aria-label="Room message"
            maxLength={180}
          />
          <button type="submit" disabled={!text.trim() || sending} aria-label="Send message"><Send size={16}/></button>
        </form>
      </section>

      <div className="reaction-layer" aria-hidden="true">
        {reactions.map(reaction => (
          <span
            key={reaction.id}
            className={`reaction-burst lane-${hashLane(reaction.id)}`}
            title={reaction.name}
          >
            {reaction.emoji}
          </span>
        ))}
      </div>
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
