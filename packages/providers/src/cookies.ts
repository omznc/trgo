// The proxy sends upstream set-cookie lines as a JSON array in x-lagano-set-cookie.
export function parseSetCookies(header: string | null): Record<string, string> {
	if (!header) return {};
	let lines: unknown;
	try {
		lines = JSON.parse(header);
	} catch {
		return {};
	}
	const out: Record<string, string> = {};
	for (const line of Array.isArray(lines) ? lines : []) {
		if (typeof line !== "string") continue;
		const pair = line.split(";")[0]!;
		const eq = pair.indexOf("=");
		if (eq > 0) out[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
	}
	return out;
}

export const cookieHeader = (cookies: Record<string, string>) =>
	Object.entries(cookies)
		.map(([name, value]) => `${name}=${value}`)
		.join("; ");
