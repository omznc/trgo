// Tool description for the model. Parameter names match SearchQuery.
export const searchListingsTool = {
	name: "search_listings",
	description:
		"Search used and new item listings on OLX.ba and SVEX.ba. Prices are in BAM (KM). " +
		"Returns a merged list with title, price, city, image and link.",
	parameters: {
		type: "object",
		properties: {
			q: { type: "string", description: "Search words, for example 'ender 3 printer'." },
			minPrice: { type: "number", description: "Lowest price in BAM." },
			maxPrice: { type: "number", description: "Highest price in BAM." },
			condition: { type: "string", enum: ["new", "used"] },
			sort: { type: "string", enum: ["relevance", "price_asc", "price_desc", "newest"] },
			limit: { type: "integer", minimum: 1, maximum: 50, description: "Results per provider. Default 20." },
		},
		required: ["q"],
	},
} as const;

export const createListingTool = {
	name: "create_listing",
	description:
		"Create a listing on OLX.ba or SVEX.ba from the user's item. The user must approve it first. " +
		"Prices are in BAM (KM). Photos come from the UI as ids.",
	parameters: {
		type: "object",
		properties: {
			provider: { type: "string", enum: ["olx", "svex"] },
			title: { type: "string", description: "At least 8 characters." },
			description: { type: "string", description: "Plain text. New lines are allowed. Maximum 8000 characters." },
			price: { type: "number", description: "Price in BAM." },
			condition: { type: "string", enum: ["new", "used"] },
			grade: {
				type: "string",
				enum: ["new_sealed", "new_open", "used_excellent", "used_good", "used_fair", "defective"],
				description: "SVEX only. A finer condition. It must match the condition.",
			},
			categoryHint: { type: "string", description: "Words that name the category, for example 'fdm 3d printer'." },
			city: { type: "string", description: "City name, for example 'Livno'." },
			freeShipping: { type: "boolean", description: "SVEX only. OLX has no shipping field." },
			photoIds: { type: "array", items: { type: "string" }, description: "Photo ids from the UI." },
		},
		required: ["provider", "title", "description", "price", "condition", "categoryHint", "city", "photoIds"],
	},
} as const;

export const listMyListingsTool = {
	name: "list_my_listings",
	description: "List the active listings of the user's account. Only OLX.ba is supported.",
	parameters: {
		type: "object",
		properties: { provider: { type: "string", enum: ["olx"] } },
		required: ["provider"],
	},
} as const;
