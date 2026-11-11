import { ExternalLink, KeyRound, RefreshCw } from "lucide-react";
import { Mascot } from "@/components/Mascot";
import { strings } from "@/lib/strings";

export type ChatErrorKind = "401" | "402" | "404" | "free-day" | "free-minute" | "free-down" | "generic";

const isFree = (kind: ChatErrorKind) => kind.startsWith("free-");

const CREDITS_URL = "https://openrouter.ai/settings/credits";
const action = "mt-1.5 inline-flex h-9 min-h-9 items-center gap-[7px] rounded-full px-4 text-[13px] font-medium tracking-[-0.01em] whitespace-nowrap";

export function ErrorCard({
	kind,
	text,
	onPasteKey,
	onRetry,
	onPickModel,
}: {
	kind: ChatErrorKind;
	text: string;
	onPasteKey: () => void;
	onPickModel: () => void;
	onRetry?: () => void;
}) {
	const title = {
		"401": strings.error401Title,
		"402": strings.error402Title,
		"404": strings.errorModelTitle,
		"free-day": strings.errorFreeDayTitle,
		"free-minute": strings.errorFreeMinuteTitle,
		"free-down": strings.errorFreeDownTitle,
		generic: strings.errorGenericTitle,
	}[kind];
	return (
		<section role="alert" className="glass flex max-w-[560px] items-start gap-3.5 rounded-panel p-5 shadow-none">
			<Mascot mood="error" width={44} />
			<div className="flex min-w-0 flex-1 flex-col gap-1.5">
				<div className="flex items-center gap-2">
					<h2 className="m-0 text-[15px] font-semibold tracking-[-0.02em]">{title}</h2>
					{kind !== "generic" && !isFree(kind) && (
						<span className="rounded-full bg-[rgba(255,69,58,.16)] px-2 py-0.5 text-[11px] font-bold text-danger">{kind}</span>
					)}
				</div>
				<p className="m-0 text-sm leading-snug text-fg-3">{text}</p>
				<div>
					{kind === "401" && (
						<button type="button" onClick={onPasteKey} className={`${action} bg-fg text-bg shadow-[0_8px_24px_rgba(0,0,0,.25)]`}>
							<KeyRound className="size-[13px]" strokeWidth={2.2} aria-hidden />
							{strings.error401Action}
						</button>
					)}
					{isFree(kind) && (
						<button type="button" onClick={onPasteKey} className={`${action} bg-fg text-bg shadow-[0_8px_24px_rgba(0,0,0,.25)]`}>
							<KeyRound className="size-[13px]" strokeWidth={2.2} aria-hidden />
							{strings.connect}
						</button>
					)}
					{kind === "404" && (
						<button type="button" onClick={onPickModel} className={`${action} bg-fg text-bg shadow-[0_8px_24px_rgba(0,0,0,.25)]`}>
							{strings.errorModelAction}
						</button>
					)}
					{kind === "402" && (
						<a href={CREDITS_URL} target="_blank" rel="noopener noreferrer" className={`btn ${action} bg-fg text-bg no-underline shadow-[0_8px_24px_rgba(0,0,0,.25)] hover:text-bg`}>
							<ExternalLink className="size-[13px]" strokeWidth={2.2} aria-hidden />
							{strings.error402Action}
						</a>
					)}
					{kind === "generic" && onRetry && (
						<button type="button" onClick={onRetry} className={`${action} chip`}>
							<RefreshCw className="size-[13px]" strokeWidth={2.2} aria-hidden />
							{strings.retry}
						</button>
					)}
				</div>
			</div>
		</section>
	);
}
