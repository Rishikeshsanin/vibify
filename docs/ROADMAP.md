# Vibify Roadmap

Vibify is currently focused on proving one thing extremely well: **shared listening that stays together across phones and laptops.**

This roadmap keeps future work ordered around that goal instead of turning the project into a generic music clone.

## Phase 1 — Core shared listening ✅

- [x] Create room
- [x] Join with 6-character code
- [x] Anonymous participants
- [x] Host authority
- [x] Responsive desktop + mobile UI
- [x] YouTube search
- [x] YouTube IFrame playback
- [x] Play / pause
- [x] Seek
- [x] ±10 second controls
- [x] Presence
- [x] Ready state
- [x] Live drift reporting
- [x] Automatic hard correction for meaningful drift
- [x] Shareable room links
- [x] Production deployment

## Phase 2 — Sync quality

- [ ] Better buffering-state recovery
- [ ] Adaptive correction thresholds
- [ ] Join-in-progress recovery polish
- [ ] Network reconnect recovery
- [ ] Device sync score
- [ ] Per-device health diagnostics
- [ ] More detailed sync telemetry for debugging
- [ ] Multi-device automated test harness

## Phase 3 — Jam-style collaboration

- [ ] Guest-added queue
- [ ] Host setting: allow / disallow guest additions
- [ ] Song voting
- [ ] Remove / reorder queue
- [ ] Transfer host
- [ ] Host migration after disconnect
- [ ] Room reactions
- [ ] Participant nicknames / avatars
- [ ] QR-code joining

## Phase 4 — Music experience

- [ ] Next-track pre-cueing
- [ ] Recently played
- [ ] Search history
- [ ] Better YouTube result ranking
- [ ] Official-audio / music-video ranking preferences
- [ ] Playlist-like room queues
- [ ] Room session summary

## Phase 5 — Provider architecture

- [ ] Generic player/provider interface
- [ ] YouTube provider cleanup
- [ ] Evaluate additional providers with compatible terms
- [ ] Provider-specific fallback handling

The provider layer should never compromise the core rule: every participant streams their own legitimate playback source while Vibify synchronizes room state.

## Phase 6 — Installable / native experience

- [ ] PWA manifest
- [ ] Installable web app
- [ ] Better mobile media-session integration
- [ ] Background playback research
- [ ] Native Android proof of concept
- [ ] Native iOS feasibility study

## Non-goals for now

These are intentionally not priorities:

- re-streaming copyrighted audio from the host
- extracting YouTube audio into custom MP3 streams
- building a full social network
- heavy user-profile/account systems
- sample-accurate Bluetooth speaker-array synchronization

Vibify is a **shared listening room**, not an audio piracy layer or distributed PA system.

## Product principle

Every roadmap decision should pass this test:

> Does this make it easier, smoother, or more fun for a group of people to hear the same song together?

If not, it can wait.
