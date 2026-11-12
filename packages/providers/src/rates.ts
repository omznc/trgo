// Units of EUR for one unit of a currency. A provider currency must have a rate here.
export const RATES = {
	EUR: 1,
	// Fixed peg: 1 EUR = 1.95583 BAM.
	BAM: 1 / 1.95583,
	// shortcut: static RSD rate, fetch a daily rate if Serbian providers grow
	RSD: 1 / 117.2,
} as const;

export type Currency = keyof typeof RATES;

export const convert = (amount: number, from: Currency, to: Currency): number => (amount * RATES[from]) / RATES[to];
