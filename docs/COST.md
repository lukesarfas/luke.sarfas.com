# Cost model & spend protections — luke.sarfas.com

- **GCP / Firebase project:** `luke-sarfas-personal`
- **Owner / billing contact:** lukesarfas@icloud.com
- **Hosting product:** classic **Firebase Hosting** (static file serving from a CDN — **not** Firebase App Hosting, no servers/containers, no per-request compute billing).

This document is the single source of truth for what this site can cost, why it
realistically costs ~$0, and the controls in place to keep it that way.

---

## 1. TL;DR

At portfolio traffic levels the realistic monthly bill is **≈ $0**.

The site is a bundle of static files (HTML/CSS/JS/images) served by Firebase
Hosting's CDN. The only metered dimension that matters is **egress
(bandwidth)**. There is **no per-request charge and no compute charge** on
classic Hosting. Aggressive immutable caching (see §4) means repeat visitors and
CDN edges re-download almost nothing.

To go from "≈ $0" to "literally cannot bill me", keep the project on the
**Spark** plan — Spark is a free *hard cap*: at the free-tier ceiling it stops
serving rather than charging you. If/when Blaze is required, layer the
budget alert (§5) and, only if you want a true hard stop, the destructive
killswitch (§6).

---

## 2. Pricing facts

### Spark (free) plan
- Stored data: **10 GB** total.
- Egress (data transfer out): **10 GB / month**.
- These quotas are **pooled per project** (shared across Hosting sites/targets in
  `luke-sarfas-personal`).
- Spark is a **free hard cap**: when a quota is exhausted, Firebase **disables
  serving** (returns errors / stops transfer) for the rest of the period instead
  of billing you. You cannot be charged on Spark.

### Blaze (pay-as-you-go) plan
Blaze includes the same free allotments above, then bills only on overage:

| Dimension        | Free allotment | Overage price        |
| ---------------- | -------------- | -------------------- |
| Stored data      | 10 GB          | **$0.026 / GB**      |
| Egress / month   | 10 GB          | **$0.15 / GB**       |
| Requests / compute | n/a          | **$0.00** (no charge on classic Hosting) |

> Classic Hosting has **no per-request and no compute fee**. Egress is the only
> dimension that scales with traffic; storage is the only dimension that scales
> with site size.

### Realistic bill math
A project detail page with the maze applet is on the order of **~1 MB** of
transfer for a *cold* first visit (HTML + JS + CSS + a few images).

- Free egress cap = 10 GB/month ≈ **~10,000 cold full-page loads / month**.
- Immutable, fingerprinted assets (§4) are cached for a year, so **repeat
  visits and warmed CDN edges transfer ~0** — only the tiny revalidated HTML
  shell moves.
- At realistic portfolio traffic the site stays comfortably **inside the free
  10 GB egress allotment → effective bill ≈ $0** even on Blaze.

For a sense of the worst case: you would need **sustained ~67 GB of egress in a
month over the free tier** to reach even $10 of bandwidth charges
(`(67 − 10) GB × $0.15`).

Pricing reference: <https://firebase.google.com/pricing>
Hosting usage/quotas: <https://firebase.google.com/docs/hosting/usage-quotas-pricing>

---

## 3. Layers of protection (defense in depth)

1. **Stay on Spark where possible** — it is a built-in free hard cap; you cannot
   be billed.
2. **No large files hosted** (§4) — keeps both storage and per-load egress tiny.
3. **Immutable caching** (§4) — collapses repeat-visit and CDN egress to ~0.
4. **Budget alerts** (§5) — email at 50/90/100% of a monthly threshold. Alerts
   **notify only; they do NOT cap spend.**
5. **Optional killswitch** (§6) — Budget → Pub/Sub → Cloud Function that
   **detaches billing** to force a hard stop. **Destructive.** Use only if you
   need a guaranteed ceiling on Blaze.

> Critical caveat: **GCP budgets alert but do not stop spending.** A budget
> threshold being crossed sends email — it never pauses or caps the project. The
> only true hard caps are the Spark plan and the killswitch in §6.

---

## 4. Caching strategy & "no large files" policy

### Caching (already configured in `firebase.json`)
Cache-Control headers in `firebase.json` already minimise egress:

- `/_astro/**` and `**/*.@(js|css|woff2)` → `public,max-age=31536000,immutable`
  (1 year, immutable — fingerprinted build assets are never re-fetched).
- `**/*.@(svg|png|jpg|jpeg|webp|avif|ico)` → `public,max-age=604800` (7 days).
- HTML / `**` / `/version.json` → `public,max-age=0,must-revalidate`
  (always revalidated so deploys go live immediately; the body is small and
  returns `304 Not Modified` when unchanged → near-zero egress).

Because the build emits content-hashed filenames, the immutable year-long cache
is safe: a new deploy ships new filenames, so caches never serve stale assets.

### "No large files hosted" policy
- **Do not commit/deploy large media** (video, raw images, large datasets,
  WASM blobs, model weights) into any app's published output.
- Keep individual published assets small; prefer modern compressed formats
  (`webp`/`avif`) and pre-minified JS/CSS from the build.
- Host anything genuinely large **off Firebase** (e.g. a dedicated CDN/object
  store / external link), so it never counts against this project's storage or
  egress.
