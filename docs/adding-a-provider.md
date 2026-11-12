# Adding a provider

Use this list to add a new marketplace. The typecheck tells you what is
missing after step 1.

1. Registry. Open `packages/providers/src/registry.ts`.
   - Add the id to `PROVIDER_IDS`.
   - Add one entry to `PROVIDERS`: name, site, country, currency,
     currency label, search language and capabilities.
   - Set a capability to `true` only when the adapter supports it.
2. Adapter. Add a module in `packages/providers/src/` for the site.
   - Export a factory like `createOlxProvider`.
   - Add the factory to `FACTORIES` in `adapters.ts`.
   - Keep payloads, condition maps and delivery rules inside the module.
3. Shop code. Run `bun run typecheck`. Each error is a missing entry:
   - the session type in `apps/shop/src/lib/sessions.ts`;
   - the client and the publish step in `apps/shop/src/lib/publish.ts`;
   - the login call in `apps/shop/src/components/account/ConnectPanel.tsx`;
   - the delivery text in `apps/shop/src/components/sell/ApprovalCard.tsx`;
   - `needPublish` and `needConnect` in `apps/shop/src/lib/strings.ts`.
4. Proxy. Add the hosts of the site to `UPSTREAMS` in
   `apps/proxy/src/index.ts`. The proxy does not read the registry. The
   allowlist is the security boundary, so edit it by hand.
5. Tests.
   - Add fixtures and adapter tests in `packages/providers/test/`.
   - `registry.test.ts` checks each capability flag against the adapter.
   - The prompt test in `apps/shop/src/lib/system-prompt.test.ts` holds the
     text of the prompt for the current sites. Update its fixtures on
     purpose when the new site changes the prompt.
6. Run `bun run typecheck`, `bun test` and
   `bun run --cwd apps/shop build`.
