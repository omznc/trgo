# trgo-proxy

A small Cloudflare Worker (`src/index.ts`). The browser cannot call OLX.ba or SVEX.ba directly, because they send no CORS headers. This Worker forwards the calls and adds the CORS headers.

## Access rules

- Every request needs an `Origin` header that is in `ALLOWED_ORIGINS`. Other requests get 403.
- Only one route works without an allowed `Origin`: `GET /version`.
- The Origin header is not a secret. Any script can fake it. The limits below are the real protection.
- The limit key is the client address from `cf-connecting-ip`. An IPv4 address is used whole. An IPv6 address is cut to its /64 prefix, because one customer owns a whole /64 and can rotate inside it.
- Rate limit: 60 requests per 60 seconds for each client (`RL_API`).
- Login routes have a stricter limit: 5 per 60 seconds (`RL_LOGIN`). These are `POST /olx/auth/login` and `POST /svex/prijava`. The Worker decodes the path once, lowercases it and removes trailing slashes before it matches, so `/olx/auth/login/` and `/olx/auth/%6Cogin` get the login limit too.
- `GET /svex/_next/static/*` has its own limit: 300 per 60 seconds for each client (`RL_STATIC`). It does not use `RL_API`.
- A request over the limit gets 429 and `{"error":"too many requests"}`.
- The limits are the `RL_API`, `RL_LOGIN` and `RL_STATIC` bindings in `cloudflare.config.ts`. A missing binding returns 500. For local dev, set `DEV_NO_RATE_LIMIT=1` in `.dev.vars`.

## Routes

The path has the form `/<upstream-key>/<path>`. The allowlist is the `UPSTREAMS` constant at the top of the file.

| Key | Upstream |
| --- | --- |
| `olx` | `https://api.olx.ba` |
| `svex` | `https://svex.ba` |
| `svex-listing` | `https://listing.api.svex.ba` |
| `svex-search` | `https://search.api.svex.ba` |

- Any other key returns 400.
- The URL parser resolves a raw `..`, `.` and backslash (`\`) before the Worker sees the path. For example `/olx/a/../b` becomes `/olx/b`. These cannot change the upstream host, because the host comes from the `UPSTREAMS` key.
- The Worker returns 400 for a path with `//`, or with a `..` or `.` segment, or with a backslash, that stays after parsing (for example `%2e%2e`, `%5C`, `%2f%2f`, `a%2f..%2fb`). It checks the path before and after percent-decoding. A single encoded `/` that does not form `..` or `//` passes (for example `/olx/a%2fb`).
- The Worker also returns 400 when the final target origin differs from the upstream origin.
- `GET /version` returns `{ "commit": "<GIT_COMMIT>" }`. Compare this value with the source.

## Geo

`GET /geo` returns `{ "country": "<code>" }`, or `{ "country": null }` when Cloudflare gives no country. It needs an allowed `Origin` and uses the `RL_API` limit. The Worker reads the country that Cloudflare detects (`request.cf.country`) and returns it. It keeps nothing and logs nothing.

## Upload

`PUT /upload?url=<encoded presigned URL>` sends the request body to a presigned upload URL.

- The URL must use `https:` and must not have a port or a user name.
- The host must match a pattern in the `UPLOAD_HOSTS` constant. The pattern matches any S3 bucket. It must be pinned to the SVEX bucket host when a real presigned URL is captured.
- The request needs a `content-length` header. The maximum is 15 MB. A larger file gets 413.
- The Worker streams the body. It does not keep it in memory.
- The Worker forwards only `content-type`. It does not follow redirects.

## Headers

- The Worker forwards the method, the query and the body.
- The Worker forwards only these request headers: `content-type`, `accept`, `authorization`, `next-action`, `next-router-state-tree`.
- The request header `x-lagano-cookie` becomes the upstream `cookie` header.
- The upstream `set-cookie` headers return in the response header `x-lagano-set-cookie`, as a JSON array of strings.
- For the `svex` key, the Worker sets `origin` and `referer` to `https://svex.ba`.

## Free AI route

`POST /ai/chat/completions` is a chat route for the free mode of the shop. It needs an allowed `Origin`.

- The Worker keeps only the allowed request fields. It sets the model and limits `max_tokens` to 4000.
- It sends the request to OpenRouter with a key that belongs to the owner. Both values are Worker secrets: `FREE_MODEL` and `OPENROUTER_KEY`.
- In the response, the `model` field is `trgo-free` and the `provider` field is removed.
- If a secret is missing, the route returns 503 `{"error":"free-unavailable"}`.
- Limits per client (IPv4 address or IPv6 /64): 12 requests per 60 seconds (`RL_FREE`) and 150 requests per UTC day (`FREE_KV`).
- Shared limit: 60 requests per 60 seconds for the whole route (`RL_FREE_ALL`, one fixed key). A Cloudflare rate limit binding counts for each Cloudflare location, not worldwide. So this is a ceiling for each location, not a worldwide ceiling. The real cost cap is the credit limit on the OpenRouter key. A missing `RL_FREE`, `RL_FREE_ALL` or `FREE_KV` binding returns 500.
- Order of checks: the limit for the client (`RL_FREE`), then the body check, then the shared limit (`RL_FREE_ALL`), then the daily quota. A request with an invalid body does not use the shared limit or the daily quota.
- A request over a limit gets 429 `{"error":"free-limit","scope":"minute"|"day"}` and a `Retry-After` header.
- Input checks run before the daily quota is spent:
  - The request needs a `content-length` header. Without it the request gets 413 `{"error":"body too large"}`.
  - A body over 512 KB, more than 120 messages, or more than 120000 characters (message text, tool call arguments, and the JSON of `tools` and `response_format`) gets 413 `{"error":"free-too-long"}`. The shop shows "chat too long".
  - More than 8 tools gets 400.
  - Only text content is allowed. A part of type `image_url`, `file` or `input_audio` gets 400.
- The daily counter fails open. If `FREE_KV` throws (for example a write limit), the request continues and the per-minute limits still apply.

## What the proxy never stores or logs

- It does not store or log the content of a request or a response.
- The only stored data is the daily counter of the free route. The key is an HMAC-SHA-256 of the client key and the date. The HMAC key is the `OPENROUTER_KEY` secret, so nobody can reverse the stored key by hashing all IPv4 addresses. It expires after 2 days.
- Because `OPENROUTER_KEY` is the HMAC key, a rotation of the key changes all counter keys. The daily counts then start again from zero.
- There is no D1 and no cache.
- It does not log bodies, headers or URLs. Observability is off.
- It does not keep a session. The browser keeps the cookies.

## Run and deploy

```sh
bun install
bun run dev      # http://localhost:8787
```

- For local variables, edit `.dev.vars` (`ALLOWED_ORIGINS=...`).
- To deploy, run `bun run deploy:proxy` in the repository root. The script `scripts/deploy.sh` sets `GIT_COMMIT` and `ALLOWED_ORIGINS`, then runs `cf deploy --profile personal`.
- Live URL: https://trgo-proxy.omznc.workers.dev

## Warning

The SVEX endpoints are private. They can change or stop at any time. The OLX search endpoint is public, but OLX can change it too.
