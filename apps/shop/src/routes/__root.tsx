import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { SidePanelProvider } from "@/components/shell/side-panel";
import { strings } from "@/lib/strings";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			// resizes-content keeps the composer above the phone keyboard.
			{ name: "viewport", content: "width=device-width, initial-scale=1, interactive-widget=resizes-content" },
			{ name: "color-scheme", content: "dark" },
			{ name: "theme-color", content: "#0E1020" },
			{ title: strings.pageTitle },
			{ name: "description", content: strings.pageDescription },
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
		],
	}),
	component: () => (
		<html lang="bs">
			<head>
				<HeadContent />
			</head>
			<body>
				<SidePanelProvider>
					<Outlet />
				</SidePanelProvider>
				<Scripts />
			</body>
		</html>
	),
});
