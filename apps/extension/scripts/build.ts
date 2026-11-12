// Builds the Chrome and Firefox packages. The bundle is not minified, so a store reviewer can read it.
// Use "--dev" to also allow the local dev page.
import { EXTENSION_HOSTS } from "@lagano/providers/hosts";
import { ALLOWED_ORIGINS } from "../src/protocol";

const DEV_ORIGINS = ["http://localhost:3000"];
const root = new URL("..", import.meta.url).pathname;
const dev = process.argv.includes("--dev");
const { version } = await Bun.file(`${root}package.json`).json();
const origins = [...ALLOWED_ORIGINS, ...(dev ? DEV_ORIGINS : [])];

const manifest = {
	manifest_version: 3,
	name: "trgo",
	version,
	description: "Optional helper for trgo. It reads marketplace pages in your own browser, not through the trgo proxy.",
	icons: Object.fromEntries([16, 32, 48, 128].map((size) => [size, `icons/icon-${size}.png`])),
	host_permissions: Object.values(EXTENSION_HOSTS).map((host) => `${host.origin}/*`),
	// The user can open the welcome page again here.
	options_ui: { page: "welcome.html", open_in_tab: true },
	content_scripts: [{ matches: origins.map((origin) => `${origin}/*`), js: ["content.js"], run_at: "document_start" }],
};

const targets = {
	chrome: { ...manifest, background: { service_worker: "background.js" } },
	firefox: {
		...manifest,
		background: { scripts: ["background.js"] },
		browser_specific_settings: {
			gecko: { id: "trgo@omarzunic.com", strict_min_version: "140.0", data_collection_permissions: { required: ["none"] } },
		},
	},
};

await Bun.$`rm -rf ${root}dist`;
const built = await Bun.build({
	entrypoints: [`${root}src/background.ts`, `${root}src/content.ts`, `${root}src/welcome.ts`],
	outdir: `${root}dist/chrome`,
	target: "browser",
	format: "iife",
	minify: false,
	define: { __DEV_ORIGINS__: JSON.stringify(dev ? DEV_ORIGINS : []) },
});
if (!built.success) throw new Error(built.logs.join("\n"));

await Bun.$`cp -r ${root}icons ${root}dist/chrome/icons`;
await Bun.$`cp ${root}src/welcome.html ${root}dist/chrome/welcome.html`;
for (const [name, content] of Object.entries(targets)) {
	const dir = `${root}dist/${name}`;
	if (name !== "chrome") await Bun.$`cp -r ${root}dist/chrome ${dir}`;
	await Bun.write(`${dir}/manifest.json`, `${JSON.stringify(content, null, "\t")}\n`);
	await Bun.$`zip -qr ${root}dist/trgo-${name}-${version}.zip .`.cwd(dir);
	console.log(`dist/trgo-${name}-${version}.zip`);
}
