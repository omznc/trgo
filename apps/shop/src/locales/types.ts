import type { Details } from "@/components/detail/strings-detail";
import type { Strings } from "@/lib/strings";
import type { Account } from "@/lib/strings-account";
import type { Sell } from "@/lib/strings-sell";

// The text of one UI language. Bosnian and English stay in the string files. The other languages live in this folder.
export type Locale = {
	strings: Strings;
	sell: Sell;
	account: Account;
	detail: Details;
	suggestions: {
		// "Npr." before the placeholder text.
		eg: string;
		// The first words of a search text, for example "Nađi ". The placeholder cuts them.
		find: RegExp;
		// The English text of each suggestion in POOL, mapped to its translation. An amount stays as "<n> KM".
		items: Record<string, string>;
	};
};
