import {
	createOlxProvider,
	createSvexProvider,
	OLX_SHIPPING_NOTE,
	olxListingUrl,
	providersWith,
	svexListingUrl,
	type Capability,
	type NamedId,
	type OlxListingInput,
	type OlxSession,
	type Provider,
	type ProviderId,
	type SvexSession,
	type SvexCondition,
} from "@lagano/providers";
import { expireSession, getSession, isAuthError } from "./sessions";
import { getPhoto } from "./photos";
import { outcomeUnknown, savedTrack, type Track, trackOf } from "./publish-resume";
import { strings } from "./strings";
import { sell } from "./strings-sell";

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

// A failed result keeps the id of the draft or listing that exists (listingId, slug), and the photos sent to it.
// "unknown" means the post may have worked, so the user must check My listings.
export type ProviderResult = {
	provider: ProviderId;
	ok: boolean;
	url?: string;
	error?: string;
	notes?: string[];
	unknown?: boolean;
	listingId?: string;
	slug?: string;
	uploaded?: number;
};
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

// A new provider fails the typecheck here until its client exists.
const ACCOUNTS: Record<ProviderId, Provider> = { olx: olxAccount, svex: svexAccount };
export const accountsWith = (capability: Capability): Provider[] => providersWith(capability).map((id) => ACCOUNTS[id]);

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

// Photos are read one by one, only when a step uploads them. A resume that sends nothing needs none.
function blobOf(id: string): Blob {
	const photo = getPhoto(id);
	if (!photo) throw new AskUser(`Photo ${id} is not in the browser. Ask the user to attach it again.`);
	return photo.blob;
}

async function createOlxDraft(session: OlxSession, args: ListingArgs): Promise<number> {
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
	return (await olx.createDraft(session, input)).id;
}

// Without a saved id this makes a draft. With one, it goes on with the photos that are still missing.
export async function* publishOlx(args: ListingArgs, track: Track): Step {
	const session = getSession("olx");
	if (!session) throw new Error(strings.notConnected);
	// Check the photos that are still to send, before a draft exists.
	args.photoIds.slice(track.uploaded).forEach(blobOf);
	if (!track.id) {
		yield strings.progressPrepare;
		track.id = String(await createOlxDraft(session, args));
		track.stage = "photos";
	}
	const id = Number(track.id);
	for (const [i, photoId] of args.photoIds.entries()) {
		if (i < track.uploaded) continue;
		yield strings.progressPhotos(i + 1, args.photoIds.length);
		await olx.uploadImages(session, id, [blobOf(photoId)]);
		track.uploaded = i + 1;
	}
	yield strings.progressPublish;
	track.stage = "publish";
	await olx.publish(session, id);
	return { provider: "olx", ok: true, url: olxListingUrl(id), notes: [OLX_SHIPPING_NOTE] };
}

type SvexCreated = { id: string; slug: string };

async function* createSvexListing(session: SvexSession, args: ListingArgs): AsyncGenerator<string, SvexCreated> {
	yield strings.progressPrepare;
	const [categories, cities] = await Promise.all([svex.categories() as Promise<SvexCategory[]>, svex.cities()]);
	const category = pickByName(categories.filter((c) => c.isLeaf), args.categoryHint, "SVEX category");
	const city = pickCity(cities, args.city);
	const media = [];
	for (const [i, photoId] of args.photoIds.entries()) {
		yield strings.progressPhotos(i + 1, args.photoIds.length);
		media.push(await svex.uploadPhoto(session, blobOf(photoId), `photo-${i + 1}.jpg`));
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
	return created;
}

// Without a saved id this uploads the photos and makes an unpublished listing. With one, it only publishes.
export async function* publishSvex(args: ListingArgs, track: Track): Step {
	const session = getSession("svex");
	if (!session) throw new Error(strings.notConnected);
	if (!track.id) {
		const created = yield* createSvexListing(session, args);
		[track.id, track.slug] = [created.id, created.slug];
	}
	yield strings.progressPublish;
	track.stage = "publish";
	await svex.publishListing(session, track.id);
	return { provider: "svex", ok: true, url: svexListingUrl(track.id, track.slug ?? "") };
}

function failure(provider: ProviderId, error: unknown, track: Track): ProviderResult {
	const base = { provider, ok: false, ...savedTrack(track) };
	if (error instanceof AskUser) return { ...base, error: error.message };
	if (outcomeUnknown(error, track)) return { ...base, unknown: true, error: sell.partial.unknown };
	if (isAuthError(error)) {
		expireSession(provider);
		return { ...base, error: strings.sessionExpired };
	}
	return { ...base, error: error instanceof Error ? error.message.slice(0, 300) : "Unknown error." };
}

const STEPS: Record<ProviderId, (args: ListingArgs, track: Track) => Step> = { olx: publishOlx, svex: publishSvex };

// Runs after the user approved. Providers run one after the other, so progress is easy to show.
// `previous` holds failed results of an earlier run. A provider with a saved id goes on from it and never makes a second listing.
export async function* publishListing(args: ListingArgs, previous: ProviderResult[] = []): AsyncGenerator<PublishOutput> {
	const results: ProviderResult[] = [];
	for (const provider of args.providers) {
		const track = trackOf(previous.find((r) => r.provider === provider));
		try {
			const step = STEPS[provider](args, track);
			for (let next = await step.next(); ; next = await step.next()) {
				if (next.done) {
					results.push(next.value);
					break;
				}
				yield { done: false, progress: { [provider]: next.value }, results: [...results] };
			}
		} catch (error) {
			results.push(failure(provider, error, track));
		}
	}
	yield { done: true, results };
}
