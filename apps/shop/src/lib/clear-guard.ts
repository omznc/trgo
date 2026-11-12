// The chat registers a check here. "Delete all data" asks it first, because a reload during a post leaves a draft.
let guard: (() => boolean) | null = null;

// The check returns true when the clear must wait. It shows the warning itself.
export function setClearGuard(fn: (() => boolean) | null) {
	guard = fn;
}

export const clearBlocked = () => guard?.() ?? false;
