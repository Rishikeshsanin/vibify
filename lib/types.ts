export type Track = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  duration?: string;
};

export type PlaybackState = {
  status: 'playing' | 'paused';
  position: number;
  executeAt: number;
  version: number;
};

export type Participant = {
  uid: string;
  name: string;
  role: 'host' | 'guest';
  device: string;
  online: boolean;
  readyFor?: string;
  playerState?: number;
  driftMs?: number;
  joinedAt?: number;
};

export type QueueItem = {
  id: string;
  track: Track;
  addedBy: string;
  addedByName: string;
  addedAt: number;
  order: number;
};

export type Room = {
  code: string;
  hostUid: string;
  hostName: string;
  createdAt: number;
  track?: Track;
  playback: PlaybackState;
  participants?: Record<string, Participant>;
  queue?: Record<string, QueueItem>;
};
