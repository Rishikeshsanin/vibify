# Vibify Roadmap

Vibify V1 is now complete as the **first public proof-of-concept release**. It proved the room model, host authority, YouTube playback, Firebase realtime state, cross-device controls, and the core shared-listening concept.

Real-world multi-user testing also showed that the V1 playback path can still buffer or stutter. Instead of endlessly patching the same model, active product work now moves to **Vibify V2**.

- V1 production line: `main`
- Frozen V1 snapshot: `release/v1.0.0`
- Active next-generation branch: `v2`

## V1 — Core shared listening ✅

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
- [x] Automatic correction for meaningful drift
- [x] Shareable room links
- [x] Production deployment
- [x] GitHub Actions CI
- [x] Public v1.0.0 release documentation

## V1 known limitation

The current browser + YouTube IFrame synchronization model can still experience stuttering or buffering during real group sessions. This can vary with network conditions, device performance, browser media behavior, and YouTube buffering.

That limitation is one of the main reasons V2 is being treated as a proper new iteration rather than a small patch release.

## V2 — Product and playback redesign

V2 starts from the working V1 concept but is intentionally open for larger architectural and product changes.

### Playback and reliability

- [ ] Re-evaluate the synchronization strategy
- [ ] Improve buffering-state handling
- [ ] Improve join-in-progress recovery
- [ ] Improve network reconnect recovery
- [ ] Add stronger device health diagnostics
- [ ] Add useful sync telemetry without over-correcting playback
- [ ] Build a repeatable multi-device test process
- [ ] Reduce visible/audible interruptions during correction

### Professional product experience

- [ ] Redesign the room experience around a clearer music-first workflow
- [ ] Improve host/guest role clarity
- [ ] Better loading, ready, buffering, and reconnect states
- [ ] Cleaner desktop and mobile layouts
- [ ] More polished room sharing and onboarding
- [ ] Better empty/error states

### Jam-style collaboration

- [ ] Guest-added queue
- [ ] Host setting: allow / disallow guest additions
- [ ] Song voting
- [ ] Remove / reorder queue
- [ ] Transfer host
- [ ] Host migration after disconnect
- [ ] Room reactions
- [ ] Participant nicknames / avatars
- [ ] QR-code joining

### Music experience

- [ ] Next-track pre-cueing
- [ ] Recently played
- [ ] Search history
- [ ] Better YouTube result ranking
- [ ] Official-audio / music-video ranking preferences
- [ ] Playlist-like room queues
- [ ] Room session summary

### Provider architecture

- [ ] Generic player/provider interface
- [ ] YouTube provider cleanup
- [ ] Evaluate additional providers with compatible terms
- [ ] Provider-specific fallback handling

The provider layer should never compromise the core rule: every participant streams their own legitimate playback source while Vibify synchronizes room state.

### Installable / native experience

- [ ] PWA manifest
- [ ] Installable web app
- [ ] Better mobile media-session integration
- [ ] Background playback research
- [ ] Native Android proof of concept
- [ ] Native iOS feasibility study

## Non-goals

These are intentionally not priorities:

- re-streaming copyrighted audio from the host
- extracting YouTube audio into custom MP3 streams
- building a full social network
- heavy user-profile/account systems
- sample-accurate Bluetooth speaker-array synchronization

Vibify is a **shared listening room**, not an audio piracy layer or distributed PA system.

## Product principle

Every V2 decision should pass this test:

> Does this make it easier, smoother, more reliable, or more fun for a group of people to hear the same song together?

If not, it can wait.
