# Security Policy

Thanks for helping keep **luke.sarfas.com** and its visitors safe. This document
explains what is supported, how to report a vulnerability, and what to expect.

## Supported versions

Only the **current production deployment** of luke.sarfas.com is supported.
The site is continuously deployed from `main` to Firebase Hosting, so there is a
single live version at any time. Previous commits, branches, preview channels,
and local builds are **not** covered.

| Version                          | Supported          |
| -------------------------------- | ------------------ |
| Current production (live on main) | :white_check_mark: |
| Anything else (old commits, branches, previews, forks) | :x: |

## Reporting a vulnerability

Please report security issues **privately** — do not open a public issue, PR, or
discussion for a suspected vulnerability.

Use either channel:

- **GitHub private vulnerability reporting** (preferred): open a report via the
  repository's **Security → Report a vulnerability** tab (GitHub private
  vulnerability reporting / security advisories).
- **Email:** lukesarfas@icloud.com

Please include, where possible:

- A clear description of the issue and its impact.
- Steps to reproduce (proof-of-concept, affected URL(s), request/response
  details).
- Any relevant logs, screenshots, or payloads.

## Response targets

This is a personal project maintained by a single person, so timelines are
best-effort but I aim for:

- **Acknowledgement:** within **5 business days** of your report.
- **Triage / initial assessment:** within **10 business days**.

I will keep you updated on progress and let you know when a fix is deployed.
Because the site is continuously deployed, fixes typically ship as soon as they
are merged to `main`.

## Scope

**In scope**

- `luke.sarfas.com` (the production hub and its pages).
- The embeddable maze applet at `/sites/maze/applet/` (and the maze showcase at
  `/sites/maze/`).
- Issues in this repository's deployed static output that affect the live site
  (e.g. XSS, CSP/header bypass, applet sandbox escape, content injection,
  exposure of sensitive data).

**Out of scope**

- Third-party platforms and services this site relies on (e.g. Firebase
  Hosting, Google Cloud, GitHub, DNS/registrar, the CDN). Report those to the
  respective vendor.
- Volumetric / denial-of-service attacks (DoS/DDoS), traffic flooding, and
  resource-exhaustion testing.
- Social engineering, phishing, or physical attacks against the maintainer or
  any third party.
- Reports from automated scanners with no demonstrated, exploitable impact;
  missing "best-practice" headers with no concrete security consequence; and
  vulnerabilities requiring an already-compromised device or unrealistic
  preconditions.

## Safe harbor

If you make a good-faith effort to comply with this policy while researching and
reporting a vulnerability, I will consider your research **authorized**, will not
pursue or support legal action against you for it, and will work with you to
understand and resolve the issue. To stay within safe harbor, please:

- Only interact with accounts/data you own or have explicit permission to test.
- Avoid privacy violations, data destruction, and degradation of service (no
  DoS, no spam, no automated high-volume scanning).
- Give me a reasonable opportunity to remediate before any public disclosure.

If in doubt about whether an action is acceptable, contact
lukesarfas@icloud.com first and ask.
