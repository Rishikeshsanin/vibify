'use client';

import {
  get,
  onDisconnect,
  onValue,
  ref,
  remove,
  set,
  update
} from 'firebase/database';
import { db, ensureAnonymousUser } from './firebase';
import type { Participant, PlaybackState, Room, Track } from './types';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function createRoomCode(length = 6) {
  return Array.from({ length }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
}

export function getDeviceLabel() {
  if (typeof navigator === 'undefined') return 'Unknown device';
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows/i.test(ua)) return 'Windows laptop';
  if (/Macintosh/i.test(ua)) return 'Mac';
  return 'Web device';
}

let serverTimeOffset = 0;
let offsetBound = false;

export function bindServerClock() {
  if (!db || offsetBound) return () => {};
  offsetBound = true;
  const offsetRef = ref(db, '.info/serverTimeOffset');
  return onValue(offsetRef, snap => {
    serverTimeOffset = Number(snap.val() ?? 0);
  });
}

export function serverNow() {
  return Date.now() + serverTimeOffset;
}

export async function createRoom(hostName: string) {
  if (!db) throw new Error('Firebase is not configured.');
  const user = await ensureAnonymousUser();
  let code = createRoomCode();
  for (let i = 0; i < 6; i += 1) {
    const existing = await get(ref(db, `rooms/${code}`));
    if (!existing.exists()) break;
    code = createRoomCode();
  }

  const now = serverNow();
  const playback: PlaybackState = { status: 'paused', position: 0, executeAt: now, version: 0 };
  const participant: Participant = {
    uid: user.uid,
    name: hostName,
    role: 'host',
    device: getDeviceLabel(),
    online: true,
    joinedAt: now
  };

  await set(ref(db, `rooms/${code}`), {
    code,
    hostUid: user.uid,
    hostName,
    createdAt: now,
    playback,
    participants: { [user.uid]: participant }
  } satisfies Room);

  await onDisconnect(ref(db, `rooms/${code}/participants/${user.uid}/online`)).set(false);
  return { code, uid: user.uid };
}

export async function joinRoom(code: string, guestName: string) {
  if (!db) throw new Error('Firebase is not configured.');
  const user = await ensureAnonymousUser();
  const roomRef = ref(db, `rooms/${code}`);
  const snap = await get(roomRef);
  if (!snap.exists()) throw new Error('Room not found. Check the code and try again.');
  const room = snap.val() as Room;
  const participant: Participant = {
    uid: user.uid,
    name: guestName,
    role: room.hostUid === user.uid ? 'host' : 'guest',
    device: getDeviceLabel(),
    online: true,
    joinedAt: serverNow()
  };
  await set(ref(db, `rooms/${code}/participants/${user.uid}`), participant);
  await onDisconnect(ref(db, `rooms/${code}/participants/${user.uid}/online`)).set(false);
  return { code, uid: user.uid, hostUid: room.hostUid };
}

export function subscribeRoom(code: string, callback: (room: Room | null) => void) {
  if (!db) return () => {};
  return onValue(ref(db, `rooms/${code}`), snap => callback(snap.exists() ? (snap.val() as Room) : null));
}

export async function leaveRoom(code: string, uid: string) {
  if (!db) return;
  await remove(ref(db, `rooms/${code}/participants/${uid}`));
}

export async function setTrack(code: string, track: Track, version: number) {
  if (!db) throw new Error('Firebase is not configured.');
  const now = serverNow();
  await update(ref(db, `rooms/${code}`), {
    track,
    playback: { status: 'paused', position: 0, executeAt: now + 500, version: version + 1 }
  });
}

export async function writePlayback(code: string, playback: PlaybackState) {
  if (!db) throw new Error('Firebase is not configured.');
  await set(ref(db, `rooms/${code}/playback`), playback);
}

export async function updateParticipant(code: string, uid: string, patch: Partial<Participant>) {
  if (!db) return;
  await update(ref(db, `rooms/${code}/participants/${uid}`), patch);
}
