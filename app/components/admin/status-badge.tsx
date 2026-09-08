import type { HTMLAttributes, ReactNode } from "react";

import { Badge } from "../ui";
import type { StatusTone } from "../ui";
import { cx } from "../ui/utils";

export type AdminStatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
	label: ReactNode;
	tone?: StatusTone;
	prefix?: ReactNode;
};

/** A status always includes readable text; color is only a secondary cue. */
export function AdminStatusBadge({
	label,
	tone = "neutral",
	prefix,
	className,
	...props
}: AdminStatusBadgeProps) {
	return (
		<Badge tone={tone} className={cx("admin-status-badge", className)} {...props}>
			{prefix && <span className="admin-status-badge__prefix">{prefix}</span>}
			<span>{label}</span>
		</Badge>
	);
}
