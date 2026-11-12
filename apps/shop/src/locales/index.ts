import type { Lang } from "@/lib/lang";
import bg from "./bg";
import de from "./de";
import hr from "./hr";
import sl from "./sl";
import sr from "./sr";
import type { Locale } from "./types";

export const LOCALES: Record<Exclude<Lang, "bs" | "en">, Locale> = { hr, sr, sl, de, bg };
