---
layout: ../layouts/Legal.astro
title: Privacy Policy
updated: 29 April 2026
---

# Privacy Policy

*Last updated: 29 April 2026*

ThinkWell (the "app") is a personal journaling app. This policy explains what data we collect, how we use it, and the choices you have.

## Who we are

ThinkWell is operated by Luke Sarfas as an individual developer. For any privacy questions, contact [luke@sarfas.com](mailto:luke@sarfas.com).

## Data we collect

- **Account identity** — your email address and a random account ID assigned by our identity provider when you sign up. Used to sign you in and to associate your data with your account. If you sign in with Apple or Google instead of email + password, we receive your email (or Apple's private-relay address if you chose that) and nothing else from those providers.
- **Your journal content** — entries, entities (people, places, things you mention), relationships between them, events, the quick notes you jot down, and the freeform preferences and goals you set. Stored on our cloud infrastructure in the European Union (Ireland), tied to your account ID. Entries are encrypted on your device before upload (see Security).
- **Attached photos and cover images** — photos you attach to a journal entry or use as a cover image, and the profile photo you set. Uploaded to our object storage in the European Union (Ireland), scoped to your account ID by a presigned URL.
- **Voice recordings and transcripts** — if you record a voice entry, the audio file is uploaded to the same object storage and the on-device transcript is stored alongside the entry. You can delete either at any time from the entry.
- **Locations you attach** — if you attach a place to an entry or add one to your Life Map, we store its name, city, country, and (when available) latitude/longitude coordinates. We do **not** read your device location automatically. Location text you type is sent to OpenStreetMap's Nominatim service to resolve coordinates (see Third-party processors).
- **Profile details you enter** — optional display name, date of birth, bio, occupation, important dates, and life goals that you choose to add in Settings. Used only to personalise the app for you.
- **Connections (people in your life)** — if you create a connection, we store its name, relationship type, how you met, notes, and a computed "health score" based on how recently you've written about the person. This is derived from and lives alongside your journal content.
- **Spotify track references** — if you connect Spotify and attach a track to an entry, we store the track ID, name, artists, album art URL, and play timestamp. See the Spotify section below for the full picture.
- **Subscription status** — if you subscribe to a paid tier, we store whether your account currently has an active `paid` entitlement. Purchase and billing details are handled by Apple (iOS in-app purchases via RevenueCat) or Stripe (web), not by us — see Third-party processors.
- **Crash and performance data** — technical information (error traces, request latencies, sync failures) sent to our logging provider so we can fix bugs. Before upload, every message and metadata field is scrubbed: emails, phone numbers, tokens, and API keys are redacted, and any free-form text fields (entry content, transcripts, prompts) are replaced with a length + short hash so the event is correlatable but not readable. Tagged with your account ID so we can investigate issues on your account.

## Data we do not collect

- We do not track you across apps or websites.
- We do not sell your data.
- We do not share your data with advertisers or third-party analytics platforms. The marketing site (`thinkwelljournal.com`) carries no trackers, cookies, or analytics scripts.
- We do not read your device's location automatically. We do not access your contacts, photos, camera roll, microphone, or any other device capability unless you explicitly grant permission for a specific feature (see Device permissions below).

## Device permissions

The app only asks for a device permission when you use the feature that needs it. You can revoke any of them in your device's Settings app at any time without losing access to the rest of ThinkWell.

- **Microphone** — used when you record a voice entry. Audio is captured on-device, uploaded to our object storage as described above, and the transcript is stored with the entry.
- **Speech recognition** — used to transcribe voice entries on-device via the system speech recognizer. On iOS, transcription is performed locally by the operating system.
- **Face ID / biometrics** — used only to unlock the app if you enable App Lock in Settings. Face ID data never leaves your device; iOS returns only a success/failure signal.
- **Photo library** — used when you attach a photo to an entry. On iOS we use the system picker (PHPicker), so ThinkWell only receives the specific photos you hand to it and never gets broader access to your library.

## How your content is used

Your journal entries, and the entities, relationships, and reflection context derived from them, are processed by our AI subprocessor (Anthropic, accessed via AWS Bedrock in the EU) to extract entities, relationships, mood signals, and insights that power the Life Map, Insights, and Reflect features. Prompts containing the relevant content are sent to that subprocessor in the European Union (Ireland). Under the subprocessor's default terms, your content is not used to train any foundation model and is not retained after processing.

## Third-party processors

A small number of third parties process data on our behalf or as an independent controller. We use only what we need from each of them.

- **Amazon Web Services, Inc. (AWS)** — hosts the backend that stores your account, journal content, media, and operational logs, and provides the AI inference (via AWS Bedrock) used for entity extraction and insights. All user data is stored in the European Union (Ireland). AWS acts as a processor on our behalf.
- **Apple and Google** — if you use Sign in with Apple or Sign in with Google, the provider authenticates you and shares your email (or Apple's private-relay address) with our identity provider. We never receive your password. We request only the `openid`, `email`, and `profile` scopes.
- **OpenStreetMap (Nominatim)** — when you type a place name to attach, the query text (plus any city / country context you've typed) is sent to `nominatim.openstreetmap.org` to resolve coordinates. Nominatim is run by the OpenStreetMap Foundation under its own [privacy policy](https://wiki.osmfoundation.org/wiki/Privacy_Policy).
- **Spotify** — if you connect Spotify, see the Spotify section below.
- **Apple App Store + RevenueCat (iOS purchases)** — if you subscribe through the iOS app, Apple handles the purchase. We use [RevenueCat](https://www.revenuecat.com/) to verify the receipt and surface the entitlement back to your account. We send RevenueCat your account ID so it can associate the purchase with the right account. We do not send your email, journal content, or any other profile data.
- **Stripe (web purchases)** — if you subscribe on the web, [Stripe](https://stripe.com/) processes the payment. We send Stripe your account ID and the product you selected. Card details go directly to Stripe and never touch our servers.

## Spotify integration

If you connect your Spotify account, ThinkWell uses the [Spotify Web API](https://developer.spotify.com/) under the `user-read-recently-played` scope to show your most recent plays, so you can attach the track you were listening to to a journal entry.

- We request **only** the `user-read-recently-played` scope. We cannot control playback, read your playlists, or access your library.
- Only tracks you explicitly attach to an entry are stored. The broader listening history returned by Spotify is held in memory for the duration of the picker and is not persisted.
- Attached tracks are stored as the track ID, name, artist names, album art URL and play timestamp, alongside the entry they belong to. They follow the same storage and security model as your journal content above.
- We do not share your Spotify data with third parties, and we do not use it for advertising, profiling, or training any model.
- Spotify access and refresh tokens live only on your device, in the secure keystore (iOS Keychain / Android Keystore / browser storage). They are never sent to our servers.
- You can disconnect at any time in **Settings → Spotify → Disconnect**. This deletes the stored Spotify access and refresh tokens from your device. To fully revoke ThinkWell's access on Spotify's side as well, visit [spotify.com/account/apps](https://www.spotify.com/account/apps/).
- Tracks you have already attached to past entries remain in those entries after disconnecting, because they are part of your journal content. You can remove them individually from each entry's soundtrack section.

ThinkWell is not endorsed, certified, or otherwise approved in any way by Spotify. "Spotify" is a trademark of Spotify AB.

## Who has access

Within the app, only your signed-in account can read your data. Access is enforced at the identity layer and by fine-grained infrastructure policies that restrict each user's records to their own account ID. At the infrastructure layer, our cloud provider and the app's administrators could technically access records at rest — see the Security section below for the honest picture.

## Security

Your journal content is encrypted on your device with authenticated symmetric encryption before being written to local storage. The encryption key is generated on your device and stored in the iOS Keychain (on iPhone/iPad) or Android Keystore, so that another app or an attacker with read access to the filesystem cannot read your entries directly off the device.

When your data syncs to our servers in the European Union (Ireland), it travels over TLS and is stored with provider-managed server-side encryption. **This is not end-to-end encryption.** That means our cloud provider, and anyone with administrative access to our production accounts, could in principle read the records at rest on the server. We do not access your journal content for any purpose other than delivering the app's features (e.g. entity extraction by our AI subprocessor, described above) and restoring your data on a new device.

If you want stricter guarantees — for example an unreadable-by-anyone-but-you model — you can use the app in offline mode without signing in, in which case nothing leaves your device.

## Your rights

- **Export your data** — you can export your entries and entities at any time from the app.
- **Delete specific data** — delete entries, entities or relationships from within the app.
- **Reset account** — "Reset account data" in Settings permanently deletes all your content from our servers while keeping your account.
- **Delete your account** — "Delete account" in Settings permanently deletes your account and every piece of data tied to it. This cannot be undone.

If you want to exercise any of these rights and cannot access the app, email [luke@sarfas.com](mailto:luke@sarfas.com).

## Data retention

Data is retained for as long as your account exists. Deleting your account removes all associated data — including photos, audio, locations, and any third-party processor records keyed to your account — within 30 days.

## Children

ThinkWell is not directed at children under 13 and we do not knowingly collect data from them.

## Changes to this policy

If we materially change this policy we will update the "last updated" date above and, where appropriate, notify you in-app.

[Terms of Service](/terms.html)
