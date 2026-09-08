import { cloneElement, useId } from "react";
import type {
	ButtonHTMLAttributes,
	HTMLAttributes,
	ReactElement,
	ReactNode,
} from "react";

import { AlertIcon, BuildingIcon, CheckIcon } from "./icons";
import { cx } from "./utils";

export type ComponentState = "default" | "active" | "loading" | "success" | "error";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: "primary" | "secondary" | "ghost" | "danger";
	state?: ComponentState;
	loadingLabel?: string;
	leadingIcon?: ReactNode;
	trailingIcon?: ReactNode;
};

export function Button({
	variant = "primary",
	state = "default",
	loadingLabel = "Carregando",
	leadingIcon,
	trailingIcon,
	className,
	children,
	disabled,
	type = "button",
	...props
}: ButtonProps) {
	const loading = state === "loading";
	const semanticIcon = state === "success" ? <CheckIcon /> : undefined;
	return (
		<button
			type={type}
			className={cx("cc-button", `cc-button--${variant}`, className)}
			data-state={state}
			aria-busy={loading || undefined}
			disabled={disabled || loading}
			{...props}
		>
			{loading ? (
				<Spinner label={loadingLabel} size="sm" />
			) : (
				(leadingIcon ?? semanticIcon)
			)}
			<span>{loading ? loadingLabel : children}</span>
			{!loading && trailingIcon}
		</button>
	);
}

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	label: string;
	variant?: "secondary" | "ghost" | "danger";
	state?: ComponentState;
	rounded?: boolean;
};

export function IconButton({
	label,
	variant = "secondary",
	state = "default",
	rounded = false,
	className,
	disabled,
	children,
	type = "button",
	...props
}: IconButtonProps) {
	const loading = state === "loading";
	return (
		<button
			type={type}
			className={cx(
				"cc-icon-button",
				`cc-icon-button--${variant}`,
				rounded && "cc-icon-button--round",
				className,
			)}
			data-state={state}
			aria-label={label}
			aria-busy={loading || undefined}
			disabled={disabled || loading}
			{...props}
		>
			{loading ? <Spinner label={label} size="sm" /> : children}
		</button>
	);
}

export type StatusTone = "neutral" | "success" | "warning" | "info" | "error";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
	tone?: StatusTone;
	dot?: boolean;
};

export function Badge({
	tone = "neutral",
	dot = true,
	className,
	children,
	...props
}: BadgeProps) {
	return (
		<span
			className={cx("cc-badge", `cc-badge--${tone}`, className)}
			data-dot={dot || undefined}
			{...props}
		>
			{children}
		</span>
	);
}

type FieldControlProps = {
	id?: string;
	className?: string;
	disabled?: boolean;
	"aria-describedby"?: string;
	"aria-invalid"?: boolean | "true" | "false";
};

export type FieldProps = {
	label: ReactNode;
	children: ReactElement<FieldControlProps>;
	id?: string;
	hint?: ReactNode;
	error?: ReactNode;
	success?: ReactNode;
	optional?: boolean;
	disabled?: boolean;
	className?: string;
};

export function Field({
	label,
	children,
	id,
	hint,
	error,
	success,
	optional = false,
	disabled = false,
	className,
}: FieldProps) {
	const generatedId = useId();
	const controlId = id ?? children.props.id ?? `field-${generatedId}`;
	const message = error ?? success ?? hint;
	const messageId = message ? `${controlId}-message` : undefined;
	const state = error ? "error" : success ? "success" : "default";
	const describedBy =
		[children.props["aria-describedby"], messageId].filter(Boolean).join(" ") ||
		undefined;
	const control = cloneElement(children, {
		id: controlId,
		className: cx("cc-field__control", children.props.className),
		disabled: disabled || children.props.disabled,
		"aria-invalid": error ? true : children.props["aria-invalid"],
		"aria-describedby": describedBy,
	});

	return (
		<div className={cx("cc-field", className)} data-state={state}>
			<label className="cc-field__label" htmlFor={controlId}>
				{label}
				{optional && (
					<span className="cc-field__optional" aria-hidden="true">
						Opcional
					</span>
				)}
			</label>
			{control}
			{message && (
				<div
					id={messageId}
					className="cc-field__message"
					aria-live={error ? "polite" : undefined}
				>
					{message}
				</div>
			)}
		</div>
	);
}

export type AlertProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
	title: ReactNode;
	tone?: Exclude<StatusTone, "neutral">;
	action?: ReactNode;
	icon?: ReactNode;
};

export function Alert({
	title,
	tone = "info",
	action,
	icon,
	className,
	children,
	...props
}: AlertProps) {
	const role = tone === "error" ? "alert" : "status";
	return (
		<div
			className={cx("cc-alert", `cc-alert--${tone}`, className)}
			role={role}
			{...props}
		>
			<span className="cc-alert__icon">
				{icon ?? (tone === "success" ? <CheckIcon /> : <AlertIcon />)}
			</span>
			<div className="cc-alert__content">
				<strong>{title}</strong>
				{children && <div>{children}</div>}
			</div>
			{action && <div className="cc-alert__action">{action}</div>}
		</div>
	);
}

export type SpinnerProps = HTMLAttributes<HTMLSpanElement> & {
	label?: string;
	size?: "sm" | "md" | "lg";
};

export function Spinner({
	label = "Carregando",
	size = "md",
	className,
	...props
}: SpinnerProps) {
	return (
		<span
			className={cx("cc-spinner", `cc-spinner--${size}`, className)}
			role="status"
			aria-label={label}
			{...props}
		/>
	);
}

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
	shape?: "text" | "rectangle" | "circle";
};

export function Skeleton({ shape = "rectangle", className, ...props }: SkeletonProps) {
	return (
		<div
			className={cx("cc-skeleton", `cc-skeleton--${shape}`, className)}
			aria-hidden="true"
			{...props}
		/>
	);
}

export type EmptyStateProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
	title: ReactNode;
	description?: ReactNode;
	action?: ReactNode;
	icon?: ReactNode;
	state?: "empty" | "error" | "success";
};

export function EmptyState({
	title,
	description,
	action,
	icon,
	state = "empty",
	className,
	...props
}: EmptyStateProps) {
	return (
		<div
			className={cx("cc-empty-state", className)}
			data-state={state}
			role={state === "error" ? "alert" : "status"}
			{...props}
		>
			<div className="cc-empty-state__icon">
				{icon ??
					(state === "success" ? (
						<CheckIcon />
					) : state === "error" ? (
						<AlertIcon />
					) : (
						<BuildingIcon />
					))}
			</div>
			<h3>{title}</h3>
			{description && <p>{description}</p>}
			{action && <div className="cc-empty-state__action">{action}</div>}
		</div>
	);
}
