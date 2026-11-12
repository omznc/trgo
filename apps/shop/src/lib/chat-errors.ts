import { strings } from "./strings";

// One place for the chat error codes. A new code needs only a new entry here.
export const CHAT_ERRORS = {
	"401": { title: strings.error401Title, body: strings.error401Body },
	"402": { title: strings.error402Title, body: strings.error402Body },
	"404": { title: strings.errorModelTitle, body: strings.errorModelBody },
	"free-day": { title: strings.errorFreeDayTitle, body: strings.errorFreeDay },
	"free-minute": { title: strings.errorFreeMinuteTitle, body: strings.errorFreeMinute },
	"free-down": { title: strings.errorFreeDownTitle, body: strings.errorFreeDown },
	"free-too-long": { title: strings.errorFreeLongTitle, body: strings.errorFreeLong },
} as const;

export type ChatErrorKind = keyof typeof CHAT_ERRORS | "generic";

export function errorKind(error: Error | undefined): ChatErrorKind {
	const message = error?.message ?? "";
	return Object.hasOwn(CHAT_ERRORS, message) ? (message as keyof typeof CHAT_ERRORS) : "generic";
}
