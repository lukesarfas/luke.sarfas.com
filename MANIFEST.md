# Project manifest contract

Each personal project that wants to appear on luke.sarfas.com serves a
`manifest.json` at a stable public URL. The website fetches all manifests at
build time and renders cards + detail pages from them.

## Where to put the file

Pick whichever fits the project:

- Static site: `public/manifest.json` (served at `/manifest.json`)
- Cloud Run / API: a `GET /manifest.json` route
- No site yet: a raw GitHub URL on the `main` branch is fine

## Shape

```json
{
  "name": "Colony",
  "slug": "colony",
  "tagline": "Procedurally generated settlement sim.",
  "description": "Longer prose; supports a paragraph or two.",
  "status": "active",
  "version": "0.3.1",
  "updated": "2026-05-18",
  "links": {
    "site": "https://colony.example.com",
    "repo": "https://github.com/lukesarfas/colony",
    "demo": "https://demo.colony.example.com",
    "docs": "https://docs.colony.example.com"
  },
  "screenshot": "https://colony.example.com/og.png",
  "tags": ["rust", "gamedev", "procgen"]
}
```

| Field | Required | Notes |
|---|---|---|
| `name` | yes | Display name |
| `slug` | yes | URL-safe; must match the registry entry |
| `tagline` | no | One-liner shown on cards |
| `description` | no | Prose for the detail page |
| `status` | no | `active` \| `wip` \| `archived` |
| `version` | no | Semver string |
| `updated` | no | ISO date — sorts the projects index |
| `links.*` | no | Each is rendered as a button if present |
| `screenshot` | no | Absolute URL to a 1200×630 image |
| `tags` | no | Up to 4 are shown on the card |

## Registering a project on the website

Add an entry to `src/data/projects.json`:

```json
[
  {
    "slug": "colony",
    "manifestUrl": "https://colony.example.com/manifest.json",
    "fallback": {
      "name": "Colony",
      "tagline": "Procedurally generated settlement sim."
    }
  }
]
```

`fallback` is used when the manifest fetch fails so the project still renders
during outages.

## Triggering a rebuild

When a project updates its manifest, it can ping the website to rebuild:

```
POST https://api.github.com/repos/lukesarfas/luke.sarfas.com/dispatches
{ "event_type": "project-updated", "client_payload": { "project": "..." } }
```

See `.github/workflows/rebuild-trigger-example.yml` for a drop-in workflow.
