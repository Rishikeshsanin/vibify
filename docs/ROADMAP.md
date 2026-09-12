# Vibify V2 Roadmap

Vibify V1 proved the core idea: a host creates a room, friends join from phones or laptops, and everyone follows one shared playback timeline.

Real-world testing also exposed the limitation we care about most: **some multi-user sessions can still buffer or stutter** because browser media behavior, YouTube buffering, device performance, network conditions, and synchronization corrections are not fully under our control.

V2 starts from those lessons instead of treating them as small bugs.

## V2 goals

The next version should feel:

- more reliable
- more professional
- more intentional
- easier to understand
- more fun with friends
- less like a technical sync experiment

## Playback and reliability

- [ ] Re-evaluate the synchronization strategy
- [ ] Improve buffering-state handling
- [ ] Improve join-in-progress recovery
- [ ] Improve reconnect recovery
- [ ] Reduce audible interruptions during corrections
- [ ] Add useful device-health diagnostics
- [ ] Add practical sync telemetry without over-correcting playback
- [ ] Build a repeatable multi-device test process
- [ ] Test across desktop Chrome/Edge, iPhone Safari/Chrome, and Android Chrome

## Product redesign

- [ ] Redesign the room around a clearer music-first workflow
- [ ] Improve host/guest role clarity
- [ ] Better loading, ready, buffering, reconnect, and error states
- [ ] Cleaner desktop layout
- [ ] Cleaner mobile layout
- [ ] Better onboarding and room sharing
- [ ] Better empty states and recovery flows

## Jam-style collaboration

- [ ] Guest-added queue
- [ ] Host setting for guest song additions
- [ ] Song voting
- [ ] Reorder queue
- [ ] Remove songs from queue
- [ ] Transfer host
- [ ] Host migration after disconnect
- [ ] Room reactions
- [ ] Participant nicknames / avatars
- [ ] QR-code joining

## Music experience

- [ ] Next-track pre-cueing
- [ ] Recently played
- [ ] Search history
- [ ] Better YouTube result ranking
- [ ] Official-audio / music-video ranking preferences
- [ ] Playlist-like room queues
- [ ] Room session summary

## Provider architecture

- [ ] Generic player/provider interface
- [ ] Clean up YouTube provider implementation
- [ ] Evaluate additional providers with compatible terms
- [ ] Provider-specific fallback handling

Every participant should continue to stream from a legitimate playback source. Vibify should synchronize room state, not become an audio re-streaming layer.

## Installable / native direction

- [ ] PWA manifest
- [ ] Installable web app
- [ ] Better Media Session integration
- [ ] Background playback research
- [ ] Native Android proof of concept
- [ ] Native iOS feasibility study

## V2 product principle

Every major decision should pass this test:

> Does this make shared listening smoother, more reliable, more professional, or more fun for a group of friends?

If not, it can wait.

## Current status

`2.0.0-alpha.0` — planning and architecture stage.

The next step is to collect the new V2 ideas before changing the product architecture.
