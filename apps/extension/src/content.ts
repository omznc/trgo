// Runs on the trgo page only. It passes requests to the background worker and sends back the reply.
import { api } from "./api";
import { acceptPageMessage, failure, HELLO, isExtResponse, respond } from "./protocol";

const version = api.runtime.getManifest().version;
document.documentElement.dataset.trgoExtension = version;
window.postMessage({ type: HELLO, version }, location.origin);

window.addEventListener("message", async (event) => {
	const request = acceptPageMessage(event, window, location.origin);
	if (!request) return;
	// After an update, this old script throws at the call itself. The page must still get a reply, or it waits 25 s.
	const reply = await Promise.resolve()
		.then(() => api.runtime.sendMessage(request))
		.catch(() => null);
	// Never "*": only this page gets the reply.
	window.postMessage(isExtResponse(reply) ? reply : respond(request.id, failure(502, "extension unavailable")), location.origin);
});
