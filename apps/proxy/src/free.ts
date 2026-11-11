// Helpers for POST /ai/chat/completions. Pure functions, so they are easy to test.

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

export function sanitizeBody(input: unknown, model: string): Record<string, unknown> | null {
	if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
	const source = input as Record<string, unknown>;
	if (!Array.isArray(source.messages)) return null;
	const body: Record<string, unknown> = {};
	for (const key of ALLOWED_KEYS) if (key in source) body[key] = source[key];
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

export async function hashIp(ip: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
