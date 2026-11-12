import { idsWith, PROVIDERS, type Table } from "@lagano/providers";

// The providers that each tool may reach. Search and price check follow the market selection.
// Publish, edit and list follow only the capability, so a search-only provider can never reach them.
export function toolProviders(selected: readonly string[], table: Table = PROVIDERS) {
	return {
		search: idsWith(table, "search", selected),
		priceCheck: idsWith(table, "priceCheck", selected),
		publish: idsWith(table, "publish"),
		edit: idsWith(table, "edit"),
		mine: idsWith(table, "mine"),
	};
}
export type ToolProviders = ReturnType<typeof toolProviders>;

// z.enum needs a tuple with one item or more.
export const nonEmpty = <T>(items: readonly T[]): [T, ...T[]] | null => (items.length ? (items as [T, ...T[]]) : null);

// The tools that exist for a plan. A tool with no provider is left out.
export function toolNames(plan: ToolProviders) {
	return [
		plan.search.length && "search_listings",
		plan.priceCheck.length && "price_check",
		plan.publish.length && "create_listing",
		plan.edit.length && "edit_my_listing",
		plan.mine.length && "list_my_listings",
	].filter((name): name is string => !!name);
}
