import { POSES, type Pose } from "./mascot-poses";

export function SellMascot({ pose, width, label }: { pose: Pose; width: number; label?: string }) {
	return (
		<svg
			width={width}
			height={Math.round((width * 16) / 20)}
			viewBox="0 0 20 16"
			shapeRendering="crispEdges"
			role={label ? "img" : undefined}
			aria-label={label}
			aria-hidden={label ? undefined : true}
		>
			{POSES[pose].map(([fill, d]) => (
				<path key={fill + d.length} fill={fill === "accent" ? "var(--color-accent)" : fill} d={d} />
			))}
		</svg>
	);
}
