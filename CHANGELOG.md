# Changelog

All notable Vibify changes will be documented here.

## [2.1.0-alpha.0] - 2026-09-16

### Experimental social update

Development happens only on the `v2.1` branch. Production `main` remains Vibify 2.0.0 and `release/v2.0.0` is the frozen rollback point.

### Added

- **Vibe Picks** — guests can pitch songs without directly changing the host queue
- Live one-person / one-vote room voting
- Duplicate song pitches merge into the same voting target
- Host actions to add a winning pick to the queue, play it immediately, or pass it
- Vote-driven `ROOM WANTS THIS` treatment for strong room consensus
- **Experimental Vibe Mode** — a per-device ambient theme based on the current track thumbnail
- Vibe Mode never samples changing YouTube video frames
- Vibe Mode preference persists per device and respects reduced-motion preferences

### Architecture

- Guest picks and votes live inside each participant's existing writable Firebase subtree
- Existing room-level host authority stays unchanged
- No Firebase security-rule expansion is required for guest voting
- Vibe Mode is isolated in dedicated 2.1 components/styles so it can be removed while retaining Vibe Picks

### Test status

- Next.js production build passes
- TypeScript validation passes
- Vercel preview deployment is READY
- No preview `error` / `fatal` runtime logs observed after deployment
- Multi-device behavioral regression testing is still required before any production promotion

---

## [2.0.0] - 2026-09-12

### Stable V2 release

Vibify V2 became the production shared-listening experience.

### Added / improved

- More stable shared playback architecture
- Host-authoritative room controls with personal guest YouTube controls
- `Catch up to the vibe` local-listening recovery
- Queue management and automatic next-track playback
- Synced lyrics with shared host calibration
- Improved lyrics matching and plain-lyrics fallback
- Ephemeral 10-minute Vibe Chat
- Animated quick emoji reactions
- Per-device `Calm the vibe` reaction-animation preference
- Room health / local listening status UX
- Reduced telemetry and more conservative drift correction
- One-time audio unlock behavior per room/device where browser policy allows it

The final V2 production snapshot is preserved in `release/v2.0.0`.

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
