# The Applet contract — v1

An **applet** is a small, self-contained web property that ships its own metadata
and (optionally) an embeddable demo. The hub at `luke.sarfas.com` consumes any
applet that follows this contract, with no per-project code in the hub. Add a
new project to the site by publishing an applet — never by editing the hub.

## Two delivery channels

There are two ways to publish an applet. The hub treats them identically:

| Channel | Lives in | Use when |
|---|---|---|
| **Sibling app** | `apps/<slug>/` in this monorepo | The project's marketing site lives here (e.g. `lickme`, `thinkwell`) |
| **Remote applet** | A public URL — typically `gs://luke-sarfas-applets/<slug>/` | The project's marketing site lives in another repo |

The hub registry (`apps/luke.sarfas.com/src/data/projects.json`) is a list of
`{slug, manifestPath?, manifestUrl?, manifest?}` entries. At build time the hub
resolves each entry to a `ProjectManifest`, sorts by `updated`, and renders it.

## Required surface

Every applet — sibling or remote — must serve these two files at the root of
its delivery channel:

```
manifest.json    # required — metadata
preview.png      # required — 16:9 hero (≥1600×900 recommended)
```

A sibling app serves them from `apps/<slug>/public/`. A remote applet serves
them from `gs://luke-sarfas-applets/<slug>/manifest.json` etc.

## Optional surface

```
applet/index.html   # the live, embeddable demo — iframed by the hub
description.md      # long-form prose for the detail page (future)
screenshots/*.png   # gallery (future)
changelog.md        # what's new (future)
```

When `applet/index.html` exists, the hub renders an iframe of it on the
project's detail page. The iframe is sandboxed by the hub; an applet should
expect to be embedded without privileged access.

## manifest.json schema

```jsonc
{
  "name":     "LickMe",                                    // required
  "slug":     "lickme",                                    // required, kebab-case
  "tagline":  "One-liner shown on the card.",              // optional
  "description": "Longer prose for the detail page.",      // optional
  "status":   "active" | "wip" | "archived",               // optional
  "version":  "0.3.1",                                     // optional, semver
  "updated":  "2026-05-19",                                // optional, ISO date — drives sort order
  "links": {                                               // optional, any subset
    "site": "https://lickme.app",
    "demo": "https://demo.lickme.app",
    "repo": "https://github.com/lukesarfas/lickme",
    "docs": "https://docs.lickme.app"
  },
  "accent":   "#ff6f4a",                                   // optional, hex — used by hub for theming hooks
  "tags":     ["nextjs", "music", "video"],                // optional, ≤4 shown on cards
  "preview":  "/previews/lickme.png",                      // optional override; defaults to the synced asset
  "applet":   true | "/sites/lickme/" | false              // optional override; defaults to true if sibling app has applet/
}
```

Hub-side defaults for sibling apps:
- `preview` → `/previews/<slug>.png` (from `apps/<slug>/public/preview.png`)
- `applet` → `/sites/<slug>/` (the full sibling site is the applet)

## Publishing a sibling app

1. Scaffold `apps/<slug>/` (Astro recommended; any framework that builds to
   static files works).
2. Add `"@sarfas/ui": "*"` to its `dependencies` and import the tokens at the
   top of its global stylesheet:

   ```css
   @import "@sarfas/ui/fonts.css";
   @import "@sarfas/ui/tokens.css";
   ```
3. Put `manifest.json` and `preview.png` in its `public/` directory.
4. Register it in `apps/luke.sarfas.com/src/data/projects.json`:

   ```json
   { "slug": "<slug>", "manifestPath": "<slug>" }
   ```

   (No further hub-side code.)
5. `npm run build` from the monorepo root. The pipeline is:

   ```
   build sister sites → make-previews → sync-sites → build hub
   ```

## Publishing a remote applet

Use this when the project's marketing site lives in another repo (or has no
marketing site — just the raw applet bundle).

1. Upload `manifest.json`, `preview.png`, and optionally `applet/index.html`
   (+ assets) to `gs://luke-sarfas-applets/<slug>/`. Files must be
   publicly readable.
2. Register it in the hub:

   ```json
   {
     "slug": "<slug>",
     "manifestUrl": "https://storage.googleapis.com/luke-sarfas-applets/<slug>/manifest.json"
   }
   ```
3. Bump `updated` in the manifest and re-upload to push a change.

A reusable GitHub Actions workflow that uploads from a `site/` directory in
any source repo lives at
[`.github/workflows/publish-applet.example.yml`](.github/workflows/publish-applet.example.yml).

## Iframe-embedded applets: contract

An `applet/index.html` is iframed by the hub. The applet:
- **Must** be a single, self-contained static page (plus same-origin assets).
- **Should** be ≤ 200 KB transferred for first paint; do not load auth-walled
  resources.
- **Should** render usable content within the first 16/10-aspect viewport
  without scroll — the hub fixes the iframe height.
- **Should not** assume top-level navigation; treat itself as embedded.
- **May** call `parent.postMessage({type:"applet:ready"}, "*")` once it has
  finished its initial render. (Reserved for future "loading" UI; ignored today.)

## Slug rules

- Kebab-case, ASCII letters and digits only, `[a-z0-9-]+`.
- Matches the sibling app directory name and/or the GCS path.
- Unique across the registry.

## Versioning

This document is **Applet contract v1**. Breaking changes will bump the
version and ship a `/applet-contract/v2.md`. The hub will continue reading v1
manifests indefinitely.
