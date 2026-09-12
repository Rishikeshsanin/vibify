# Vibify v1.0.0 — First Release

Released: **2026-09-12**

Vibify V1 is the first complete public proof-of-concept of the shared-listening idea.

## What V1 proves

- A host can create a room and share a short room code.
- Guests can join from phones and laptops.
- The host can search YouTube and choose a track.
- Every client loads the same YouTube video locally.
- Host play, pause, seek, and skip controls propagate through Firebase Realtime Database.
- Participants expose ready/presence state and playback drift telemetry.
- The product can run as a responsive web app without transferring the actual song between users.

## Architecture lesson

The most important V1 decision was to stop transferring audio files between devices.

Instead:

```text
YouTube CDN ──► each device

Vibify/Firebase ──► track ID + playback state + timestamps
```

This made the system lighter, simpler, and much closer to a real shared-listening product.

## Known limitation

Real-world testing with multiple people showed that playback can still **buffer or stutter** on some sessions. The behavior depends on factors Vibify does not fully control, including:

- YouTube IFrame buffering
- browser autoplay/media behavior
- device performance
- network quality
- different browser scheduling behavior
- resynchronization timing

Because of that, V1 should be viewed as the first working release and architecture proof — not the final playback engine.

## Why V1 is being frozen

Rather than repeatedly patching the same synchronization model, the project is moving to a dedicated V2 iteration where the UX, room model, and playback strategy can be reconsidered together.

The V1 code remains preserved in:

- `main` — current public V1 production line
- `release/v1.0.0` — frozen V1 snapshot

Active next-generation work lives in:

- `v2`

## V1 stack

- Next.js 15
- React 19
- TypeScript
- Firebase Anonymous Authentication
- Firebase Realtime Database
- YouTube Data API v3
- YouTube IFrame Player API
- Vercel

## Status

**V1.0.0: released and frozen for major feature work.**

The next major iteration will be designed as Vibify V2.
