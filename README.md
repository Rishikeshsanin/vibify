# Vibify

Vibify is a synchronized listening-room web app. A host creates a room, guests join with a code, and every device plays the same YouTube track while the host controls playback.

## Architecture

- Next.js + TypeScript frontend
- YouTube IFrame Player API for playback on every device
- YouTube Data API v3 for song search
- Firebase Anonymous Auth + Realtime Database for rooms, presence, and playback state
- Vercel for deployment

## Core sync principle

Vibify never streams audio from the host. Every client loads the same YouTube video directly, while the room shares only tiny playback-state messages (`track`, `playing`, `position`, `executeAt`, `version`). Clients periodically compare the local YouTube player position with the authoritative room timeline and resync only when drift exceeds the configured threshold.

## Required environment variables

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
YOUTUBE_DATA_API_KEY=
```

## Firebase setup

Enable Anonymous Authentication and create a Realtime Database. Apply the rules in `firebase.database.rules.json` before production use.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.
