import {
	createOlxProvider,
	createSvexProvider,
	OLX_SHIPPING_NOTE,
	olxListingUrl,
	svexListingUrl,
	type NamedId,
	type OlxListingInput,
	type ProviderId,
	type SvexCondition,
} from "@lagano/providers";
import { expireSession, getSession, isAuthError } from "./sessions";
import { getPhoto } from "./photos";
import { strings } from "./strings";

export type ListingArgs = {
	providers: ProviderId[];
	title: string;
	description: string;
	price: number;
	condition: "new" | "used";
	grade?: SvexCondition;
	categoryHint: string;
	city: string;
	freeShipping?: boolean;
	photoIds: string[];
	olxAttributes?: Record<string, string | number | boolean>;
};

export type ProviderResult = { provider: ProviderId; ok: boolean; url?: string; error?: string; notes?: string[] };
export type PublishProgress = { done: false; progress: Partial<Record<ProviderId, string>>; results: ProviderResult[] };
export type PublishOutput = { done: true; results: ProviderResult[] } | PublishProgress;

type Step = AsyncGenerator<string, ProviderResult>;
type OlxAttribute = {
	id: number;
	name: string;
	display_name?: string;
	input_type: string;
	options?: string[];
	required?: boolean;
};
type SvexCategory = NamedId & { isLeaf?: boolean };

export const proxyUrl = import.meta.env.VITE_PROXY_URL ?? "http://localhost:8787";
export const olxAccount = createOlxProvider({ proxyUrl });
export const svexAccount = createSvexProvider({ proxyUrl });
const olx = olxAccount;
const svex = svexAccount;

class AskUser extends Error {}

const norm = (s: string) =>
	s
		.toLowerCase()
		.replaceAll("đ", "d")
		.normalize("NFD")
		.replace(/\p{M}/gu, "");

// Exact name wins. Otherwise count hint words found in the name.
function score(name: string, hint: string) {
	const n = norm(name);
	const h = norm(hint);
	if (n === h) return 100;
	return h.split(/\s+/).filter((w) => w.length >= 3 && n.includes(w)).length;
}

function pickByName<T extends NamedId<string | number>>(items: T[], hint: string, what: string): T {
	const ranked = items
		.map((item) => ({ item, s: score(item.name, hint) }))
		.filter((r) => r.s > 0)
		.sort((a, b) => b.s - a.s);
	const [top, second] = ranked;
	if (!top || second?.s === top.s) {
		const names = ranked.slice(0, 5).map((r) => r.item.name);
		const list = names.length ? ` Candidates: ${names.join("; ")}.` : "";
		throw new AskUser(`Could not pick the ${what} for "${hint}".${list} Ask the user, then call the tool again.`);
	}
	return top.item;
}

function pickCity<T extends NamedId<string | number>>(cities: T[], name: string): T {
	const n = norm(name.trim());
	const found = cities.find((c) => norm(c.name) === n) ?? cities.find((c) => norm(c.name).startsWith(n));
	if (!found) throw new AskUser(`Unknown city "${name}". Ask the user for the city name.`);
	return found;
}

function missingAttribute(attr: OlxAttribute) {
	const options = attr.options?.length ? ` Options: ${attr.options.join("; ")}.` : "";
	const label = attr.display_name ?? attr.name;
	return new AskUser(`The OLX attribute "${label}" is required.${options} Ask the user, then pass it in olxAttributes.`);
}

function fillAttributes(attrs: OlxAttribute[], args: ListingArgs): NonNullable<OlxListingInput["attributes"]> {
	const text = norm(`${args.title} ${args.categoryHint}`);
	return attrs
		.filter((a) => a.required)
		.map((attr) => {
			const given = args.olxAttributes?.[attr.display_name ?? attr.name] ?? args.olxAttributes?.[attr.name];
			const value = given ?? attr.options?.find((o) => text.includes(norm(o)));
			if (value === undefined) throw missingAttribute(attr);
			return { id: attr.id, value };
		});
}

