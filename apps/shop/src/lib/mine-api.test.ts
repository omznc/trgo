import { describe, expect, test } from "bun:test";
import { createMemo } from "./mine-api";

function setup() {
	let calls = 0;
	let t = 0;
	const memo = createMemo(async (key: string) => `${key}-${++calls}`, 30_000, () => t);
	return { memo, calls: () => calls, advance: (ms: number) => (t += ms) };
}

describe("mine memo", () => {
	test("reuses an in-flight and a fresh result", async () => {
		const s = setup();
		const [a, b] = await Promise.all([s.memo.get("olx"), s.memo.get("olx")]);
		expect(a).toBe(b);
		s.advance(29_999);
		await s.memo.get("olx");
		expect(s.calls()).toBe(1);
		await s.memo.get("svex");
		expect(s.calls()).toBe(2);
	});

	test("loads again after the expiry", async () => {
		const s = setup();
		await s.memo.get("olx");
		s.advance(30_000);
		expect(await s.memo.get("olx")).toBe("olx-2");
	});

	test("loads again after a clear, for example after a write", async () => {
		const s = setup();
		await s.memo.get("olx");
		s.memo.clear();
		await s.memo.get("olx");
		expect(s.calls()).toBe(2);
	});

	test("does not keep a failed load", async () => {
		let n = 0;
		const memo = createMemo(async () => {
			if (++n === 1) throw new Error("no");
			return "ok";
		});
		await expect(memo.get("olx")).rejects.toThrow();
		expect(await memo.get("olx")).toBe("ok");
	});
});
