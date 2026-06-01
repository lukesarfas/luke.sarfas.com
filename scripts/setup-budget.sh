#!/usr/bin/env bash
#
# setup-budget.sh — create a GCP Cloud Billing budget with email alerts for the
# luke.sarfas.com project (luke-sarfas-personal).
#
# WHAT THIS DOES
#   Creates a monthly budget that emails the billing account's admins/users when
#   spend crosses 50%, 90%, and 100% of the threshold.
#
# IMPORTANT — budgets ALERT but do NOT cap spend.
#   A GCP budget only sends notifications. It will NEVER pause, throttle, or stop
#   billing. The only true hard caps are:
#     * the Spark (free) plan, which stops serving at the free-tier quota, and
#     * an optional, DESTRUCTIVE Budget -> Pub/Sub -> Cloud Function killswitch
#       that detaches billing from the project.
#   See ../docs/COST.md for the full cost model and the killswitch design.
#
# SAFETY
#   This script is NON-DESTRUCTIVE. It only CREATES a budget (an alerting object).
#   It does not change billing, delete anything, or affect serving.
#
# REQUIREMENTS
#   * gcloud CLI installed and authenticated (`gcloud auth login`).
#   * The "alpha"/billing budgets surface available in your gcloud install.
#   * Permission to create budgets on the billing account (Billing Account
#     Administrator or Billing Account Costs Manager).
#
set -euo pipefail

# --- Configuration -----------------------------------------------------------
PROJECT_ID="luke-sarfas-personal"
DISPLAY_NAME="luke-sarfas-personal monthly budget"
BUDGET_AMOUNT="10USD"   # monthly budget; alerts are a % of this, not a cap.

usage() {
  cat <<'USAGE'
Usage:
  BILLING_ACCOUNT_ID=XXXXXX-XXXXXX-XXXXXX ./scripts/setup-budget.sh
  ./scripts/setup-budget.sh XXXXXX-XXXXXX-XXXXXX

Creates a monthly Cloud Billing budget for project "luke-sarfas-personal"
with EMAIL ALERTS at 50%, 90%, and 100% of the budget amount.

Arguments / environment:
  BILLING_ACCOUNT_ID   Your Cloud Billing account ID, e.g. 0X0X0X-0X0X0X-0X0X0X.
                       Pass it as the first argument OR set it as an env var.

Find your billing account ID with:
  gcloud billing accounts list

NOTE: Budgets ALERT ONLY. They do NOT cap or stop spend. For a hard cap, see
the killswitch section in docs/COST.md.
USAGE
}

# --- Resolve the billing account id (arg 1 takes precedence over env var) -----
BILLING_ACCOUNT_ID="${1:-${BILLING_ACCOUNT_ID:-}}"

if [[ -z "${BILLING_ACCOUNT_ID}" ]]; then
  echo "ERROR: BILLING_ACCOUNT_ID is required (pass as \$1 or set as env var)." >&2
  echo >&2
  usage >&2
  exit 1
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "ERROR: gcloud CLI not found on PATH. Install the Google Cloud SDK first." >&2
  exit 1
fi

echo "About to create a Cloud Billing budget (alert-only, non-destructive):"
echo "  Billing account : ${BILLING_ACCOUNT_ID}"
echo "  Project         : ${PROJECT_ID}"
echo "  Display name    : ${DISPLAY_NAME}"
echo "  Amount          : ${BUDGET_AMOUNT} / month"
echo "  Alert thresholds: 50% / 90% / 100%"
echo

# --- Create the budget --------------------------------------------------------
# Alerts go to the billing account's Billing Admins & Users by default.
# To route to specific emails or Pub/Sub, add --notifications-rule-* flags.
gcloud billing budgets create \
  --billing-account="${BILLING_ACCOUNT_ID}" \
  --display-name="${DISPLAY_NAME}" \
  --budget-amount="${BUDGET_AMOUNT}" \
  --filter-projects="projects/${PROJECT_ID}" \
  --threshold-rule=percent=0.5 \
  --threshold-rule=percent=0.9 \
  --threshold-rule=percent=1.0

echo
echo "Budget created. Remember: this ALERTS only and does NOT cap spend."
echo "See docs/COST.md for the optional hard-cap killswitch and the monthly runbook."
