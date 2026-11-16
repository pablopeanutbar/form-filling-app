# Phase 1: connected suggestions (no DOM filling)

## Local setup

1. Keep the normal backend `MONGO_URI`, `SESSION_SECRET`, `PORT=5000`, and website `ALLOWED_ORIGINS=http://localhost:5173` configuration. No new signing key or privileged credential is embedded in the extension.
2. Load/reload the unpacked `extension` folder in Chrome. If using the ZIP, explicitly rebuild with `npm.cmd --prefix extension run package:dev`, extract it, and reload that folder. Accept the added local host/storage permissions when prompted.
3. With `NODE_ENV=development`, copy the extension ID shown at `chrome://extensions` into **server/.env** as `EXTENSION_DEV_IDS=youractual32characterextensionid`. Multiple IDs may be comma-separated; the default empty list rejects all extension clients. Existing local `EXTENSION_IDS` values must move to `EXTENSION_DEV_IDS`. Folder/location changes can change an unpacked extension's ID, so use the ID of the copy actually loaded and pair again if the ID changes.
4. Start/restart the backend (`npm.cmd --prefix server run dev`) and frontend (`npm.cmd --prefix client run dev`). `extension/config.js` uses `WEBSITE_URL=http://localhost:5173` and `API_URL=http://localhost:5000`. Website approval uses the existing same-origin Vite `/api` proxy. The worker calls the API directly with cookies omitted.
5. Choose **Connect account** in the popup. The website opens `/extension/connect/<public-request-id>`; log in if necessary. Reopen the popup to compare its eight-character code with the website's code. Confirm that you initiated the request, then approve.
6. Reopen the extension to finish the exchange. Go back to a supported form and select **Analyze form**. Suggestions use your saved profile. No DOM values are written and no form is submitted.
7. **Disconnect** in the popup revokes the connection before clearing local credentials. On network failure, retry when the server is reachable. Website **Account Settings → Manage connections** (`/extension/connections`) can revoke an individual connection, including a lost/uninstalled copy.

The initial MiniLM model download may need network access; inference stays in the existing matching service. If the model cannot load, deterministic rules still work and unsupported/unknown answers are withheld. This is not Gemini integration.

## Authorization design

- A five-minute pairing record contains a public request ID, comparison code, and hash of a random 256-bit device secret. The device secret is delivered only to the worker. It is never placed in a URL or sent to website JavaScript.
- Approval requires an active website session, the existing CSRF protection, and the comparison code. User identity comes exclusively from that session. Approval does not expose credentials in its response. Atomic pending → approved → consumed transitions prevent approval/exchange replay; cancellation/expiry rejects exchange. Database TTL cleanup is supplementary, not the expiry enforcement.
- A successful single-use exchange returns an opaque **five-minute access credential** scoped to `match:read`, a rotating refresh credential with a **seven-day inactivity lifetime**, and a revoke-only secret. Each grant has a **30-day absolute maximum lifetime**. Only hashes are stored in MongoDB. Refresh uses an atomic compare-and-set; an old refresh token cannot be reused. Existing access credentials are invalidated by rotation. Credentials for a deleted/suspended user are rejected.
- Revocation is checked on every authenticated request and refresh. The revoke-only secret cannot read profiles or request matches and survives rotation, allowing disconnect even when a renewal response was lost. Account-owned revocation is also available from the website. A lost exchange/refresh response can require reconnecting; unused grants can be revoked on the website and expire automatically. Revocation cannot retract suggestions already returned or cancel an in-flight matching request; the popup clears its results on disconnect.
- Worker storage is `chrome.storage.local`, explicitly restricted to `TRUSTED_CONTEXTS` before every credential access. Credentials are never copied into page DOM or content scripts, and worker responses to the popup contain only account/pairing status and requested suggestions. Personal suggestions are not persisted in extension storage. Chrome storage is not a defense against a compromised OS/browser profile.
- Only the actual extension popup can call connection/analysis messages. Content-script senders and arbitrary fetch URLs are rejected. No `externally_connectable` or web-accessible credential bridge is added. The backend's allowlist is client admission control, not a substitute for credential authentication.
- The extension sends only field metadata: identifiers needed to correlate results, labels, types, section labels, predefined option labels/values, and constraints. It excludes current input values, whole-page contents, and page URLs/titles from matching requests. Sensitive field filtering remains active in extraction and is checked independently by the backend.

