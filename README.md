# luke.sarfas.com

Personal hub site. Aggregates manifests from my projects and renders them as
cards + detail pages. Static, built with [Astro](https://astro.build), hosted
on Firebase Hosting under the `luke-sarfas-personal` GCP project.

## Local development

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs to ./dist
npm run preview
```

Node 20+ recommended (see `.nvmrc`).

## Adding a project

1. Make sure the project serves a `manifest.json` — see [`MANIFEST.md`](./MANIFEST.md).
2. Add an entry to [`src/data/projects.json`](./src/data/projects.json).
3. (Optional) Drop the example workflow from
   `.github/workflows/rebuild-trigger-example.yml` into the sub-project so it
   pings this repo to rebuild on manifest changes.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds and
deploys to Firebase Hosting. It also fires on `repository_dispatch` with
`event_type: project-updated` so sub-projects can trigger a rebuild.

### One-time setup (after `gcloud auth login`)

```sh
# Create the GCP project
gcloud projects create luke-sarfas-personal --name="Personal"

# Link a billing account (required for Firebase Hosting custom domain on Spark/Blaze)
gcloud billing projects link luke-sarfas-personal --billing-account=<BILLING_ID>

# Wire Firebase
firebase projects:addfirebase luke-sarfas-personal
firebase use luke-sarfas-personal

# First manual deploy to confirm
npm ci && npm run build
firebase deploy --only hosting

# Create a deploy service account for CI
gcloud iam service-accounts create gh-deploy \
  --project=luke-sarfas-personal --display-name="GitHub deploy"

gcloud projects add-iam-policy-binding luke-sarfas-personal \
  --member="serviceAccount:gh-deploy@luke-sarfas-personal.iam.gserviceaccount.com" \
  --role="roles/firebasehosting.admin"

gcloud projects add-iam-policy-binding luke-sarfas-personal \
  --member="serviceAccount:gh-deploy@luke-sarfas-personal.iam.gserviceaccount.com" \
  --role="roles/serviceusage.serviceUsageConsumer"

# Key + GitHub secret
gcloud iam service-accounts keys create key.json \
  --iam-account=gh-deploy@luke-sarfas-personal.iam.gserviceaccount.com
gh secret set FIREBASE_SERVICE_ACCOUNT < key.json
rm key.json

# Custom domain: add luke.sarfas.com in the Firebase console -> Hosting,
# then update DNS records as instructed.
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
