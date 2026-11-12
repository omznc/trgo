// Firefox has "browser". Chrome has "chrome". Both give a Promise from sendMessage in MV3.
type Sender = { id?: string; url?: string };
type Origins = { origins: string[] };

type Api = {
	runtime: {
		id: string;
		getManifest(): { version: string; host_permissions?: string[] };
		getURL(path: string): string;
		sendMessage(message: unknown): Promise<unknown>;
		onMessage: {
			addListener(listener: (message: unknown, sender: Sender, sendResponse: (reply: unknown) => void) => boolean | undefined): void;
		};
		onInstalled: { addListener(listener: (details: { reason: string }) => void): void };
	};
	permissions: { contains(query: Origins): Promise<boolean>; request(query: Origins): Promise<boolean> };
	tabs: { create(options: { url: string }): Promise<unknown> };
};

const scope = globalThis as unknown as { browser?: Api; chrome?: Api };

export const api = (scope.browser ?? scope.chrome) as Api;
export type { Sender };