- Rationale: storage is billed per-GB and every byte of a large file is egress
  on each cold load — large files are the only realistic path to a non-trivial
  bill.

---

## 5. Budget alerts (recommended, alert-only)

A budget emails you as spend approaches a threshold. It **does not cap spend.**

Use the helper script (non-destructive):

```bash
# BILLING_ACCOUNT_ID is your Cloud Billing account, e.g. 0X0X0X-0X0X0X-0X0X0X
BILLING_ACCOUNT_ID=XXXXXX-XXXXXX-XXXXXX ./scripts/setup-budget.sh
# or
./scripts/setup-budget.sh XXXXXX-XXXXXX-XXXXXX
```

Equivalent raw `gcloud` command it runs (alerts at 50/90/100% of $10/month):

```bash
gcloud billing budgets create \
  --billing-account="$BILLING_ACCOUNT_ID" \
  --display-name="luke-sarfas-personal monthly budget" \
  --budget-amount=10USD \
  --filter-projects="projects/luke-sarfas-personal" \
  --threshold-rule=percent=0.5 \
  --threshold-rule=percent=0.9 \
  --threshold-rule=percent=1.0
```

Notes:
- Default alert recipients are the billing account's Billing Admins/Users
  (includes lukesarfas@icloud.com if that account is an admin). To route alerts
  to specific addresses or to Pub/Sub, attach a notification channel / Pub/Sub
  topic via `--notifications-rule-*` flags.
- List/inspect existing budgets:
  `gcloud billing budgets list --billing-account="$BILLING_ACCOUNT_ID"`

---

## 6. Optional hard-cap killswitch (DESTRUCTIVE — use deliberately)

If you need a guaranteed ceiling on the **Blaze** plan, wire:

**Cloud Budget → Pub/Sub topic → Cloud Function** that calls the Cloud Billing
API to **detach the billing account from the project** when spend crosses 100%.

- This **hard-stops all billable usage** by disabling billing on the project.
- It is **destructive**: detaching billing **takes the project (and this site)
  offline / disables Blaze-billed services** until billing is re-attached. Data
  in some services can be deleted after a grace period.
- Prefer it only as a true last-resort cap; for a portfolio site, Spark + budget
  alerts is usually enough.

High-level setup (outside the scope of `setup-budget.sh`):
1. Create a Pub/Sub topic, e.g. `billing-killswitch`.
2. Create the budget with `--all-updates-rule-pubsub-topic` pointing at it.
3. Deploy a Cloud Function subscribed to the topic that, on
   `costAmount >= budgetAmount`, calls
   `cloudbilling.projects.updateBillingInfo` to set
   `billingAccountName = ""` (detaches billing).

Reference: <https://cloud.google.com/billing/docs/how-to/notify> and
<https://cloud.google.com/billing/docs/how-to/disable-billing-with-notifications>

---

## 7. Monthly runbook

Once a month (or after any traffic spike):

1. **Firebase Hosting usage dashboard** — Firebase console →
   Hosting → Usage. Check **storage** and **egress (data transfer)** vs the
   10 GB free caps. If egress is trending toward the cap, investigate large
   assets or unexpected traffic.
2. **GCP Billing Reports** — Cloud console → Billing → Reports, filtered to
   project `luke-sarfas-personal`. Confirm month-to-date cost is ~$0.
3. **Budget alert review** — confirm the budget exists and that you can receive
   its email (`gcloud billing budgets list --billing-account=...`).

### What each alert threshold means
- **50%** — informational; spend reached half the $10 budget. Usually a traffic
  uptick worth a glance, no action required.
- **90%** — warning; you're about to exceed the budget this month. Check the
  Hosting usage dashboard for the cause (large file? traffic spike? misuse?).
- **100%** — budget exceeded. Investigate immediately. Remember the budget
  **does not stop spend** — if you need it stopped, remove the offending large
  asset, and/or rely on Spark, and/or trigger the §6 killswitch.

### If the killswitch fired (re-enabling billing)
The project will be offline because billing was detached. To restore:
1. Cloud console → **Billing** → **Account management** (or
   the project's **Billing** page).
2. **Link a billing account** to project `luke-sarfas-personal` (re-attach the
   detached Cloud Billing account).
   - CLI equivalent:
     `gcloud billing projects link luke-sarfas-personal --billing-account=BILLING_ACCOUNT_ID`
3. Confirm Hosting is serving again, then **fix the root cause** (large file /
   abuse) *before* re-arming the killswitch, or you'll just trip it again.

---

## 8. Quick reference

| Item                     | Value                                             |
| ------------------------ | ------------------------------------------------- |
| Project ID               | `luke-sarfas-personal`                            |
| Hosting type             | classic Firebase Hosting (static, no compute)     |
| Free storage             | 10 GB (pooled per project)                         |
| Free egress              | 10 GB / month (pooled per project)                |
| Storage overage (Blaze)  | $0.026 / GB                                        |
| Egress overage (Blaze)   | $0.15 / GB                                         |
| Request/compute charge   | $0.00 (none on classic Hosting)                   |
| Realistic monthly bill   | ≈ $0                                               |
| Hard caps                | Spark plan (built-in) · §6 killswitch (manual)    |
| Budgets                  | **alert-only — do NOT cap spend**                 |
| Pricing docs             | <https://firebase.google.com/pricing>             |
