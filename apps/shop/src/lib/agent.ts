import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { PROVIDER_IDS, PROVIDERS, providersWith, searchAll, type Listing, type ProviderId } from "@lagano/providers";
import { APICallError, DirectChatTransport, hasToolCall, isStepCount, type InferUITools, type UIMessage, ToolLoopAgent, tool } from "ai";
import { z } from "zod";
import type { TaggedListing } from "@/components/shell/tagged-listing";
import { loadMine, mineCall } from "./mine-api";
import { EDIT_OPS, editProblem } from "./mine-rules";
import { priceCheckSchema, runPriceCheck, summarize } from "./price-check";
import { type SearchCard, type SearchToolOutput, summarizeSearch } from "./search-summary";
import { accountsWith, proxyUrl, publishListing } from "./publish";
import { expireSession, getSession, isAuthError } from "./sessions";
import { lang } from "./lang";
import { buildSystemPrompt, PRICE_UNIT, SITES, SITES_OR } from "./system-prompt";
import { strings } from "./strings";
import { knownModelName } from "./openrouter-models";

const DEFAULT_LIMIT = 50;
const MAX_MINE = 30;

const searchSchema = z.object({
	q: z.string().describe("Search words, for example 'ender 3 printer'."),
	minPrice: z.number().optional().describe(`Lowest price in ${PRICE_UNIT}.`),
	maxPrice: z.number().optional().describe(`Highest price in ${PRICE_UNIT}.`),
	condition: z.enum(["new", "used"]).optional(),
	sort: z.enum(["relevance", "price_asc", "price_desc", "newest"]).optional(),
	limit: z.number().int().min(1).max(100).optional().describe("Results per provider. Default 50. The user sees all of them."),
	days: z.number().int().min(1).max(365).optional().describe("Keep only listings posted in the last N days, for example 90 for 3 months. Listings without a date are dropped."),
});

const createListingSchema = z.object({
	providers: z.array(z.enum(PROVIDER_IDS)).min(1).describe("Where to post."),
	title: z.string().min(8).describe("At least 8 characters."),
	description: z.string().max(8000).describe("Plain text. New lines are allowed."),
	price: z.number().positive().describe(`Price in ${PRICE_UNIT}.`),
	condition: z.enum(["new", "used"]),
	grade: z
		.enum(["new_sealed", "new_open", "used_excellent", "used_good", "used_fair", "defective"])
		.optional()
		.describe("SVEX only. A finer condition. It must match the condition."),
	categoryHint: z.string().describe("Words that name the category, for example 'fdm 3d printer'."),
	city: z.string().describe("City name, for example 'Livno'."),
	freeShipping: z.boolean().optional().describe("SVEX only. OLX has no delivery field."),
	photoIds: z.array(z.string()).min(1).describe("Photo ids from the user message. The first is the cover."),
	olxAttributes: z
		.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
		.optional()
		.describe("OLX required attributes by display name. Use it after a tool error names one."),
});

export const editSchema = z
	.object({
		provider: z.enum(PROVIDER_IDS),
		id: z.string().min(1).max(64).describe("The listing id from the [Tagged listing] note."),
		action: z.enum(["set_price", "hide", "unhide", "mark_sold", "refresh"]),
		price: z.number().positive().optional().describe(`New price in ${PRICE_UNIT}. Needed for set_price.`),
	})
	// The OLX calls do Number(id), so an id with other characters must stop here.
	.refine((v) => v.provider !== "olx" || /^\d+$/.test(v.id), { message: "An OLX id has digits only.", path: ["id"] });

const toCard = (l: Listing): SearchCard => ({
	provider: l.provider,
	id: l.id,
	title: l.title,
	price: l.priceText,
	value: l.price,
	city: l.city,
	url: l.url,
	imageUrl: l.imageUrl,
	condition: l.condition,
	postedAt: l.postedAt,
});

const DAY_MS = 86_400_000;

async function searchListings({ days, ...query }: z.infer<typeof searchSchema>, signal?: AbortSignal): Promise<SearchToolOutput> {
	// A period filter needs the newest first and a deeper page.
	const limit = query.limit ?? (days ? 100 : DEFAULT_LIMIT);
	const { listings, total, errors } = await searchAll(accountsWith("search"), { ...query, limit, signal, ...(days && { sort: "newest" as const }) });
	const now = Date.now();
	const kept = days ? listings.filter((l) => now - Date.parse(l.postedAt ?? "") <= days * DAY_MS) : listings;
	return { total, errors, days, listings: kept.map(toCard) };
}

async function listMine(): Promise<SearchToolOutput & { error?: string }> {
	const connected = providersWith("mine").filter((p) => getSession(p));
	if (!connected.length) return { total: 0, listings: [], errors: [], error: strings.notConnected };
	// loadMine clears an expired session and keeps the list of the other provider.
	const { items, errors } = await loadMine(connected);
	const failed = Object.keys(errors) as ProviderId[];
	const expired = failed.some((p) => errors[p] === "expired");
	const error = expired ? strings.sessionExpired : failed.length ? strings.providerFailed(failed.map((p) => PROVIDERS[p].name).join(", ")) : undefined;
	const active = items.filter((l) => l.status === "active");
	return { total: active.length, listings: active.slice(0, MAX_MINE).map(toCard), errors: failed.map((provider) => ({ provider })), error };
}