const blobsOf = (ids: string[]) =>
	ids.map((id) => {
		const photo = getPhoto(id);
		if (!photo) throw new AskUser(`Photo ${id} is not in the browser. Ask the user to attach it again.`);
		return photo.blob;
	});

async function* publishOlx(args: ListingArgs, blobs: Blob[]): Step {
	const session = getSession("olx");
	if (!session) throw new Error(strings.notConnected);
	yield strings.progressPrepare;
	const [cities, suggestions] = await Promise.all([olx.cities(), olx.suggestCategory(args.categoryHint)]);
	// OLX ranks its own suggestions, so the first one is the best guess.
	const category = suggestions[0];
	if (!category) throw new AskUser(`OLX has no category for "${args.categoryHint}". Ask the user for other words.`);
	const attrs = await olx.categoryAttributes(category.id);
	const input: OlxListingInput = {
		title: args.title,
		description: args.description,
		category_id: category.id,
		city_id: pickCity(cities, args.city).id,
		price: args.price,
		state: args.condition,
		attributes: fillAttributes(attrs as OlxAttribute[], args),
	};
	const draft = await olx.createDraft(session, input);
	for (const [i, blob] of blobs.entries()) {
		yield strings.progressPhotos(i + 1, blobs.length);
		await olx.uploadImages(session, draft.id, [blob]);
	}
	yield strings.progressPublish;
	await olx.publish(session, draft.id);
	return { provider: "olx", ok: true, url: olxListingUrl(draft.id), notes: [OLX_SHIPPING_NOTE] };
}

async function* publishSvex(args: ListingArgs, blobs: Blob[]): Step {
	const session = getSession("svex");
	if (!session) throw new Error(strings.notConnected);
	yield strings.progressPrepare;
	const [categories, cities] = await Promise.all([svex.categories() as Promise<SvexCategory[]>, svex.cities()]);
	const category = pickByName(categories.filter((c) => c.isLeaf), args.categoryHint, "SVEX category");
	const city = pickCity(cities, args.city);
	const media = [];
	for (const [i, blob] of blobs.entries()) {
		yield strings.progressPhotos(i + 1, blobs.length);
		media.push(await svex.uploadPhoto(session, blob, `photo-${i + 1}.jpg`));
	}
	yield strings.progressPublish;
	const free = args.freeShipping ?? false;
	const created = await svex.createListing(
		session,
		{
			title: args.title,
			description: args.description,
			categoryId: category.id,
			price: args.price,
			condition: args.grade ?? (args.condition === "new" ? "new_sealed" : "used_good"),
			cityId: city.id,
			media,
			...(free ? { deliveryShipping: true, deliveryPrice: 0, deliveryPickup: true } : {}),
		},
		{ publish: false },
	);
	await svex.publishListing(session, created.id);
	return { provider: "svex", ok: true, url: svexListingUrl(created.id, created.slug) };
}

function failure(provider: ProviderId, error: unknown): ProviderResult {
	if (error instanceof AskUser) return { provider, ok: false, error: error.message };
	if (isAuthError(error)) {
		expireSession(provider);
		return { provider, ok: false, error: strings.sessionExpired };
	}
	return { provider, ok: false, error: error instanceof Error ? error.message.slice(0, 300) : "Unknown error." };
}

const STEPS = { olx: publishOlx, svex: publishSvex } as const;

// Runs after the user approved. Providers run one after the other, so progress is easy to show.
export async function* publishListing(args: ListingArgs): AsyncGenerator<PublishOutput> {
	const results: ProviderResult[] = [];
	for (const provider of args.providers) {
		try {
			const step = STEPS[provider](args, blobsOf(args.photoIds));
			for (let next = await step.next(); ; next = await step.next()) {
				if (next.done) {
					results.push(next.value);
					break;
				}
				yield { done: false, progress: { [provider]: next.value }, results: [...results] };
			}
		} catch (error) {
			results.push(failure(provider, error));
		}
	}
	yield { done: true, results };
}
