# Adding a provider

Use this list to add a new marketplace. The typecheck tells you what is
missing after step 1.

1. Registry. Open `packages/providers/src/registry.ts`.
   - Add the id to `PROVIDER_IDS`.
   - Add one entry to `PROVIDERS`: name, site, country, currency,
     currency label, search language and capabilities.
   - Set a capability to `true` only when the adapter supports it.
   - The currency needs a rate in `packages/providers/src/rates.ts`.
   - A search-only provider (no `mine` and no `publish`) gets no connect
     chip and no account tools. A country with a provider is a market in
     the shop. Add the provider to `PAGE_SIZE` in `price-sample.ts`.
2. Adapter. Add a module in `packages/providers/src/` for the site.
   - Export a factory like `createOlxProvider`.
   - Add the factory to `FACTORIES` in `adapters.ts`.
   - Keep payloads, condition maps and delivery rules inside the module.
3. Shop code. Run `bun run typecheck`. Each error is a missing entry:
   - the session type in `apps/shop/src/lib/sessions.ts`;
   - the client and the publish step in `apps/shop/src/lib/publish.ts`;
   - the login call in `apps/shop/src/components/account/ConnectPanel.tsx`;
   - the delivery text in `apps/shop/src/components/sell/ApprovalCard.tsx`;
   - `needPublish` and `needConnect` in `apps/shop/src/lib/strings.ts`;
   - the site icon in `LOGOS` in `apps/shop/src/components/shell/Composer.tsx`.
     Put the file in `apps/shop/public/logos/`. Use the site's own favicon
     (SVG if the site has one), and read the SVG first: it must have no script.
   - A search-only provider gets a stub in each of these maps (see `kp`).
     The capability gating hides it, so no code runs the stub.
4. Hosts. Add the hosts of the site to `UPSTREAMS` in
   `packages/providers/src/hosts.ts`. The proxy and the browser extension
   both use this file. They do not read the registry. The allowlist is the
   security boundary, so edit it by hand.
   - A site that blocks the proxy, but works from the user's own browser,
     goes only in `EXTENSION_HOSTS` with `extensionOnly: true`. Set
     `needsExtension: true` in its registry entry, so the shop offers it
     only when the extension is installed (see `njuskalo`).
   - `EXTENSION_HOSTS` takes every `UPSTREAMS` key, except the keys in
     `PROXY_ONLY` in `hosts.ts`. A new proxy key that the extension does
     not need goes in `PROXY_ONLY`. Then the extension permissions stay
     the same and no store review is needed.
   - A search-only site with no account goes in `READ_ONLY` with the path
     prefixes that the adapter uses. The proxy then allows only GET on
     those paths and sends no cookie and no `authorization` header.
   - Send the user's cookies (`credentials: "include"`) only when the site
     needs them, and then limit the host to the paths it needs with `paths`.
   - The extension build takes its `host_permissions` from
     `EXTENSION_HOSTS`. Add each new host to the permission list in
     `docs/extension-store.md`, and publish a new extension version: the
     stores review each new host.
5. Tests.
   - Add fixtures and adapter tests in `packages/providers/test/`.
   - `registry.test.ts` checks each capability flag against the adapter.
   - The prompt test in `apps/shop/src/lib/system-prompt.test.ts` holds the
     text of the prompt for the current sites. Update its fixtures on
     purpose when the new site changes the prompt.
6. Run `bun run typecheck`, `bun test` and
   `bun run --cwd apps/shop build`.