// The id and the action must match the user's real listing, whatever the model wrote.
export async function editMine({ provider, id, action, price }: z.infer<typeof editSchema>) {
	if (action === "set_price" && !price) throw new Error("set_price needs a price. Ask the user for the price.");
	const connected = !!getSession(provider);
	const { items, errors, truncated } = await loadMine([provider]);
	if (errors[provider]) throw new Error(`Could not load the ${PROVIDERS[provider].name} listings. Nothing was changed.`);
	const item = items.find((l) => l.provider === provider && l.id === id);
	const problem = editProblem(item, action, { connected, cut: truncated.includes(provider) });
	if (problem || !item) throw new Error(`Refused (${problem}): ${PROVIDERS[provider].name} ${id} cannot take ${action}. Nothing was changed.`);
	await mineCall(item, EDIT_OPS[action], price);
	return { ok: true as const };
}

const tools = {
	search_listings: tool({
		description: `Search used and new listings on ${SITES}. Prices are in ${PRICE_UNIT}.`,
		inputSchema: searchSchema,
		execute: (input, { abortSignal }) => searchListings(input, abortSignal),
		toModelOutput: ({ output }) => ({ type: "text", value: summarizeSearch(output) }),
	}),
	price_check: tool({
		description:
			`Show a price card for one item: what it is worth now. The app loads the newest listings from ${SITES}, ` +
			"removes accessories, bad prices and outliers, and computes the median and range. Pass only search words.",
		inputSchema: priceCheckSchema,
		async *execute(input, { abortSignal }) {
			yield* runPriceCheck(input, accountsWith("priceCheck"), abortSignal);
		},
		toModelOutput: ({ output }) => ({ type: "text", value: summarize(output) }),
	}),
	create_listing: tool({
		description:
			`Prepare a listing for ${SITES}. The user must approve it first. Prices are in ${PRICE_UNIT}. ` +
			"It posts after approval and returns a result per provider.",
		inputSchema: createListingSchema,
		// Runs only after the user approved the card.
		async *execute(args) {
			yield* publishListing(args);
		},
	}),
	edit_my_listing: tool({
		description:
			`Change one of the user's OWN listings on ${SITES_OR}: set the price, hide, unhide, mark as sold, or refresh. ` +
			"The user must approve first. Use the provider and id from the [Tagged listing] note. " +
			"It cannot change the title, the description or the photos. Tell the user to edit those on the site. " +
			"Give only the provider, the id, the action and the price. The app checks the listing in the user's account and refuses an id or an action that does not fit.",
		inputSchema: editSchema,
		execute: editMine,
	}),
	list_my_listings: tool({
		description:
			`List the active listings of the user's own accounts on ${SITES} (the connected ones). ` +
			"The user sees all of them as cards. You see a short summary.",
		inputSchema: z.object({}),
		execute: listMine,
		toModelOutput: ({ output }) => ({ type: "text", value: output.error && !output.listings.length ? output.error : summarizeSearch(output) }),
	}),
};

export type LaganoMessage = UIMessage<{ photoIds?: string[]; tagged?: TaggedListing[] | TaggedListing }, never, InferUITools<typeof tools>>;


// The free model runs through our proxy. The proxy picks the real model and the UI never names it.
export const FREE_MODEL_ID = "trgo/free";
export const isFreeModel = (id: string) => id === FREE_MODEL_ID;

export const MODELS = [
	FREE_MODEL_ID,
	"deepseek/deepseek-v4.1-flash-1017",
	"anthropic/claude-sonnet-5.5",
	"anthropic/claude-haiku-5.5",
	"qwen/qwen3.7-flash",
] as const;

const MODEL_LABELS: Record<string, string> = {
	[FREE_MODEL_ID]: lang === "en" ? "Free" : "Besplatno",
	"deepseek/deepseek-v4.1-flash-1017": "DeepSeek V4.1 Flash",
};
export const modelLabel = (id: string) => MODEL_LABELS[id] ?? knownModelName(id) ?? id.split("/").pop() ?? id;

function freeCode(error: APICallError) {
	const body = error.responseBody ?? "";
	if (error.statusCode === 503 && body.includes("free-unavailable")) return "free-down";
	if (error.statusCode === 413 && body.includes("free-too-long")) return "free-too-long";
	if (error.statusCode === 429 && body.includes("free-limit")) return body.includes('"day"') ? "free-day" : "free-minute";
	return null;
}

// The chat error is shown to the user, so only a short code leaves this layer.
function errorCode(error: unknown) {
	if (!APICallError.isInstance(error)) return "error";
	// The free route answers with a JSON code in the body.
	const free = freeCode(error);
	if (free) return free;
	// OpenRouter answers 400 "... is not a valid model ID" for an unknown model.
	if (error.statusCode === 400 && /model/i.test(error.message)) return "404";
	return String(error.statusCode ?? "error");
}

// Built per send, so the latest key and model are used. Runs only in the browser.
export function createTransport(apiKey: string | null, model: string) {
	// The proxy ignores the placeholder key. It sends its own key.
	const openrouter = isFreeModel(model)
		? createOpenRouter({ apiKey: "free", baseURL: `${proxyUrl}/ai` })
		: createOpenRouter({
				apiKey: apiKey ?? "",
				headers: { "HTTP-Referer": location.origin, "X-OpenRouter-Title": "trgo" },
			});
	const agent = new ToolLoopAgent({
		model: openrouter(model),
		instructions: buildSystemPrompt(lang),
		tools,
		// The price card is the whole answer, so no text follows it.
		stopWhen: [isStepCount(8), hasToolCall("price_check")],
		// A retry would spend more of the free limit. Our own limit answers 429.
		...(isFreeModel(model) && { maxRetries: 0 }),
		toolApproval: { create_listing: "user-approval", edit_my_listing: "user-approval" },
	});
	return new DirectChatTransport<never, typeof tools>({ agent, onError: errorCode });
}
