import { bindings, defineConfig } from "cf/config";

// Build-time inputs. Local work reads .dev.vars instead.
//   ALLOWED_ORIGINS  comma list of browser origins. Default http://localhost:3000.
//   KP_RELAY_URL     https URL of the KupujemProdajem relay. Default empty.
//   GIT_COMMIT      commit id that GET /version returns. Default "dev".
export default defineConfig({
	worker: {
		name: "trgo-proxy",
		compatibilityDate: "2026-09-15",
		entrypoint: "src/index.ts",
		observability: { enabled: false },
		env: {
			ALLOWED_ORIGINS: bindings.text(process.env.ALLOWED_ORIGINS ?? "http://localhost:3000"),
			GIT_COMMIT: bindings.text(process.env.GIT_COMMIT ?? "dev"),
			// Empty means the /kp route returns 503.
			KP_RELAY_URL: bindings.text(process.env.KP_RELAY_URL ?? ""),
			// Per client IP. Namespace ids are unique per account.
			RL_API: bindings.rateLimit({ namespace: "2001", simple: { limit: 60, period: 60 } }),
			RL_LOGIN: bindings.rateLimit({ namespace: "2002", simple: { limit: 5, period: 60 } }),
			RL_FREE: bindings.rateLimit({ namespace: "2003", simple: { limit: 12, period: 60 } }),
			// One fixed key: the ceiling for the whole free route, over all clients.
			RL_FREE_ALL: bindings.rateLimit({ namespace: "2004", simple: { limit: 60, period: 60 } }),
			// SVEX static chunks (action discovery fetches about 50 per run).
			RL_STATIC: bindings.rateLimit({ namespace: "2005", simple: { limit: 300, period: 60 } }),
			FREE_KV: bindings.kv({ id: "9ce40f97b1684d3eabb9ab846ccdd97f" }),
			// Set with "cf workers secrets update". Declared here so a deploy keeps them.
			FREE_MODEL: bindings.secret(),
			OPENROUTER_KEY: bindings.secret(),
			KP_RELAY_SECRET: bindings.secret(),
		},
	},
});
