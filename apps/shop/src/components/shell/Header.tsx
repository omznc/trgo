import { accountIds, PROVIDERS, providersWith } from "@lagano/providers";
import { ChevronDown, History, Layers, Pencil, Settings, UserRound } from "lucide-react";
import { Mascot } from "@/components/Mascot";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { isFreeModel, MODELS, modelLabel } from "@/lib/agent";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { delay } from "./EmptyState";
import { type ConnectTarget, useSidePanel } from "./side-panel";

export type Connections = Record<ConnectTarget, boolean>;

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
	const needKey = () => panel.requireConnection("openrouter", strings.needConnect.openrouter);
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
				<DropdownMenuRadioGroup value={model} onValueChange={(m) => (!connected && !isFreeModel(m) ? needKey() : onChange(m))}>
					{list.map((m) => {
	const locked = !connected && !isFreeModel(m);
	return (
						<DropdownMenuRadioItem key={m} value={m} aria-disabled={locked} className={cn("min-h-10 rounded-xl text-sm", locked && "opacity-60")}>
							{shortModel(m)}
							{locked && <span className="ml-2 text-xs text-fg-4">{strings.modelNeedsConnect}</span>}
						</DropdownMenuRadioItem>
					);
				})}
				</DropdownMenuRadioGroup>
				<DropdownMenuItem className={cn("min-h-10 rounded-xl pl-8 text-sm", !connected && "opacity-60")} onSelect={() => (connected ? panel.open({ kind: "settings" }, { fresh: true }) : needKey())}>
					{strings.otherModelMenu}
					{!connected && <span className="ml-2 text-xs text-fg-4">{strings.modelNeedsConnect}</span>}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

type Provider = ConnectTarget;
// A search-only provider has no account, so it gets no chip.
const CONNECT_TARGETS: Provider[] = ["openrouter", ...accountIds(PROVIDERS)];
const nameOf = (p: Provider) => (p === "openrouter" ? "OpenRouter" : PROVIDERS[p].name);

// The state is in the accessible name, not in visible text.
function Dot({ provider, on, onOpen }: { provider: Provider; on: boolean; onOpen: (p: Provider) => void }) {
	const name = nameOf(provider);
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
			{CONNECT_TARGETS.map((p) => (
				<Dot key={p} provider={p} on={c[p]} onOpen={onOpen} />
			))}
		</div>
	);
}

// Phone: one account button. The badge is green for all, accent for some, gray for none.
function AccountButton({ c, onOpen }: { c: Connections; onOpen: () => void }) {
	const count = CONNECT_TARGETS.filter((p) => c[p]).length;
	const tone = count === CONNECT_TARGETS.length ? "bg-ok" : count > 0 ? "bg-accent" : "bg-off";
	return (
		<button
			type="button"
			onClick={onOpen}
			aria-label={`${strings.statusLabel}: ${count}/${CONNECT_TARGETS.length}`}
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
	hasHistory,
}: {
	hasHistory: boolean;
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
		const mine = providersWith("mine");
		if (!mine.some((p) => connections[p])) return panel.requireConnection(mine[0]!, strings.needMine);
		panel.open({ kind: "my-listings" }, { fresh: true });
	};
	return (
		<header
			style={delay(280)}
			className={cn(
				// No bar: the controls float. Three columns keep the status chip in the center.
				"ld relative z-[22] grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 py-2.5 sm:px-6",
			)}
		>
			<div className="flex items-center gap-2.5">
				{hasHistory ? (
					<button
						type="button"
						onClick={() => (panel.history ? panel.closeHistory() : panel.openHistory())}
						aria-pressed={panel.history}
						aria-label={strings.history}
						title={strings.history}
						className={cn(pill, "chip size-11 cursor-pointer justify-center px-0 text-fg sm:size-10")}
					>
						<History className="size-[15px]" strokeWidth={2.2} aria-hidden />
					</button>
				) : (
					<button type="button" onClick={onNewChat} aria-label={strings.home} className="grid size-11 place-items-center">
						<Mascot mood="calm" width={30} />
					</button>
				)}
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
			<StatusChip c={connections} onOpen={openProvider} />
			<div className="col-start-3 flex min-w-0 items-center justify-self-end gap-1 sm:gap-2">
				<AccountButton c={connections} onOpen={() => panel.open({ kind: "connect" }, { fresh: true })} />
				<ModelButton model={model} connected={connections.openrouter} onChange={onModel} className="chip h-10 cursor-pointer px-3.5 text-fg max-[899px]:hidden" />
				{providersWith("mine").length > 0 && (
					<button
						type="button"
						onClick={toggleMine}
						aria-pressed={panel.view?.kind === "my-listings"}
						aria-label={strings.myListings}
						title={strings.myListings}
						className={cn(pill, "chip cursor-pointer justify-center px-0 text-fg max-sm:size-11 sm:max-[1099px]:w-10 min-[1100px]:pr-4 min-[1100px]:pl-[13px]")}
					>
						<Layers className="size-[15px]" strokeWidth={2.2} aria-hidden />
						<span className="max-[1099px]:sr-only">{strings.myListings}</span>
					</button>
				)}
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
