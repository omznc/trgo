import { defineConfig } from "cf/config";

export default defineConfig({
	worker: {
		name: "trgo",
		compatibilityDate: "2026-09-15",
		compatibilityFlags: ["nodejs_compat"],
		entrypoint: "@tanstack/react-start/server-entry",
		domains: ["trgo.omarzunic.com"],
	},
});
