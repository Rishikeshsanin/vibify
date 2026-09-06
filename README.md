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

## Production configuration

The Firebase web configuration for the dedicated `vibify-2d7cf` project is public and included as safe defaults in `lib/firebase.ts`. Environment variables can override it if Vibify is moved to another Firebase project later.

The only required secret is:

```bash
YOUTUBE_DATA_API_KEY=
```

Store that value in Vercel environment variables. Do not commit it to GitHub.

## Firebase setup

- Anonymous Authentication must be enabled.
- Realtime Database is hosted in `asia-southeast1` (Singapore).
- Publish the rules in `firebase.database.rules.json` before production use.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.
