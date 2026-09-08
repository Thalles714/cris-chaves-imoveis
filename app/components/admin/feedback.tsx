import type { HTMLAttributes, ReactNode } from "react";

import { Alert, Button, EmptyState, Skeleton } from "../ui";
import { cx } from "../ui/utils";

export type AdminFeedbackProps = HTMLAttributes<HTMLDivElement> & {
	title: ReactNode;
	description?: ReactNode;
	action?: ReactNode;
};

export function AdminEmpty({
	title,
	description,
	action,
	className,
	...props
}: AdminFeedbackProps) {
	return (
		<EmptyState
			className={cx("admin-feedback", className)}
			title={title}
			description={description}
			action={action}
			{...props}
		/>
	);
}

export type AdminErrorProps = AdminFeedbackProps & {
	onRetry?: () => void;
	retryLabel?: string;
};

export function AdminError({
	title,
	description,
	action,
	onRetry,
	retryLabel = "Tentar novamente",
	className,
	...props
}: AdminErrorProps) {
	return (
		<EmptyState
			className={cx("admin-feedback", className)}
			state="error"
			title={title}
			description={description}
			action={
				action ?? (onRetry ? <Button onClick={onRetry}>{retryLabel}</Button> : undefined)
			}
			{...props}
		/>
	);
}

export type AdminMutationFeedbackProps = {
	tone: "info" | "success" | "warning" | "error";
	title: ReactNode;
	children?: ReactNode;
	action?: ReactNode;
};

export function AdminMutationFeedback({
	tone,
	title,
	children,
	action,
}: AdminMutationFeedbackProps) {
	return (
		<Alert className="admin-mutation-feedback" tone={tone} title={title} action={action}>
			{children}
		</Alert>
	);
}

export function AdminDashboardSkeleton({
	metricCount = 4,
	className,
	...props
}: HTMLAttributes<HTMLDivElement> & { metricCount?: number }) {
	return (
		<div
			className={cx("admin-dashboard-skeleton", className)}
			role="status"
			aria-label="Carregando painel"
			{...props}
		>
			<div className="admin-dashboard-skeleton__heading">
				<Skeleton shape="text" />
				<Skeleton shape="text" />
			</div>
			<div className="admin-stat-grid">
				{Array.from({ length: metricCount }, (_, index) => (
					<div className="admin-stat" key={index}>
						<Skeleton shape="text" />
						<Skeleton className="admin-dashboard-skeleton__value" />
						<Skeleton shape="text" />
					</div>
				))}
			</div>
			<span className="admin-visually-hidden">Carregando painel</span>
		</div>
	);
}
