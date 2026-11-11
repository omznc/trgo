import { KeyRound, Link2, LogOut, PlugZap } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProviderId } from "@lagano/providers";
import { MODELS, modelLabel } from "@/lib/agent";
import { olxAccount, svexAccount } from "@/lib/publish";
import { clearSession, setSession } from "@/lib/sessions";
import { startLogin } from "@/lib/openrouter-auth";
import { strings } from "@/lib/strings";

export function KeyDialog({ open, onOpenChange, onSave }: { open: boolean; onOpenChange: (o: boolean) => void; onSave: (key: string) => void }) {
	const [value, setValue] = useState("");
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<form
					className="grid gap-4"
					onSubmit={(e) => {
						e.preventDefault();
						if (!value.trim()) return;
						onSave(value);
						setValue("");
						onOpenChange(false);
					}}
				>
					<DialogHeader>
						<DialogTitle>{strings.pasteKeyTitle}</DialogTitle>
						<DialogDescription>{strings.pasteKeyBody}</DialogDescription>
					</DialogHeader>
					<Input type="password" autoComplete="off" placeholder="sk-or-..." value={value} onChange={(e) => setValue(e.target.value)} />
					<DialogFooter>
						<Button type="submit">{strings.save}</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export function ModelPicker({ model, onChange }: { model: string; onChange: (m: string) => void }) {
	return (
		<Select value={model} onValueChange={onChange}>
			<SelectTrigger size="sm" aria-label={strings.model} className="w-56 text-xs">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{MODELS.map((m) => (
					<SelectItem key={m} value={m}>
						{modelLabel(m)}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

export function ConnectButton({ connected, onDisconnect, onPaste }: { connected: boolean; onDisconnect: () => void; onPaste: () => void }) {
	if (!connected) {
		return (
			<div className="flex items-center gap-1">
				<Button size="sm" onClick={() => startLogin()}>
					<Link2 /> {strings.connect}
				</Button>
				<Button size="icon-sm" variant="ghost" aria-label={strings.pasteKey} onClick={onPaste}>
					<KeyRound />
				</Button>
			</div>
		);
	}
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button size="sm" variant="outline">
					<PlugZap /> {strings.connected}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onSelect={onDisconnect}>
					<LogOut /> {strings.disconnect}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export const PROXY_SOURCE = "https://github.com/omznc/trgo/tree/main/apps/proxy";
const NAMES = { olx: "OLX", svex: "SVEX" } as const;

export function AccountDialog({ provider, onOpenChange }: { provider: ProviderId | null; onOpenChange: (o: boolean) => void }) {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(false);
	const name = provider ? NAMES[provider] : "";

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		if (!provider) return;
		setBusy(true);
		setError(false);
		try {
			if (provider === "olx") setSession("olx", await olxAccount.login({ username, password }));
			else setSession("svex", await svexAccount.login({ identifier: username, password }));
			setUsername("");
			setPassword("");
			onOpenChange(false);
		} catch {
			setError(true);
		} finally {
			setBusy(false);
		}
	}

	return (
		<Dialog open={!!provider} onOpenChange={onOpenChange}>
			<DialogContent>
				<form className="grid gap-4" onSubmit={submit}>
					<DialogHeader>
						<DialogTitle>{provider === "olx" ? strings.connectOlx : strings.connectSvex}</DialogTitle>
						<DialogDescription>
							{strings.accountNote(name)}{" "}
							<a href={PROXY_SOURCE} target="_blank" rel="noopener noreferrer" className="underline">
								{strings.proxySource}
							</a>
						</DialogDescription>
					</DialogHeader>
					<Input autoComplete="username" placeholder={strings.username} value={username} onChange={(e) => setUsername(e.target.value)} />
					<Input type="password" autoComplete="current-password" placeholder={strings.password} value={password} onChange={(e) => setPassword(e.target.value)} />
					{error && (
						<p role="alert" className="text-sm text-destructive">
							{strings.accountFailed}
						</p>
					)}
					<DialogFooter>
						<Button type="submit" disabled={busy || !username || !password}>
							{busy ? strings.connecting : strings.connectAction}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export function AccountButton({ provider, connected, onConnect }: { provider: ProviderId; connected: boolean; onConnect: () => void }) {
	const name = NAMES[provider];
	if (!connected) {
		return (
			<Button size="sm" variant="outline" onClick={onConnect}>
				<Link2 /> {provider === "olx" ? strings.connectOlx : strings.connectSvex}
			</Button>
		);
	}
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button size="sm" variant="outline">
					<PlugZap /> {strings.connectedAs(name)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onSelect={() => clearSession(provider)}>
					<LogOut /> {strings.disconnect}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
