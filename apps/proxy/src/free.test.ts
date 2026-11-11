import { describe, expect, test } from "bun:test";
import { MAX_TOKENS, PUBLIC_MODEL, sanitizeBody, scrub, scrubStream } from "./free";

describe("sanitizeBody", () => {
	test("forces the model and caps max_tokens", () => {
		const body = sanitizeBody({ model: "x/y", messages: [], max_tokens: 99999 }, "m/real");
		expect(body?.model).toBe("m/real");
		expect(body?.max_tokens).toBe(MAX_TOKENS);
		expect(sanitizeBody({ messages: [], max_tokens: 50 }, "m")?.max_tokens).toBe(50);
		expect(sanitizeBody({ messages: [] }, "m")?.max_tokens).toBe(MAX_TOKENS);
	});

	test("drops routing and cost keys, keeps the allowed ones", () => {
		const body = sanitizeBody(
			{ messages: [1], models: ["a"], provider: {}, route: "x", plugins: [], transforms: [], reasoning: {}, tools: [], stream: true, temperature: 0.2 },
			"m",
		);
		expect(Object.keys(body ?? {}).sort()).toEqual(["max_tokens", "messages", "model", "stream", "temperature", "tools"]);
	});

	test("rejects a body without messages", () => {
		expect(sanitizeBody({ model: "x" }, "m")).toBeNull();
		expect(sanitizeBody(null, "m")).toBeNull();
		expect(sanitizeBody([], "m")).toBeNull();
	});
});

describe("scrub", () => {
	test("replaces model and removes provider", () => {
		expect(scrub({ model: "real/model", provider: "P", id: "1" })).toEqual({ model: PUBLIC_MODEL, id: "1" });
	});

	test("removes error metadata", () => {
		expect(scrub({ error: { message: "m", metadata: { provider_name: "P" } } })).toEqual({ error: { message: "m" } });
	});
});

async function run(parts: string[]): Promise<string> {
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			for (const part of parts) controller.enqueue(new TextEncoder().encode(part));
			controller.close();
		},
	}).pipeThrough(scrubStream());
	return await new Response(stream).text();
}

describe("scrubStream", () => {
	const line = `data: ${JSON.stringify({ model: "real/model", provider: "P", choices: [{ delta: { content: "hi" } }] })}`;

	test("rewrites every data line and keeps the rest", async () => {
		const out = await run([`: PROCESSING\n\n${line}\n\n${line}\n\ndata: [DONE]\n\n`]);
		expect(out).not.toContain("real/model");
		expect(out).not.toContain('"provider"');
		expect(out).toContain(": PROCESSING");
		expect(out).toContain("data: [DONE]");
		expect(out.match(/trgo-free/g)?.length).toBe(2);
	});

	test("handles a line split across chunks", async () => {
		const cut = 20;
		const out = await run([line.slice(0, cut), line.slice(cut, 60), `${line.slice(60)}\n\n`]);
		expect(out).not.toContain("real/model");
		expect(out).toContain(PUBLIC_MODEL);
	});

	test("flushes a last line without a newline", async () => {
		const out = await run([line]);
		expect(out).toContain(PUBLIC_MODEL);
	});
});
