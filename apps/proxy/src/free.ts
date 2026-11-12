// Helpers for POST /ai/chat/completions. Pure functions, so they are easy to test.
import { LANGS, type Lang } from "@lagano/providers/langs";
import { buildSystemPrompt, SEARCH_IDS } from "@lagano/providers/prompt";

export const PUBLIC_MODEL = "trgo-free";
export const MAX_TOKENS = 4000;

// Only these keys reach the upstream. Any other key could change routing or cost.
const ALLOWED_KEYS = [
	"messages",
	"tools",
	"tool_choice",
	"parallel_tool_calls",
	"stream",
	"stream_options",
	"temperature",
	"top_p",
	"stop",
	"seed",
	"response_format",
];

// Limits for one request. They count the client messages. The proxy adds its own system prompt (about 3k chars) after the check.
// A tool result is about 2k chars (a search summary), but list_my_listings is about 12k.
// 120k chars is about 30k tokens: a long chat of 30 turns fits, a pasted book does not.
// The shop has 5 tools; 8 leaves room. A tool loop adds 2 messages per step (8 steps per turn).
export const MAX_BODY_BYTES = 512 * 1024;
export const MAX_MESSAGES = 120;
export const MAX_CHARS = 120_000;
export const MAX_TOOLS = 8;

// Counts the text of message content. Returns null for a part that is not plain text.
function contentChars(content: unknown): number | null {
	if (typeof content === "string") return content.length;
	if (content == null) return 0;
	if (!Array.isArray(content)) return null;
	let chars = 0;
	for (const part of content) {
		const p = part as { type?: unknown; text?: unknown } | null;
		if (p?.type !== "text" || typeof p.text !== "string") return null;
		chars += p.text.length;
	}
	return chars;
}

function callChars(calls: unknown): number {
	if (!Array.isArray(calls)) return 0;
	return calls.reduce((sum, call) => sum + String(call?.function?.arguments ?? "").length, 0);
}

function messageChars(message: unknown): number | null {
	if (typeof message !== "object" || message === null) return null;
	const { content, tool_calls: calls } = message as { content?: unknown; tool_calls?: unknown };
	const chars = contentChars(content);
	return chars === null ? null : chars + callChars(calls);
}

// True when the chat passes the message or character cap. The shop shows "chat too long" for it.
export function isChatTooLong(input: unknown): boolean {
	const messages = (input as { messages?: unknown } | null)?.messages;
	if (!Array.isArray(messages)) return false;
	if (messages.length > MAX_MESSAGES) return true;
	const { tools, response_format: format } = input as { tools?: unknown; response_format?: unknown };
	// The tool definitions and the response format count toward the same cap.
	const extra = [tools, format].reduce((sum: number, v) => sum + (v === undefined ? 0 : (JSON.stringify(v) ?? "").length), 0);
	return messages.reduce((sum: number, m) => sum + (messageChars(m) ?? 0), extra) > MAX_CHARS;
}

// Runs before any quota is spent.
function withinLimits(source: Record<string, unknown>, messages: unknown[]): boolean {
	if (isChatTooLong(source)) return false;
	if (source.tools !== undefined && (!Array.isArray(source.tools) || source.tools.length > MAX_TOOLS)) return false;
	return messages.every((message) => messageChars(message) !== null);
}

// Reads the prompt inputs from the client. A missing or bad value gives the default, so an old shop page still works.
function promptInputs(trgo: unknown) {
	const { lang, providers } = (typeof trgo === "object" && trgo !== null ? trgo : {}) as { lang?: unknown; providers?: unknown };
	const picked = Array.isArray(providers) ? [...new Set(providers)] : [];
	const valid = picked.length > 0 && picked.every((id) => SEARCH_IDS.includes(id));
	return {
		lang: (LANGS as readonly unknown[]).includes(lang) ? (lang as Lang) : "en",
		providers: valid ? (picked as string[]) : [...SEARCH_IDS],
	};
}

// The proxy owns the system prompt. It drops every client system and developer message.
function withProxyPrompt(messages: unknown[], trgo: unknown): unknown[] {
	const { lang, providers } = promptInputs(trgo);
	const rest = messages.filter((m) => !["system", "developer"].includes((m as { role?: unknown }).role as string));
	return [{ role: "system", content: buildSystemPrompt(lang, providers) }, ...rest];
}

export function sanitizeBody(input: unknown, model: string): Record<string, unknown> | null {
	if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
	const source = input as Record<string, unknown>;
	if (!Array.isArray(source.messages) || !withinLimits(source, source.messages)) return null;
	const body: Record<string, unknown> = {};
	for (const key of ALLOWED_KEYS) if (key in source) body[key] = source[key];
	body.messages = withProxyPrompt(source.messages, source.trgo);
	const asked = Number(source.max_tokens);
	body.max_tokens = Number.isFinite(asked) && asked > 0 ? Math.min(Math.floor(asked), MAX_TOKENS) : MAX_TOKENS;
	body.model = model;
	return body;
}

// Hides the real model and the upstream provider in one response object.
export function scrub(value: unknown): unknown {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
	const obj = { ...(value as Record<string, unknown>) };
	delete obj.provider;
	if ("model" in obj) obj.model = PUBLIC_MODEL;
	if (typeof obj.error === "object" && obj.error !== null) {
		const { metadata: _metadata, ...error } = obj.error as Record<string, unknown>;
		obj.error = error;
	}
	return obj;
}

function scrubLine(line: string): string {
	if (!line.startsWith("data:")) return line;
	const data = line.slice(5).trim();
	if (!data || data === "[DONE]") return line;
	try {
		return `data: ${JSON.stringify(scrub(JSON.parse(data)))}`;
	} catch {
		return line;
	}
}

// Works on complete lines. A chunk can end in the middle of a line.
export function scrubStream(): TransformStream<Uint8Array, Uint8Array> {
	const decoder = new TextDecoder();
	const encoder = new TextEncoder();
	let rest = "";
	return new TransformStream({
		transform(chunk, controller) {
			rest += decoder.decode(chunk, { stream: true });
			const lines = rest.split("\n");
			rest = lines.pop() ?? "";
			if (lines.length > 0) controller.enqueue(encoder.encode(lines.map(scrubLine).join("\n") + "\n"));
		},
		flush(controller) {
			rest += decoder.decode();
			if (rest) controller.enqueue(encoder.encode(scrubLine(rest)));
		},
	});
}

export const secondsUntilNextUtcDay = (now = new Date()) =>
	Math.max(1, Math.ceil((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) - now.getTime()) / 1000));

// Keyed hash, so the stored key cannot be reversed by hashing the IPv4 space.
export async function hmacIp(ip: string, secret: string): Promise<string> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
	const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(ip));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// IPv4 stays whole. IPv6 maps to its /64, because one customer owns a whole /64 and can rotate in it.
export function ipKey(ip: string): string {
	if (!ip.includes(":")) return ip;
	const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
	if (mapped) return mapped[1]!;
	const halves = ip.split("::");
	if (halves.length > 2) return ip;
	const front = halves[0] ? halves[0].split(":") : [];
	const back = halves[1] ? halves[1].split(":") : [];
	const gap = halves.length === 2 ? 8 - front.length - back.length : 0;
	const groups = [...front, ...Array<string>(Math.max(gap, 0)).fill("0"), ...back];
	if (groups.length !== 8) return ip;
	const head = groups.slice(0, 4).map((g) => (/^[0-9a-f]{1,4}$/i.test(g) ? parseInt(g, 16).toString(16) : null));
	return head.includes(null) ? ip : `${head.join(":")}::/64`;
}
