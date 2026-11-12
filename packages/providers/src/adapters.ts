import { createBolhaProvider } from "./bolha";
import { createKpProvider } from "./kp";
import { createNjuskaloProvider } from "./njuskalo";
import { createOlxProvider } from "./olx";
import { createOlxBgProvider } from "./olxbg";
import type { ProviderId } from "./registry";
import { createSvexProvider } from "./svex";
import type { Provider, ProviderOptions } from "./types";
import { createWillhabenProvider } from "./willhaben";

// Adapter factories by id. Code that loops over providers does not name them.
const FACTORIES = { olx: createOlxProvider, svex: createSvexProvider, kp: createKpProvider, njuskalo: createNjuskaloProvider, bolha: createBolhaProvider, olxbg: createOlxBgProvider, willhaben: createWillhabenProvider } satisfies Record<ProviderId, (options: ProviderOptions) => Provider>;

export const createProvider = <Id extends ProviderId>(id: Id, options: ProviderOptions): ReturnType<(typeof FACTORIES)[Id]> =>
	FACTORIES[id](options) as ReturnType<(typeof FACTORIES)[Id]>;
