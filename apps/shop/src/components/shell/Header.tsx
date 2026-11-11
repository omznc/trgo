import { ChevronDown, Layers, Pencil, Settings, UserRound } from "lucide-react";
import { Mascot } from "@/components/Mascot";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { isFreeModel, MODELS, modelLabel } from "@/lib/agent";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { delay } from "./EmptyState";
import { useSidePanel } from "./side-panel";

export type Connections = { openrouter: boolean; olx: boolean; svex: boolean };

const shortModel = (id: string) => modelLabel(id).split("/").pop() ?? id;

export function ModelButton({
	model,
	connected,
	onChange,
	className,
}: {
	model: string;
	connected: boolean;
	onChange: (m: string) => void;
	className?: string;
}) {
	const panel = useSidePanel();
	const list = (MODELS as readonly string[]).includes(model) ? MODELS : [model, ...MODELS];
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label={`${strings.modelLabel}: ${shortModel(model)}`}
					className={cn("animate-in fade-in duration-300 inline-flex items-center gap-1 rounded-full px-2.5 text-[13px] font-medium text-fg-3", className)}
				>
					<span className="max-w-[6.5rem] truncate sm:max-w-[10rem]">{shortModel(model)}</span>
					<ChevronDown className="size-3.5 shrink-0" aria-hidden />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="solid min-w-56 rounded-2xl p-1.5">
				<DropdownMenuRadioGroup value={model} onValueChange={onChange}>
					{list.map((m) => {
	const locked = !connected && !isFreeModel(m);
	return (
						<DropdownMenuRadioItem key={m} value={m} disabled={locked} className="min-h-10 rounded-xl text-sm">
							{shortModel(m)}
							{locked && <span className="ml-2 text-xs text-fg-4">{strings.modelNeedsConnect}</span>}
						</DropdownMenuRadioItem>
					);
				})}
				</DropdownMenuRadioGroup>
				<DropdownMenuItem className="min-h-10 rounded-xl pl-8 text-sm" onSelect={() => (connected ? panel.open({ kind: "settings" }, { fresh: true }) : panel.requireConnection("openrouter", strings.needConnect.openrouter))}>
					{strings.otherModelMenu}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

type Provider = "openrouter" | "olx" | "svex";
const PROVIDER_NAMES: Record<Provider, string> = { openrouter: "OpenRouter", olx: "OLX", svex: "SVEX" };

// The state is in the accessible name, not in visible text.
function Dot({ provider, on, onOpen }: { provider: Provider; on: boolean; onOpen: (p: Provider) => void }) {
	const name = PROVIDER_NAMES[provider];
	return (
		<button
			type="button"
			onClick={() => onOpen(provider)}
			aria-label={`${name}${on ? strings.connectedNote : strings.notConnectedNote}`}
			className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-fg hover:bg-white/10"
		>
			<span aria-hidden className={cn("size-2 shrink-0 rounded-full", on ? "bg-ok" : "bg-off")} />
			<span className="max-sm:sr-only">{name}</span>
		</button>
	);
}

function StatusChip({ c, onOpen }: { c: Connections; onOpen: (p: Provider) => void }) {
	return (
		<div
			role="group"
			aria-label={strings.statusLabel}
			className="chip inline-flex h-10 items-center gap-0.5 rounded-full p-1 text-[13px] font-medium max-sm:hidden"
		>
			{(["openrouter", "olx", "svex"] as const).map((p) => (
				<Dot key={p} provider={p} on={c[p]} onOpen={onOpen} />
			))}
		</div>
	);
}

// Phone: one account button. The badge is green for all, accent for some, gray for none.
function AccountButton({ c, onOpen }: { c: Connections; onOpen: () => void }) {
	const count = Object.values(c).filter(Boolean).length;
	const tone = count === 3 ? "bg-ok" : count > 0 ? "bg-accent" : "bg-off";
	return (
		<button
			type="button"
			onClick={onOpen}
			aria-label={`${strings.statusLabel}: ${count}/3`}
			title={strings.statusLabel}
			className="chip relative grid size-11 place-items-center rounded-full text-fg sm:hidden"
		>
			<UserRound className="size-[17px]" strokeWidth={2.2} aria-hidden />
			<span aria-hidden className={cn("absolute top-2 right-2 size-2.5 rounded-full ring-2 ring-bg", tone)} />
		</button>
	);
}

const pill = "inline-flex h-10 min-h-10 items-center gap-[7px] whitespace-nowrap rounded-full text-sm font-medium tracking-[-0.01em]";

export function Header({
	started,
	connections,
	model,
	onModel,
	onNewChat,
}: {
	started: boolean;
	connections: Connections;
	model: string;
	onModel: (m: string) => void;
	onNewChat: () => void;
}) {
	const panel = useSidePanel();
	const openProvider = (p: Provider) =>
		connections[p] ? panel.open({ kind: "connect", provider: p }, { fresh: true }) : panel.requireConnection(p, strings.needConnect[p]);
	const toggleMine = () => {
		if (panel.view?.kind === "my-listings") return panel.close();
		if (!connections.olx) return panel.requireConnection("olx", strings.needMine);
		panel.open({ kind: "my-listings" }, { fresh: true });
	};
	return (
		<header
			style={delay(280)}
			className={cn(
				"ld relative z-[5] flex shrink-0 items-center justify-between gap-3 px-3 py-2.5 sm:px-6",
				started && "glass rounded-none border-x-0 border-t-0 shadow-none",
			)}
		>
			<div className="flex items-center gap-2.5">
				<button type="button" onClick={onNewChat} aria-label={strings.home} className="grid size-11 place-items-center">
					<Mascot mood="calm" width={30} />
				</button>
				<button
					type="button"
					onClick={onNewChat}
					aria-label={strings.newChat}
					title={strings.newChat}
					className={cn(pill, "chip justify-center px-0 text-fg max-sm:hidden sm:max-[1099px]:w-10 min-[1100px]:pr-4 min-[1100px]:pl-[13px]")}
				>
					<Pencil className="size-[15px]" strokeWidth={2.2} aria-hidden />
					<span className="max-[1099px]:sr-only">{strings.newChat}</span>
				</button>
			</div>
			<div className="flex min-w-0 items-center gap-1 sm:gap-2">
				<StatusChip c={connections} onOpen={openProvider} />
				<AccountButton c={connections} onOpen={() => panel.open({ kind: "connect" }, { fresh: true })} />
				<ModelButton model={model} connected={connections.openrouter} onChange={onModel} className="h-10 max-[899px]:hidden" />
				<button
					type="button"
					onClick={toggleMine}
					aria-pressed={panel.view?.kind === "my-listings"}
					aria-label={strings.myListings}
					title={strings.myListings}
					className={cn(pill, "justify-center px-0 text-fg-3 max-sm:size-11 sm:max-[1099px]:w-10 min-[1100px]:pr-4 min-[1100px]:pl-[13px]")}
				>
					<Layers className="size-[15px]" strokeWidth={2.2} aria-hidden />
					<span className="max-[1099px]:sr-only">{strings.myListings}</span>
				</button>
				<button
					type="button"
					onClick={() => (panel.view?.kind === "settings" ? panel.close() : panel.open({ kind: "settings" }, { fresh: true }))}
					aria-pressed={panel.view?.kind === "settings"}
					aria-label={strings.settings}
					className={cn(pill, "chip size-11 justify-center px-0 text-fg sm:size-10")}
				>
					<Settings className="size-[15px]" strokeWidth={2.2} aria-hidden />
				</button>
			</div>
		</header>
	);
}
