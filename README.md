# trgo

trgo is an AI chat that searches listings and posts listings on two Bosnian marketplaces: OLX.ba and SVEX.ba. The live app is https://trgo.omarzunic.com. The mascot is called Trgo.

The code is open source (MIT). You can read it to check how the app uses your data.

## Status

The chat searches OLX.ba and SVEX.ba. The AI runs in your browser with your own OpenRouter key (OAuth PKCE or a pasted key). The key stays in `localStorage` and goes only to OpenRouter. Marketplace calls go through `apps/proxy`. Posting listings comes later.

## Planned parts

- `apps/shop`: the chat app (TanStack Start, React, Tailwind CSS v4) for Cloudflare Workers.
- `apps/proxy`: a proxy for the marketplace requests.
- `packages/providers`: the OLX.ba and SVEX.ba provider code.

## Run locally

```sh
bun install
bun run --cwd apps/shop dev
```

Open http://localhost:3000.

Other commands, from `apps/shop`:

- `bun run typecheck`: check the types.
- `bun run build`: make a production build.
- `bun run deploy`: deploy with the `cf` CLI. It reads `cloudflare.config.ts`.

## License

MIT. See `LICENSE`.