Implementation follows Chrome's [storage access controls](https://developer.chrome.com/docs/extensions/reference/api/storage) and [cross-origin request guidance](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests).

## API endpoints

All paths are under `/api/v1/extension`; responses are `Cache-Control: no-store`.

| Endpoint | Boundary | Purpose |
| --- | --- | --- |
| POST `/pairing` | Allowlisted extension ID/origin | Start a five-minute request |
| GET `/pairing/:id` | Website session | Read comparison code and scope, never the device secret |
| POST `/pairing/:id/decision` | Website session + CSRF | Approve/cancel with server-derived user identity |
| POST `/exchange` | Extension + device secret | Poll/consume approved request once |
| POST `/cancel` | Extension + device secret | Cancel pending/approved request |
| POST `/refresh` | Extension + current refresh credential | Rotate credentials within the absolute grant lifetime |
| POST `/disconnect` | Extension + revoke-only secret | Revoke the grant, idempotently |
| GET `/me` | Extension + scoped access credential | Get connected account identity |
| POST `/match` | Extension + scoped access credential | Invoke existing profile/matching service |
| GET `/connections` | Website session | List that account's active grants without secrets |
| POST `/connections/:id/revoke` | Website session + CSRF + ownership | Revoke one connection |

Extension requests require `X-Extension-Id`. When Origin is present it must equal that exact allowlisted extension origin. Protected requests additionally require `Authorization: Bearer <access credential>`; cookies never substitute for a token. Pairing, polling, decision, refresh, disconnect, and matching have independent IP rate limits. Existing `/auth`, `/profile`, and `/autofill/match` session/CSRF controls remain in place.

The existing `/autofill/match` validator now also preserves bounded option objects and constraints, and rejects unexpected body fields (including entered values and client-supplied user IDs). Existing string-only option arrays remain accepted for compatibility. Suggestions include a readable source label and a disambiguated education record context when available.

## Permissions and deployment

- `NODE_ENV=production` uses only `EXTENSION_IDS`, set to the eventual Chrome Web Store listing's actual ID. Development/test use only `EXTENSION_DEV_IDS`; the lists are never merged and an empty active list disables extension clients. Restart the backend after changing either setting. The same selected list drives CORS and pairing admission; the ID/header is not proof of origin or a replacement for authorization credentials.
- No manifest key was added for this configuration fix, preserving the current unpacked ID. For a stable ID across folders, Chrome supports a public `key` in the manifest, obtained from the intended package/Store entry. An ID alone cannot reconstruct that key. Adding a different public key can change the ID and require allowlist updates and fresh pairing. Never include a private signing key in source or ZIP packages.

- Retained `activeTab` and `scripting`.
- Added `storage` for worker-owned authorization state and `http://localhost/*` host access for the configured local API. Chrome host matching does not restrict access to one port; the worker itself uses only the configured API origin. No blanket website host permissions, cookie access, identity API, alarms, or background form monitoring are added.
- Chrome 102+ is required for trusted storage access controls.
- Before deployment, set the actual HTTPS website/API origins in `extension/config.js`, replace the development host permission with the specific HTTPS API host, configure the actual published extension ID on the server, and configure the website origin/session security for production. Restart/rebuild explicitly. The development ZIP must not be published as a Store release.

## Matching safety and focused verification

Parent/guardian email cannot use applicant contact values. Marks obtained, maximum marks, and percentage have separate canonical meanings; no grade conversion is performed. Numeric destinations validate finite numbers, bounds, and steps. Select/radio suggestions must identify one enabled available option and return its actual value separately from its display label. Truncated/ambiguous choices, custom patterns, unsupported controls, and ambiguous education records abstain or require review. Multiple indistinguishable education records do not silently select the first. Semantic similarity is never displayed as an accuracy percentage; semantic suggestions require review even with a high score.

Run from the repository root:

```powershell
npm.cmd --prefix server run test:extension-phase1
```

Tests use synthetic profiles and isolated in-memory repositories plus real HTTP/session/CSRF middleware, the production matching validator, both extraction implementations, and worker/popup integration. They do not connect to the configured MongoDB database. They verify model index definitions but do not substitute for deployed Mongo index/TTL acceptance. Live Chrome permission prompts, pairing with the running backend/MongoDB, cold MiniLM download/inference, and actual browser installation still need manual acceptance. No DOM autofill or form submission should occur.
