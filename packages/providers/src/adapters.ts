import { createOlxProvider } from "./olx";
import type { ProviderId } from "./registry";
import { createSvexProvider } from "./svex";
import type { Provider, ProviderOptions } from "./types";

// Adapter factories by id. Code that loops over providers does not name them.
const FACTORIES = { olx: createOlxProvider, svex: createSvexProvider } satisfies Record<ProviderId, (options: ProviderOptions) => Provider>;

export const createProvider = <Id extends ProviderId>(id: Id, options: ProviderOptions): ReturnType<(typeof FACTORIES)[Id]> =>
	FACTORIES[id](options) as ReturnType<(typeof FACTORIES)[Id]>;
