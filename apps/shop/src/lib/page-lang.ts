import { lang } from "./lang";
import { strings } from "./strings";

// The server renders the Bosnian head. The client swaps in the chosen language after it hydrates.
export function applyPageLang() {
	document.documentElement.lang = lang;
	document.title = strings.pageTitle;
	document.querySelector('meta[name="description"]')?.setAttribute("content", strings.pageDescription);
}
