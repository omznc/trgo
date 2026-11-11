import { Check, ChevronRight, ChevronsUpDown, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { type Lang, lang, setLang } from "@/lib/lang";
import { useSidePanel } from "@/components/shell/side-panel";
import { FREE_MODEL_ID, isFreeModel, MODELS, modelLabel } from "@/lib/agent";
import { getModel, setModel } from "@/lib/openrouter-auth";
import { strings } from "@/lib/strings";
import { ta } from "@/lib/strings-account";
import { ModelPicker } from "./ModelPicker";
import { useSessions } from "@/lib/sessions";
import ClearData from "./ClearData";
import { Group, notifySettings, PanelBody, PanelHeader, PROXY_SOURCE, Section, useOpenRouterKey } from "./ui";

const ROW = "flex min-h-12 items-center justify-between gap-3.5 px-4 py-2.5 text-[15px] text-fg no-underline";
const FOCUS = "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus";
// Each name is in its own language, so it reads the same in both UIs.
const LANGS: Record<Lang, string> = { bs: "Bosanski", en: "English" };

const MODEL_ROW =
	"flex min-h-14 items-center gap-3 px-4 py-2.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-focus";

const isPreset = (m: string) => (MODELS as readonly string[]).includes(m);

function ModelList({ connected }: { connected: boolean }) {
	const { requireConnection } = useSidePanel();
	const [model, setState] = useState<string>(FREE_MODEL_ID);
	const [other, setOther] = useState(false);
	useEffect(() => {
		const saved = getModel();
		if (saved) setState(saved);
	}, []);
	const pick = (m: string) => {
		setModel(m);
		setState(m);
		notifySettings();
	};
	const needKey = () => requireConnection("openrouter", strings.needConnect.openrouter);
	const showOther = other || !isPreset(model);
	return (
		<Group>
			<div role="radiogroup" aria-label={ta.modelHeading} className="contents">
				{MODELS.map((m) => {
					const locked = !connected && !isFreeModel(m);
					return (
						<label key={m} className={`${MODEL_ROW} cursor-pointer ${locked ? "opacity-60" : ""}`}>
							<input type="radio" name="model" value={m} aria-disabled={locked} checked={model === m && !other} onChange={() => (locked ? needKey() : (setOther(false), pick(m)))} className="sr-only" />
							<span className="min-w-0 grow">
								<span className="block text-[15px]">{ta.modelName[m] ?? modelLabel(m)}</span>
								<span className="block text-[13px] text-fg-4">{locked ? ta.modelNeedKey : ta.modelDesc[m]}</span>
							</span>
							<span aria-hidden className="grid w-5 place-items-center">
								{model === m && !other && <Check size={18} strokeWidth={2.8} className="text-accent" />}
							</span>
						</label>
					);
				})}
				<label className={`${MODEL_ROW} cursor-pointer ${connected ? "" : "opacity-60"}`}>
					<input
						type="radio"
						name="model"
						value="other"
						aria-disabled={!connected}
						checked={connected && showOther}
						onChange={() => (connected ? setOther(true) : needKey())}
						className="sr-only"
					/>
					<span className="min-w-0 grow">
						<span className="block text-[15px]">{ta.modelOther}</span>
						<span className="block text-[13px] text-fg-4">{!connected ? ta.modelNeedKey : isPreset(model) ? ta.modelOtherDesc : modelLabel(model)}</span>
					</span>
					<span aria-hidden className="grid w-5 place-items-center">
						{showOther && <Check size={18} strokeWidth={2.8} className="text-accent" />}
					</span>
				</label>
			</div>
			{showOther && <ModelPicker current={model} onPick={pick} />}
		</Group>
	);
}

export default function SettingsPanel() {
	const { open, close } = useSidePanel();
	const sessions = useSessions();
	const key = useOpenRouterKey();
	const connected = [!!key, sessions.olx, sessions.svex].filter(Boolean).length;
	return (
		<div className="flex h-full min-h-0 flex-col">
			<PanelHeader title={ta.settings} onClose={close} />
			<PanelBody>
				<Section title={ta.modelHeading}>
					<ModelList connected={!!key} />
				</Section>
				<Section title={ta.appearance} note={ta.languageDesc}>
					<Group>
						<div className={ROW}>
							<span id="lang-label">{ta.language}</span>
							<DropdownMenu>
								<DropdownMenuTrigger aria-labelledby="lang-label" className={`${FOCUS} inline-flex cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-transparent text-fg-3`}>
									{LANGS[lang]}
									<ChevronsUpDown size={14} aria-hidden />
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="solid min-w-44 rounded-2xl p-1.5">
									<DropdownMenuRadioGroup value={lang} onValueChange={(v) => v !== lang && setLang(v as Lang)}>
										{(Object.keys(LANGS) as Lang[]).map((l) => (
											<DropdownMenuRadioItem key={l} value={l} className="min-h-10 rounded-xl text-sm">
												{LANGS[l]}
											</DropdownMenuRadioItem>
										))}
									</DropdownMenuRadioGroup>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</Group>
				</Section>
				<Section title={ta.accounts}>
					<Group>
						<button type="button" onClick={() => open({ kind: "connect" })} className={`${ROW} ${FOCUS} w-full cursor-pointer border-0 bg-transparent text-left`}>
							<span>{ta.accountsRow}</span>
							<span className="inline-flex items-center gap-1.5 text-fg-3">
								{ta.connectedOf(connected)}
								<ChevronRight size={16} aria-hidden />
							</span>
						</button>
					</Group>
				</Section>
				<Section title={ta.privacy} note={ta.deleteAllNote}>
					<Group>
						<ClearData row />
					</Group>
				</Section>
				<Section title={ta.about}>
					<Group>
						<a href={PROXY_SOURCE} target="_blank" rel="noopener noreferrer" className={`${ROW} ${FOCUS}`}>
							<span>{ta.openSource}</span>
							<span className="inline-flex items-center gap-1.5 text-fg-3">
								GitHub
								<ExternalLink size={14} aria-hidden />
							</span>
						</a>
						<button type="button" onClick={() => open({ kind: "connect" })} className={`${ROW} ${FOCUS} w-full cursor-pointer border-0 bg-transparent text-left`}>
							<span>{ta.whatWeStore}</span>
							<ChevronRight size={16} aria-hidden className="text-fg-3" />
						</button>
					</Group>
				</Section>
			</PanelBody>
		</div>
	);
}
