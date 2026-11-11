import { Check } from "lucide-react";
import { useState } from "react";
import { type CatalogModel, useModelCatalog } from "@/lib/openrouter-models";
import { ta } from "@/lib/strings-account";
import { cn } from "@/lib/utils";

const MAX_SHOWN = 40;

function Row({ m, selected, onPick }: { m: CatalogModel; selected: boolean; onPick: (id: string) => void }) {
	const price = ta.modelPrice(m.input, m.output);
	return (
		<li>
			<button
				type="button"
				disabled={!m.tools}
				title={m.tools ? undefined : ta.modelNoToolsHint}
				onClick={() => onPick(m.id)}
				className={cn(
					"flex min-h-14 w-full items-center gap-3 border-0 bg-transparent px-4 py-2 text-left text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
					m.tools ? "cursor-pointer" : "cursor-not-allowed opacity-50",
				)}
			>
				<span className="min-w-0 grow">
					<span className="block truncate text-[15px]">
						{m.name}
						{!m.tools && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-fg-3">{ta.modelNoTools}</span>}
					</span>
					<span className="block truncate text-[12px] text-fg-4">{m.id}</span>
					{price && <span className="block text-[12px] text-fg-4">{price}</span>}
				</span>
				<span aria-hidden className="grid w-5 place-items-center">
					{selected && <Check size={18} strokeWidth={2.8} className="text-accent" />}
				</span>
			</button>
		</li>
	);
}

export function ModelPicker({ current, onPick }: { current: string; onPick: (id: string) => void }) {
	const [query, setQuery] = useState("");
	const { models, failed } = useModelCatalog(true);
	const q = query.trim().toLowerCase();
	const found = models?.filter((m) => !q || m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)) ?? [];
	return (
		<div className="border-t border-line">
			<div className="px-4 pt-3 pb-2">
				<input
					type="search"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder={ta.modelSearch}
					aria-label={ta.modelSearch}
					className="h-10 w-full rounded-xl border border-line bg-white/5 px-3 text-[15px] text-fg outline-none focus-visible:outline-2 focus-visible:outline-focus"
				/>
			</div>
			{failed && <p className="m-0 px-4 pb-3 text-[13px] text-fg-3">{ta.modelLoadFailed}</p>}
			{!models && !failed && <p className="m-0 px-4 pb-3 text-[13px] text-fg-3">{ta.modelLoading}</p>}
			{models && found.length === 0 && <p className="m-0 px-4 pb-3 text-[13px] text-fg-3">{ta.modelNone}</p>}
			<ul className="m-0 max-h-80 list-none overflow-y-auto p-0">
				{found.slice(0, MAX_SHOWN).map((m) => (
					<Row key={m.id} m={m} selected={m.id === current} onPick={onPick} />
				))}
			</ul>
		</div>
	);
}
