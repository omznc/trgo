import { ExternalLink, KeyRound, Loader2, Lock, ShieldCheck, TriangleAlert } from "lucide-react";
import { formatUsd, useCredits, type Credits } from "@/lib/openrouter-credits";
import { useEffect, useId, useRef, useState } from "react";
import { useSidePanel } from "@/components/shell/side-panel";
import { startLogin } from "@/lib/openrouter-auth";
import { olxAccount, svexAccount } from "@/lib/publish";
import { clearSession, setSession, useSessions } from "@/lib/sessions";
import { ta } from "@/lib/strings-account";
import ClearData from "./ClearData";
import { btn, Dot, FIELD, LBL, maskKey, PanelBody, PanelHeader, PROXY_SOURCE, removeKey, saveKey, useOpenRouterKey } from "./ui";

type Provider = "olx" | "svex" | "openrouter";
type Form = "key" | "olx" | "svex" | null;

const NAMES = { olx: "OLX", svex: "SVEX" } as const;
const SPIN = "animate-spin";
const CARD = "rounded-[24px] p-5";

function Alert({ children }: { children: string }) {
	return (
		<p role="alert" className="m-0 flex items-start gap-2 text-[13px] text-danger">
			<TriangleAlert size={14} aria-hidden className="mt-0.5 flex-none" />
			{children}
		</p>
	);
}

function Reason({ text }: { text?: string }) {
	return text ? (
		<p role="status" className="m-0 mb-3 rounded-[12px] bg-accent/15 px-3 py-2 text-[13px] font-medium text-fg">
			{text}
		</p>
	) : null;
}

function FormShell({ title, heading = true, onCancel, onSubmit, children, submit, busy, disabled, reason }: {
	reason?: string;
	title: string;
	heading?: boolean;
	onCancel: () => void;
	onSubmit: () => void;
	children: React.ReactNode;
	submit: string;
	busy: boolean;
	disabled: boolean;
}) {
	return (
		<form
			aria-label={title}
			onSubmit={(e) => {
				e.preventDefault();
				onSubmit();
			}}
			data-cue
			className={`solid flex flex-col gap-3.5 ${CARD}`}
		>
			<Reason text={reason} />
			{heading && <h3 className="m-0 text-[17px] font-semibold tracking-[-0.02em]">{title}</h3>}
			{children}
			<div className="flex flex-wrap justify-end gap-2">
				<button type="button" onClick={onCancel} className={btn("ghost")}>
					{ta.cancel}
				</button>
				<button type="submit" disabled={busy || disabled} className={btn("primary")}>
					{busy && <Loader2 size={15} aria-hidden className={SPIN} />}
					{submit}
				</button>
			</div>
		</form>
	);
}

function Labeled({ label, children, id }: { label: string; id: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-1.5">
			<label htmlFor={id} className={LBL}>
				{label}
			</label>
			{children}
		</div>
	);
}

// A 401 from OpenRouter means the key is wrong. Any other failure is treated as network.
async function checkKey(key: string): Promise<"ok" | "401" | "network"> {
	try {
		const res = await fetch("https://openrouter.ai/api/v1/key", { headers: { Authorization: `Bearer ${key.trim()}` } });
		if (res.status === 401) return "401";
		return res.ok ? "ok" : "network";
	} catch {
		return "network";
	}
}

function KeyForm({ onDone, reason }: { onDone: () => void; reason?: string }) {
	const id = useId();
	const [value, setValue] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	async function submit() {
		setBusy(true);
		setError(null);
		const result = await checkKey(value);
		setBusy(false);
		if (result === "ok") {
			saveKey(value);
			onDone();
		} else setError(result === "401" ? ta.key401 : ta.keyNetwork);
	}
	return (
		<FormShell reason={reason} title={ta.keyTitle} onCancel={onDone} onSubmit={submit} submit={busy ? ta.keyChecking : ta.save} busy={busy} disabled={!value.trim()}>
			<Labeled label={ta.keyLabel} id={id}>
				<input id={id} type="password" autoComplete="off" spellCheck={false} placeholder="sk-or-v1-…" value={value} onChange={(e) => setValue(e.target.value)} aria-invalid={!!error} className={`${FIELD} font-mono`} />
			</Labeled>
			<p className="m-0 flex items-center gap-1.5 text-[13px] text-fg-3">
				<Lock size={13} aria-hidden /> {ta.keyLocal}
			</p>
			{error && <Alert>{error}</Alert>}
		</FormShell>
	);
}

