# Contributing to Vibify

Thanks for wanting to improve Vibify.

The project is still early, so the best contributions are focused, testable improvements to synchronization, reliability, mobile behavior, or the shared-listening experience.

## Before you start

Please read:

- [`README.md`](README.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)

## Local setup

```bash
git clone https://github.com/Rishikeshsanin/vibify.git
cd vibify
npm install
cp .env.example .env.local
npm run dev
```

Add a valid `YOUTUBE_DATA_API_KEY` to `.env.local` if you are working on search.

## Good contribution areas

- playback synchronization
- buffering/reconnect recovery
- mobile Safari / Chrome reliability
- accessibility
- responsive UI improvements
- YouTube result ranking
- room presence correctness
- tests and diagnostics
- documentation

## Pull request checklist

Before opening a PR:

- keep the change focused
- do not commit API keys or credentials
- run `npm run build`
- verify desktop and mobile layouts where relevant
- explain any synchronization behavior changes clearly
- include reproduction steps for bug fixes
- avoid unrelated formatting churn

## Sync-engine changes

Synchronization code is sensitive. If changing `YouTubePlayer.tsx`, `room.ts`, or playback timing behavior, include:

1. the problem being fixed
2. the old behavior
3. the new timing/correction logic
4. how you tested it
5. any trade-offs introduced

Avoid aggressive repeated seeks. They can create a worse listening experience than small natural drift.

## Commit style

Short conventional-style messages are preferred:

```text
feat: add guest queue voting
fix: prevent player reset on room updates
docs: explain server clock sync
chore: update dependencies
```

## Issues

Use the repository issue templates for bugs and feature requests. For security problems, follow [`SECURITY.md`](SECURITY.md) instead of filing a public issue.

## Code of conduct

By participating, you agree to follow [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
