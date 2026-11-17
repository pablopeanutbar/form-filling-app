# formER extension: development distribution

The extension detects form fields and, after explicit account connection, requests real suggestions from the saved profile. DOM autofill and form submission are not enabled. The website installation guide is at `/extension` and is reachable from the authenticated dashboard.

For account pairing, required server configuration, endpoints, permissions, and focused tests, see [Phase 1 setup](PHASE1.md).

## Build a development ZIP

From the repository root, on Windows with Node/npm and Windows PowerShell/.NET installed:

```powershell
npm.cmd --prefix extension run package:dev
```

`npm.cmd` avoids PowerShell selecting npm's `.ps1` shim. The packaging script itself must be permitted by your environment's PowerShell policy. Do not weaken an organization-managed execution policy to run it. This packaging command currently targets Windows; it does not require an npm dependency installation in `extension`.

Outputs (both ignored by Git):

```text
artifacts/extension/formER-development.zip
artifacts/extension/formER-development.json
```

The ZIP has `manifest.json` at its root. The JSON file is an integrity receipt used by the local download server, not an extension file. `package-files.json` explicitly lists the 12 runtime/license files included. The injected detector is `content/content.js`; the separate extraction helper modules and `test-form.html` are not needed by the installed extension and are excluded. No tests, dependency folders, environment files, maps, backend files, or project documentation are copied.

The script checks Manifest V3 and manifest dependencies, creates a temporary ZIP, reads each entry back, and compares its SHA-256 hash with the source. Only then does it replace the previous ZIP and write the receipt. It never uploads or publishes anything and is not attached to website build/start hooks. Rebuild explicitly after changing packaged source. If future runtime imports, assets, or injected scripts are added, update the allowlist before rebuilding. Review those files for credentials before including them; an allowlist and checksums do not replace a source/security review.

## Enable local downloads

1. Build the package using the command above.
2. Start the frontend from the repository root:

   ```powershell
   npm.cmd --prefix client run dev
   ```

3. Open `http://localhost:5173/extension` on the same computer. The public guide does not require login. Its local download section checks for a verified package and enables **Download Extension** only when that check succeeds. If the page was already open, select **Check availability again** or reload it.

Optional configuration in `client/.env.local`:

```dotenv
FORMER_EXTENSION_ZIP_URL=/__former-extension/formER-development.zip
VITE_CHROME_WEB_STORE_URL=
```

`FORMER_EXTENSION_ZIP_URL` is the local URL path, not a filesystem location or external hosting URL. It must start with one slash, end in `.zip`, contain only letters/numbers, `/`, `_`, and `-`, and stay outside `/api/`. For example, `/downloads/formER-testing.zip` is supported. Restart Vite after changing it. The page receives this URL from the development-only status endpoint; it does not trust an arbitrary external ZIP URL.

The Vite development middleware rechecks the archive checksum and each allowlisted source checksum before reporting availability **and before serving a download**. Missing/corrupt artifacts, missing receipts, and changed source make the package unavailable until explicitly rebuilt. Requests must originate from a loopback address, even if Vite is started with `--host`. This is for local testing, not LAN distribution or public hosting. The check is archive integrity, not Chrome Store approval or a signed software release.

## Production and Chrome Web Store

- The ZIP and receipt live outside `client/public` and `client/dist`. Never copy them into either directory or a public deployment folder.
- The Vite middleware has no production-build or preview route. Artifact paths are also denied by Vite's ordinary filesystem serving.
- The local download component is gated by `import.meta.env.DEV`. A normal production build has no development download action or status request.
- Keep the Store variable empty until a real listing exists. Set `VITE_CHROME_WEB_STORE_URL` to the official HTTPS `chromewebstore.google.com/detail/...` listing with its real 32-character extension ID, then rebuild the website. Only a valid official listing URL enables **Add to Chrome**; otherwise the page says the Store release is unavailable. No listing was created for this milestone.
- `extension/config.js` still points popup website links to the approved `http://localhost:5173`. Configure and review the actual deployed website origin before a public release. The API origin and narrowly scoped host permission must also match the deployed API. Origin configuration does not itself authorize accounts or enable autofill.
- Deploy only the frontend's normal build output, not the repository or its `artifacts` folder. No deployment or release publishing is performed by these commands.

## Install and update manually

Download the ZIP (or check out the repository), extract it, open `chrome://extensions`, enable **Developer Mode**, choose **Load unpacked**, and select the extracted folder containing `manifest.json`. Do not select the ZIP itself. Pin formER using Chrome's puzzle-piece Extensions menu. Keep that folder in place while the extension is installed.

The unpacked extension receives a stable development ID across all computers and folder locations: **`egddjhnhnbgdhgiepnfmnnhfagbaambn`** (derived from the public `key` in `manifest.json`). Testers and developers running a local backend must set `EXTENSION_DEV_IDS=egddjhnhnbgdhgiepnfmnnhfagbaambn` in `server/.env`. Each tester requires their own running backend and database (or a reachable shared instance), since the extension interacts with the API at `http://localhost:5000`.

After rebuilding, download and extract the new copy into the same extension folder, then click **Reload** on formER's card in `chrome://extensions`. This is a manual development workflow, not automatic Store updates. Real Chrome installation, layout, and interactions remain manual acceptance checks.
