# Changelog

All notable Vibify changes will be documented here.

## [0.1.0] - 2026-09-06

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

### Changed

- Replaced the original audio-file/WebRTC prototype with direct YouTube playback on every device
- Stabilized the YouTube player lifecycle to avoid reinitialization during ordinary React renders
- Reduced aggressive playback correction to prevent audio break-up

### Infrastructure

- Dedicated Firebase project
- Singapore Realtime Database region (`asia-southeast1`)
- GitHub-connected Vercel production deployment
- Server-side YouTube API key handling
