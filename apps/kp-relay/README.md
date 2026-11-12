# kp-relay

A small relay for KupujemProdajem. The site blocks all Cloudflare Worker traffic with a 403. The relay runs on the owner's home server, so its requests leave from the home IP.

The browser never talks to the relay. The browser talks to the proxy (`apps/proxy`, route `/kp/*`). The proxy talks to the relay through a Cloudflare Tunnel.

## What it does

- It forwards only `GET` to `https://www.kupujemprodajem.com` plus the path and query. Other methods get 405.
- It needs the header `x-relay-secret`. The value must equal `RELAY_SECRET`. A wrong or missing value gets 401.
- It returns 400 for a path that starts with `/api/`, or has `..`, `//` or a backslash. It checks the path before and after percent-decoding.
- It sends a fixed browser User-Agent and fixed `accept` and `accept-language` headers.
- It returns only the status, the `content-type` and the body.
- It does not follow redirects. A redirect to another host returns 502.
- It allows 30 upstream requests per 10 seconds in total. More requests get 429. This protects the home IP.

## What it does not do

- It does not forward cookies, IP headers or any other client header.
- It does not write request logs. It writes one line at start.
- It does not store anything.

## Environment

- `RELAY_SECRET`: required. The relay does not start without it.
- `PORT`: optional. Default `8788`.

## Run

```sh
RELAY_SECRET="$(openssl rand -hex 32)" bun run start
bun test
```

## Docker

```sh
docker build -t kp-relay apps/kp-relay
docker run -d --name kp-relay --restart unless-stopped -p 127.0.0.1:8788:8788 -e RELAY_SECRET kp-relay
```

Point the Cloudflare Tunnel hostname `kp-relay.omarzunic.com` at `http://localhost:8788`. Set the same secret on the proxy Worker as `KP_RELAY_SECRET`.
