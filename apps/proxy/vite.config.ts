import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

// Vite's own CORS layer would answer preflights before the Worker does.
export default defineConfig({ plugins: [cloudflare()], server: { cors: false } });