function LoginForm({ provider, onDone, reason }: { provider: "olx" | "svex"; onDone: () => void; reason?: string }) {
	const id = useId();
	const name = NAMES[provider];
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [busy, setBusy] = useState(false);
	const [failed, setFailed] = useState(false);
	async function submit() {
		setBusy(true);
		setFailed(false);
		try {
			if (provider === "olx") setSession("olx", await olxAccount.login({ username, password }));
			else setSession("svex", await svexAccount.login({ identifier: username, password }));
			onDone();
		} catch {
			setFailed(true);
		} finally {
			setBusy(false);
		}
	}
	return (
		<FormShell reason={reason} title={ta.loginTitle(name)} heading={false} onCancel={onDone} onSubmit={submit} submit={busy ? ta.loginBusy : ta.loginSubmit} busy={busy} disabled={!username || !password}>
			<Labeled label={ta.userLabel} id={`${id}u`}>
				<input id={`${id}u`} autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} className={FIELD} />
			</Labeled>
			<Labeled label={ta.passLabel} id={`${id}p`}>
				<input id={`${id}p`} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={FIELD} />
			</Labeled>
			<p className="m-0 flex items-start gap-2 rounded-[12px] bg-white/5 px-3 py-2.5 text-[13px] text-fg-3">
				<ShieldCheck size={15} aria-hidden className="mt-0.5 flex-none text-ok" />
				<span>
					{ta.loginNote(name)}{" "}
					<a href={PROXY_SOURCE} target="_blank" rel="noopener noreferrer" className="text-fg underline">
						{ta.proxySource}
					</a>
				</span>
			</p>
			{failed && <Alert>{ta.loginFailed}</Alert>}
		</FormShell>
	);
}

export function ConnectCard({ onPaste, reason }: { onPaste: () => void; reason?: string }) {
	return (
		<section data-cue className={`glass shadow-none ${CARD}`}>
			<Reason text={reason} />
			<h3 className="m-0 text-[17px] font-semibold tracking-[-0.02em]">{ta.cardTitle}</h3>
			<p className="mt-1 mb-0 text-[14px] leading-[1.45] text-fg-3">{ta.cardBody}</p>
			<div className="mt-4 flex flex-col gap-2">
				<button type="button" onClick={() => startLogin()} className={btn("primary", "h-12 min-h-12")}>
					<ExternalLink size={15} aria-hidden /> {ta.cardConnect}
				</button>
				<button type="button" onClick={onPaste} className={btn("ghost")}>
					<KeyRound size={15} aria-hidden /> {ta.cardPaste}
				</button>
			</div>
			<p className="mt-3 mb-0 text-center text-[12px] text-fg-4">{ta.cardFootnote}</p>
		</section>
	);
}

// Shown by the shell while it exchanges the OpenRouter code for a key.
export function ConnectLoading() {
	return (
		<section role="status" className={`glass flex flex-col items-center gap-3 text-center shadow-none ${CARD}`}>
			<span className="flex items-center gap-2 text-[17px] font-semibold">
				<Loader2 size={16} aria-hidden className={SPIN} /> {ta.callbackTitle}
			</span>
			<span className="text-[14px] leading-[1.45] text-fg-3">{ta.callbackBody}</span>
		</section>
	);
}

// Shake and ring pulse (class cue-shake in styles.css) on the main card, then focus its first button.
function useCue(root: React.RefObject<HTMLElement | null>, n: number) {
	const seen = useRef(n);
	useEffect(() => {
		if (seen.current === n) return;
		seen.current = n;
		const card = root.current?.querySelector<HTMLElement>("[data-cue]");
		if (!card) return;
		card.classList.remove("cue-shake");
		void card.offsetWidth;
		card.classList.add("cue-shake");
		card.querySelector("button")?.focus();
	}, [n, root]);
}

const initialForm =(p?: Provider): Form => (p === "olx" || p === "svex" ? p : null);

type Row = { id: Provider; name: string; on: boolean; detail?: string; connect: () => void; disconnect: () => void };

