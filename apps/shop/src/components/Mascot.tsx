import type { CSSProperties } from "react";
import { MASCOT_LAYERS, type MascotMood } from "@/components/mascot-data";

export type { MascotMood };

// Trgo, the stall robot. The viewBox is 20x16 and crispEdges keeps the pixels sharp.
export function Mascot({
	mood = "calm",
	width = 28,
	label,
	className,
	style,
}: {
	mood?: MascotMood;
	width?: number;
	// Without a label the mascot is decorative.
	label?: string;
	className?: string;
	style?: CSSProperties;
}) {
	return (
		<svg
			width={width}
			height={Math.round(width * 0.8)}
			viewBox="0 0 20 16"
			shapeRendering="crispEdges"
			role={label ? "img" : undefined}
			aria-label={label}
			aria-hidden={label ? undefined : true}
			className={className}
			style={style}
		>
			{MASCOT_LAYERS[mood].map(([fill, d], i) => (
				<path key={i} fill={fill === "accent" ? "var(--color-accent)" : fill} d={d} />
			))}
		</svg>
	);
}
