// The page that asks for the host permissions. Firefox does not grant them at install.
import { api } from "./api";
import { ALLOWED_ORIGINS } from "./protocol";

// The trgo pages are in the list too. The page shows only the marketplaces.
const origins = api.runtime.getManifest().host_permissions ?? [];
const sites = origins.filter((origin) => !ALLOWED_ORIGINS.some((page) => origin.startsWith(page)));
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
	void api.permissions.request({ origins }).then(refresh, () => {
		status.textContent = "The browser did not allow access. Try again, or allow the sites in the extension settings.";
	});
});
void refresh();
