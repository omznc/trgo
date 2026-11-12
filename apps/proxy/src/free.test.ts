import { describe, expect, test } from "bun:test";
import { buildSystemPrompt } from "@lagano/providers/prompt";
import { hmacIp, ipKey, MAX_CHARS, MAX_MESSAGES, MAX_TOKENS, MAX_TOOLS, PUBLIC_MODEL, sanitizeBody, scrub, scrubStream } from "./free";

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
			{ messages: [{ role: "user", content: "x" }], models: ["a"], provider: {}, route: "x", plugins: [], transforms: [], reasoning: {}, tools: [], stream: true, temperature: 0.2 },
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

describe("sanitizeBody system prompt", () => {
	const user = { role: "user", content: "hi" };
	const messages = (extra: Record<string, unknown>) => sanitizeBody({ messages: [{ role: "system", content: "evil" }, { role: "developer", content: "evil" }, user], ...extra }, "m")?.messages;

	test("drops client system and developer messages and puts the proxy prompt first", () => {
		expect(messages({})).toEqual([{ role: "system", content: buildSystemPrompt("en") }, user]);
	});

	test("builds the prompt from a valid trgo", () => {
		const out = messages({ trgo: { lang: "bs", providers: ["olx", "svex", "olx"] } }) as { content: string }[];
		expect(out[0]!.content).toBe(buildSystemPrompt("bs", ["olx", "svex"]));
	});

	test("falls back to the default prompt for a bad trgo", () => {
		for (const trgo of [null, "x", { lang: "xx" }, { providers: [] }, { providers: ["nope"] }, { providers: "olx" }]) {
			expect((messages({ trgo }) as { content: string }[])[0]!.content).toBe(buildSystemPrompt("en"));
		}
	});

	test("does not send trgo upstream", () => {
		expect(sanitizeBody({ messages: [user], trgo: { lang: "bs" } }, "m")).not.toHaveProperty("trgo");
	});
});

describe("sanitizeBody limits", () => {
	const user = (content: unknown) => ({ role: "user", content });
	const run = (extra: Record<string, unknown>) => sanitizeBody({ messages: [user("hi")], ...extra }, "m");

	test("accepts string content, text parts and tool calls", () => {
		const messages = [
			user("hi"),
			user([{ type: "text", text: "a" }]),
			{ role: "assistant", content: null, tool_calls: [{ function: { name: "f", arguments: "{}" } }] },
			{ role: "tool", content: "result" },
		];
		expect(sanitizeBody({ messages }, "m")).not.toBeNull();
	});

	test.each(["image_url", "file", "input_audio"])("rejects a %s part", (type) => {
		expect(sanitizeBody({ messages: [user([{ type, [type]: {} }])] }, "m")).toBeNull();
	});

	test("rejects a non-object message and odd content", () => {
		expect(sanitizeBody({ messages: [1] }, "m")).toBeNull();
		expect(sanitizeBody({ messages: [user(5)] }, "m")).toBeNull();
		expect(sanitizeBody({ messages: [user([{ type: "text", text: 1 }])] }, "m")).toBeNull();
	});

	test("caps the number of messages", () => {
		expect(sanitizeBody({ messages: Array(MAX_MESSAGES).fill(user("x")) }, "m")).not.toBeNull();
		expect(sanitizeBody({ messages: Array(MAX_MESSAGES + 1).fill(user("x")) }, "m")).toBeNull();
	});

	test("caps the total text, across messages and tool arguments", () => {
		const half = "x".repeat(MAX_CHARS / 2);
		expect(sanitizeBody({ messages: [user(half), user(half)] }, "m")).not.toBeNull();
		expect(sanitizeBody({ messages: [user(half), user(`${half}x`)] }, "m")).toBeNull();
		const call = { role: "assistant", tool_calls: [{ function: { arguments: "x".repeat(MAX_CHARS + 1) } }] };
		expect(sanitizeBody({ messages: [call] }, "m")).toBeNull();
	});

	test("counts tools and response_format toward the text cap", () => {
		const big = { type: "function", function: { description: "x".repeat(MAX_CHARS) } };
		expect(run({ tools: [big] })).toBeNull();
		expect(run({ response_format: { schema: "x".repeat(MAX_CHARS) } })).toBeNull();
		expect(run({ tools: [{ type: "function", function: { description: "x" } }] })).not.toBeNull();
	});

	test("caps the number of tools", () => {
		expect(run({ tools: Array(MAX_TOOLS).fill({}) })).not.toBeNull();
		expect(run({ tools: Array(MAX_TOOLS + 1).fill({}) })).toBeNull();
		expect(run({ tools: "x" })).toBeNull();
	});
});

describe("ipKey", () => {
	test.each([
		["203.0.113.5", "203.0.113.5"],
		["unknown", "unknown"],
		["2001:db8:1:2:3:4:5:6", "2001:db8:1:2::/64"],
		["2001:0DB8:0001:0002::1", "2001:db8:1:2::/64"],
		["2001:db8::1", "2001:db8:0:0::/64"],
		["2001:db8:0:0:5::", "2001:db8:0:0::/64"],
		["::1", "0:0:0:0::/64"],
		["::", "0:0:0:0::/64"],
		["1::", "1:0:0:0::/64"],
		["2001:db8:1::2:3:4", "2001:db8:1:0::/64"],
		["::ffff:203.0.113.5", "203.0.113.5"],
	])("%s -> %s", (ip, key) => {
		expect(ipKey(ip)).toBe(key);
	});

	test("two addresses in one /64 share a key", () => {
		expect(ipKey("2001:db8:1:2:aaaa::1")).toBe(ipKey("2001:db8:1:2:bbbb:cccc:dddd:eeee"));
		expect(ipKey("2001:db8:1:3::1")).not.toBe(ipKey("2001:db8:1:2::1"));
	});

	test("an invalid address stays as it is", () => {
		for (const bad of ["1::2::3", "1:2:3", "zzzz::1", "1:2:3:4:5:6:7:8:9"]) expect(ipKey(bad)).toBe(bad);
	});
});

describe("hmacIp", () => {
	test("is stable, keyed and not the plain SHA-256", async () => {
		const a = await hmacIp("203.0.113.5", "k1");
		expect(a).toMatch(/^[0-9a-f]{64}$/);
		expect(await hmacIp("203.0.113.5", "k1")).toBe(a);
		expect(await hmacIp("203.0.113.5", "k2")).not.toBe(a);
		const plain = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("203.0.113.5"));
		expect(a).not.toBe([...new Uint8Array(plain)].map((b) => b.toString(16).padStart(2, "0")).join(""));
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
