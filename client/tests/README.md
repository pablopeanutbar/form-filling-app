# Frontend verification

From the repository root, with the existing client and server dependencies installed:

```sh
npm --prefix client test
npm --prefix client run build
```

The suite includes HTTP-client tests, pure profile validation/serialization tests, and React component integration tests. Component tests bundle JSX in memory with the existing Vite/esbuild dependency and use the existing server jsdom dependency. They do not launch or visually emulate a real browser. Dialog methods are stubbed; native dialog focus requires browser verification.

## Isolated browser fixture

```sh
node client/tests/helpers/ui-server.mjs
```

Open `http://127.0.0.1:5188/app`. This serves the production build and a synthetic, in-memory API. It imports the backend validation schemas but never connects to MongoDB. The fixture is not included in the production bundle. Stop the process to discard its data. `UI_TEST_PORT` can select another local port.

For automated fixture setup, POST JSON to `/__test/config` with `profile`, `signedIn`, `delay` (milliseconds), or `failures` (a map such as `{"PATCH /api/v1/profile/me":500}`). `/__test/state` exposes the synthetic state and request records; `/__test/reset` clears them. These endpoints exist only in this test server.

## Pending real-browser acceptance

- Inspect Dashboard and every profile section at 390, 768, 1440, and 1920 CSS pixels, checking overflow, wrapping, focus rings, navigation, and save-bar reachability.
- Inspect empty and populated profiles, loading, errors, and saved feedback. Save/reload each section. Confirm the dashboard reflects those changes.
- Add two education records at the same level, edit one, and delete one with confirmation. Check marks and grades; no CGPA/percentage conversions should appear.
- Add/edit/remove professional roles; confirm optional clearing and separate addresses.
- Check unsaved internal navigation, browser Back, reload warnings, cancellation, and logout success/failure.
- Check mobile dialog keyboard focus/Escape/return focus and reduced motion.
- Visit `/`, `/login`, and `/register`, confirm existing routing behavior and landing animations/cleanup. The landing source is unchanged, but router behavior needs browser regression testing.
- Capture screenshots outside production assets; label fixture data as synthetic in the verification report.
- Separately verify persistence with a dedicated backend test account. Mock-backed tests are not evidence of database persistence.

No browser screenshots or viewport acceptance were completed in the 2026-11-16 sprint session: localhost browser access timed out, then Windows Computer Use stopped because it could not reliably determine Chrome's URL.