function AccountRows({ rows, reason }: { rows: Row[]; reason?: string }) {
	return (
		<section data-cue className={`glass shadow-none ${CARD}`}>
			<Reason text={reason} />
			<h3 className="m-0 text-[17px] font-semibold tracking-[-0.02em]">{ta.accountsTitle}</h3>
			<ul className="m-0 mt-2 list-none p-0">
				{rows.map((r) => (
					<li key={r.id} className="flex items-center gap-3 border-b border-white/7 py-3 last:border-b-0">
						<Dot on={r.on} />
						<div className="min-w-0 grow">
							<div className="text-[15px] font-semibold">{r.name}</div>
							<div className="truncate text-[13px] text-fg-3">{r.detail ?? (r.on ? ta.loggedIn : ta.notConnected)}</div>
						</div>
						<button type="button" onClick={r.on ? r.disconnect : r.connect} aria-label={`${r.on ? ta.disconnect : ta.connect}: ${r.name}`} className={btn(r.on ? "danger" : "primary", "text-[13px]")}>
							{r.on ? ta.disconnect : ta.connect}
						</button>
					</li>
				))}
			</ul>
		</section>
	);
}

function Privacy() {
	return (
		<section aria-label={ta.whatWeStore} className="glass shadow-none rounded-[24px] px-[22px] pt-[18px] pb-[22px]">
			<h3 className="m-0 text-[22px] font-semibold tracking-[-0.02em]">{ta.whatWeStore}</h3>
			<p className="mt-1 mb-0 text-[14px] leading-[1.45] text-fg-3">{ta.privacyLead}</p>
			<ul className="m-0 mt-2.5 list-none p-0">
				{ta.privacyItems.map(([title, body]) => (
					<li key={title} className="border-b border-white/7 py-3 last:border-b-0">
						<div className="text-[15px] font-semibold">{title}</div>
						<div className="text-[14px] leading-[1.45] text-fg-3">{body}</div>
					</li>
				))}
			</ul>
			<div className="mt-4 flex flex-wrap gap-2">
				<a href={PROXY_SOURCE} target="_blank" rel="noopener noreferrer" className={btn("chip", "glass shadow-none")}>
					<ExternalLink size={15} aria-hidden /> {ta.sourceCode}
				</a>
				<ClearData />
			</div>
		</section>
	);
}

// OLX and SVEX logins are their own page, so the panel slides to them.
function LoginPage({ provider, reason }: { provider: "olx" | "svex"; reason?: string }) {
	const { close, back, canGoBack } = useSidePanel();
	return (
		<>
			<PanelHeader title={ta.loginTitle(NAMES[provider])} onClose={close} />
			<PanelBody>
				<LoginForm provider={provider} onDone={canGoBack ? back : close} reason={reason} />
			</PanelBody>
		</>
	);
}

// The key's own limit matters more than the account balance when it is set.
function creditsLine(masked: string, c: Credits | null) {
	if (!c) return masked;
	if (c.keyLimit !== null && c.keyRemaining !== null) return `${masked} · ${ta.keyLeft(formatUsd(c.keyRemaining), formatUsd(c.keyLimit))}`;
	return `${masked} · ${ta.balance(formatUsd(c.balance))}`;
}

export default function ConnectPanel({ provider }: { provider?: Provider }) {
	const { close, cue, open } = useSidePanel();
	const root = useRef<HTMLDivElement>(null);
	useCue(root, cue.n);
	const reason = cue.reason;
	const sessions = useSessions();
	const key = useOpenRouterKey();
	const [form, setForm] = useState<Form>(initialForm(provider));
	useEffect(() => setForm(initialForm(provider)), [provider]);
	const done = () => setForm(null);
	const credits = useCredits(key);
	const rows: Row[] = [
		{ id: "openrouter", name: "OpenRouter", on: !!key, detail: key ? creditsLine(maskKey(key), credits) : undefined, connect: () => startLogin(), disconnect: removeKey },
		{ id: "olx", name: "OLX", on: sessions.olx, connect: () => open({ kind: "connect", provider: "olx" }), disconnect: () => clearSession("olx") },
		{ id: "svex", name: "SVEX", on: sessions.svex, connect: () => open({ kind: "connect", provider: "svex" }), disconnect: () => clearSession("svex") },
	];
	if (provider === "olx" || provider === "svex") {
		return (
			<div ref={root} className="flex h-full min-h-0 flex-col">
				<LoginPage provider={provider} reason={reason} />
			</div>
		);
	}
	return (
		<div ref={root} className="flex h-full min-h-0 flex-col">
			<PanelHeader title={ta.connectTitle} onClose={close} />
			<PanelBody>
				{form === "key" && <KeyForm onDone={done} reason={reason} />}
				{!form && !key && <ConnectCard onPaste={() => setForm("key")} reason={reason} />}
				<AccountRows rows={rows} reason={!form && key ? reason : undefined} />
				<Privacy />
			</PanelBody>
		</div>
	);
}
