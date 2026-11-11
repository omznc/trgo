# trgo-proxy

A small Cloudflare Worker (`src/index.ts`, about 180 lines). The browser cannot call OLX.ba or SVEX.ba directly, because they send no CORS headers. This Worker forwards the calls and adds the CORS headers.

## Access rules

- Every request needs an `Origin` header that is in `ALLOWED_ORIGINS`. Other requests get 403.
- Only one route works without an allowed `Origin`: `GET /version`.
- Rate limit: 60 requests per 60 seconds for each client IP (`cf-connecting-ip`).
- Login routes have a stricter limit: 5 per 60 seconds. These are `POST /olx/auth/login` and `POST /svex/prijava`.
- A request over the limit gets 429 and `{"error":"too many requests"}`.
- The limits are the `RL_API` and `RL_LOGIN` bindings in `cloudflare.config.ts`. In local dev they are absent, so there is no limit.

## Routes

The path has the form `/<upstream-key>/<path>`. The allowlist is the `UPSTREAMS` constant at the top of the file.

| Key | Upstream |
| --- | --- |
| `olx` | `https://api.olx.ba` |
| `svex` | `https://svex.ba` |
| `svex-listing` | `https://listing.api.svex.ba` |
| `svex-search` | `https://search.api.svex.ba` |

- Any other key returns 400.
- A path with `..`, `.`, `//` or a backslash returns 400. The Worker checks the path before and after percent-decoding.
- `GET /version` returns `{ "commit": "<GIT_COMMIT>" }`. Compare this value with the source.

## Upload

`PUT /upload?url=<encoded presigned URL>` sends the request body to a presigned upload URL.

- The URL must use `https:` and must not have a port or a user name.
- The host must match a pattern in the `UPLOAD_HOSTS` constant. The pattern is for S3-style buckets. It is a first guess and must be confirmed.
- The request needs a `content-length` header. The maximum is 15 MB. A larger file gets 413.
- The Worker streams the body. It does not keep it in memory.
- The Worker forwards only `content-type`. It does not follow redirects.

## Headers

- The Worker forwards the method, the query and the body.
- The Worker forwards only these request headers: `content-type`, `accept`, `authorization`, `next-action`, `next-router-state-tree`.
- The request header `x-lagano-cookie` becomes the upstream `cookie` header.
- The upstream `set-cookie` headers return in the response header `x-lagano-set-cookie`, as a JSON array of strings.
- For the `svex` key, the Worker sets `origin` and `referer` to `https://svex.ba`.

## What the proxy never stores or logs

- It has no KV, no D1 and no cache.
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
