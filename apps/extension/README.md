# trgo extension

Optional browser extension (Manifest V3, Chrome and Firefox). It fetches
marketplace pages for the trgo page, directly from the browser.

## Build

```
bun install
bun run --cwd apps/extension build
```

The build writes `dist/chrome`, `dist/firefox` and a zip for each one.
The code is not minified.

## Load for development

1. Build with `bun run --cwd apps/extension build --dev`. This also
   allows `http://localhost:3000`.
2. Chrome: open `chrome://extensions`, turn on developer mode, click
   "Load unpacked" and choose `dist/chrome`.
3. Firefox: open `about:debugging#/runtime/this-firefox`, click "Load
   Temporary Add-on" and choose `dist/firefox/manifest.json`.
4. Open the welcome page and click "Allow access".

Do not publish a `--dev` build.

## Store

See `docs/extension-store.md` for the listing text and the steps, and
`docs/extension-privacy.md` for the privacy policy.
