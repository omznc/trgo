// The page that asks for the host permissions. Firefox does not grant them at install.
import { api } from "./api";

const manifest = api.runtime.getManifest();
const sites = manifest.host_permissions ?? [];
// Firefox also needs access to the trgo pages, or it does not run the content script there.
const origins = [...sites, ...(manifest.content_scripts?.flatMap((script) => script.matches ?? []) ?? [])];
const button = document.getElementById("allow") as HTMLButtonElement;
const status = document.getElementById("status") as HTMLElement;

for (const origin of sites) {
	const item = document.createElement("li");
	item.textContent = new URL(origin.replace("/*", "")).hostname;
	document.getElementById("sites")?.append(item);
}

async function refresh() {
	const ready = await api.permissions.contains({ origins });
	button.hidden = ready;
	status.textContent = ready ? "Ready" : "";
}

// permissions.request needs the click gesture, so it runs straight in the handler.
button.addEventListener("click", () => {
	void api.permissions.request({ origins }).then(refresh, refresh);
});
void refresh();
