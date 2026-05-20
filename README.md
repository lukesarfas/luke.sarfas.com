# sarfas-sites

Monorepo for my personal sites — the hub at [luke.sarfas.com](https://luke.sarfas.com)
and per-product marketing sites. All sites are static Astro builds; they share
design tokens and a small set of components from `@sarfas/ui`.

## Layout

```
sarfas-sites/
├── apps/
│   ├── luke.sarfas.com/   # personal hub, aggregates project manifests
│   └── lickme.app/        # marketing site for LickMe (in progress)
├── packages/
│   └── ui/                # @sarfas/ui — shared tokens + base components
├── firebase.json          # currently points at apps/luke.sarfas.com/dist
└── package.json           # npm workspaces root
```

## Local development

```sh
npm install                # installs all workspaces

npm run dev:hub            # http://localhost:4321 — luke.sarfas.com
npm run dev:lickme         # http://localhost:4322 — lickme.app

npm run build              # builds every site
npm run build:hub          # just the hub
npm run build:lickme       # just LickMe
```

Node 20+ (see `.nvmrc`).

## Adding a new site

1. Scaffold under `apps/<name>/` with Astro.
2. Add `"@sarfas/ui": "*"` to its dependencies; import tokens via
   `@sarfas/ui/tokens.css` at the top of your global stylesheet.
3. Serve a `/manifest.json` per [`MANIFEST.md`](./MANIFEST.md).
4. Register it in [`apps/luke.sarfas.com/src/data/projects.json`](./apps/luke.sarfas.com/src/data/projects.json).

## Deploy

CI on `main` runs `.github/workflows/deploy.yml`, which builds the hub and
deploys it to Firebase Hosting (`luke-sarfas-personal` GCP project). Other
sites currently build locally only — multi-site Firebase Hosting will be wired
up when the first non-hub site is ready to ship.

### One-time hub setup (after `gcloud auth login`)

```sh
gcloud projects create luke-sarfas-personal --name="Personal"
gcloud billing projects link luke-sarfas-personal --billing-account=<BILLING_ID>

firebase projects:addfirebase luke-sarfas-personal
firebase use luke-sarfas-personal

npm ci && npm run build:hub
firebase deploy --only hosting

# Service account for CI
gcloud iam service-accounts create gh-deploy \
  --project=luke-sarfas-personal --display-name="GitHub deploy"

gcloud projects add-iam-policy-binding luke-sarfas-personal \
  --member="serviceAccount:gh-deploy@luke-sarfas-personal.iam.gserviceaccount.com" \
  --role="roles/firebasehosting.admin"

gcloud projects add-iam-policy-binding luke-sarfas-personal \
  --member="serviceAccount:gh-deploy@luke-sarfas-personal.iam.gserviceaccount.com" \
  --role="roles/serviceusage.serviceUsageConsumer"

gcloud iam service-accounts keys create key.json \
  --iam-account=gh-deploy@luke-sarfas-personal.iam.gserviceaccount.com
gh secret set FIREBASE_SERVICE_ACCOUNT < key.json
rm key.json
```

## Architecture

```
┌──────────────────┐    build-time fetch    ┌─────────────────────────┐
│  luke.sarfas.com │ ─────────────────────▶ │ project /manifest.json  │
│  (Astro + GH CI) │ ◀──── dispatch ─────── │  (each sub-project)     │
└────────┬─────────┘                        └─────────────────────────┘
         │ firebase deploy
         ▼
   Firebase Hosting (CDN, in `luke-sarfas-personal` GCP project)
```
