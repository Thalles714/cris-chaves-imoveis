import { useId } from "react";
import type { HTMLAttributes, ReactNode } from "react";

import { EmptyState } from "../ui";
import type { StatusTone } from "../ui";
import { cx } from "../ui/utils";

export type AdminMetric = {
	id: string;
	label: ReactNode;
	value: ReactNode;
	description?: ReactNode;
	tone?: StatusTone;
};

export type AdminDashboardSummaryProps = HTMLAttributes<HTMLElement> & {
	title?: ReactNode;
	metrics: AdminMetric[];
	emptyTitle: ReactNode;
	emptyDescription?: ReactNode;
	emptyAction?: ReactNode;
	afterMetrics?: ReactNode;
};

export function AdminDashboardSummary({
	title = "Resumo da operação",
	metrics,
	emptyTitle,
	emptyDescription,
	emptyAction,
	afterMetrics,
	className,
	...props
}: AdminDashboardSummaryProps) {
	const titleId = useId();

	return (
		<section
			className={cx("admin-dashboard-summary", className)}
			aria-labelledby={titleId}
			{...props}
		>
			<h2 id={titleId} className="admin-visually-hidden">
				{title}
			</h2>
			{metrics.length === 0 ? (
				<EmptyState
					className="admin-dashboard-summary__empty"
					title={emptyTitle}
					description={emptyDescription}
					action={emptyAction}
				/>
			) : (
				<div className="admin-stat-grid">
					{metrics.map((metric) => (
						<article
							key={metric.id}
							className="admin-stat"
							data-tone={metric.tone ?? "neutral"}
						>
							<span className="admin-stat__label">{metric.label}</span>
							<strong className="admin-stat__value">{metric.value}</strong>
							{metric.description && (
								<small className="admin-stat__description">{metric.description}</small>
							)}
						</article>
					))}
				</div>
			)}
			{afterMetrics}
		</section>
	);
}
