# Security Policy

## Supported version

Vibify is currently an early-stage project. Security fixes are applied to the latest code on `main`.

## Reporting a vulnerability

Please **do not open a public issue** for vulnerabilities involving:

- Firebase authorization bypass
- host impersonation
- unauthorized room-state mutation
- leaked API credentials
- cross-site scripting
- participant data exposure
- server-side request abuse

Use GitHub's private vulnerability reporting / Security Advisory flow for this repository when available.

When reporting, include:

- affected route or file
- reproduction steps
- expected vs actual behavior
- impact
- browser/device details if relevant
- suggested mitigation, if you have one

## Secrets

Never commit:

```text
YOUTUBE_DATA_API_KEY
.env.local
Vercel tokens
Google Cloud credentials
Firebase Admin credentials
```

Firebase's **web configuration is public by design** and is not treated as a secret. Access control is enforced through Authentication and Realtime Database Security Rules.

## Scope note

Vibify embeds and controls the official YouTube IFrame Player. Issues in YouTube itself, Firebase itself, Vercel, or a browser should generally be reported to the relevant vendor unless Vibify's integration creates an additional vulnerability.
