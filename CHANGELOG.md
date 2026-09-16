# Changelog

All notable Vibify changes will be documented here.

## [2.1.0] - 2026-09-16

### Vibe Picks

This release keeps the Vibify 2.0 playback, lyrics, queue, chat, reactions, host controls, local guest controls, and Catch up to the vibe behavior unchanged, and adds one social feature: guest song suggestions with room voting and host approval.

### Added

- Guests can search for a song and suggest it to the room
- Shared Vibe Picks board visible to the room
- One vote per guest per suggested track, with vote toggling
- Duplicate suggestions merge into one voting card
- Live vote counts and voter names
- Host-only Add to Queue, Play Now, and Pass actions
- Strongly supported picks receive a ROOM WANTS THIS indicator
- Voting data stays inside participant-owned Firebase paths, preserving the existing room permission model

### Scope

- No Vibe Mode or artwork-based ambience is included in this release
- No existing playback/synchronization behavior was redesigned for 2.1.0

---

## [1.0.0] - 2026-09-12

### First public release

Vibify V1 is the first complete proof-of-concept release of the shared-listening idea: one host creates a room, friends join from phones or laptops, and everyone follows the same YouTube playback timeline.

### Added

- Responsive shared-listening web app
- 6-character listening-room codes
- Firebase Anonymous Authentication
- Firebase Realtime Database room state
- Host-only playback authority
- YouTube Data API v3 song search
- Official YouTube IFrame Player integration
- Cross-device play / pause / seek
- ±10 second controls
- Participant presence and ready state
- Firebase server-clock based scheduled playback
- Live drift reporting
- Conservative automatic drift correction
- Mobile audio-unlock flow
- Shareable room links
- Vercel production deployment
- GitHub Actions production-build CI
- Architecture, roadmap, contribution, security, and issue-template documentation

### Architecture changes from the original prototype

- Replaced direct audio-file/WebRTC transfer with direct YouTube playback on every device
- Stabilized the YouTube player lifecycle to avoid unnecessary reinitialization during React renders
- Reduced aggressive playback correction to avoid constant seek-induced audio break-up

### Known limitation

V1 can still experience buffering or stuttering in real multi-user sessions depending on device/browser/network behavior. It is preserved as the first working release and proof of the room + synchronized-playback concept rather than the final synchronization architecture.

Further product and playback-engine work continues in the `v2` branch.

### Infrastructure

- Dedicated Firebase project
- Singapore Realtime Database region (`asia-southeast1`)
- GitHub-connected Vercel production deployment
- Server-side YouTube API key handling

---

## [0.1.0] - 2026-09-06

### Prototype milestone

- Initial responsive room experience
- First Firebase + YouTube synchronization implementation
- Transition away from the earlier MP3/WebRTC experiment
