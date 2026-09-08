import { useEffect, useId, useRef } from "react";
import type { HTMLAttributes, ReactNode, RefObject } from "react";

import { CloseIcon } from "./icons";
import { IconButton } from "./primitives";
import type { ComponentState } from "./primitives";
import { cx } from "./utils";

const focusableSelector = [
	"a[href]",
	"button:not([disabled])",
	"input:not([disabled])",
	"select:not([disabled])",
	"textarea:not([disabled])",
	"[tabindex]:not([tabindex='-1'])",
].join(",");

function useDialogBehavior(
	open: boolean,
	onOpenChange: (open: boolean) => void,
	containerRef: RefObject<HTMLElement | null>,
	initialFocusRef?: RefObject<HTMLElement | null>,
) {
	const returnFocusRef = useRef<HTMLElement | null>(null);
	const onOpenChangeRef = useRef(onOpenChange);

	useEffect(() => {
		onOpenChangeRef.current = onOpenChange;
	}, [onOpenChange]);

	useEffect(() => {
		if (!open) return;
		returnFocusRef.current =
			document.activeElement instanceof HTMLElement ? document.activeElement : null;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		const frame = window.requestAnimationFrame(() => {
			const firstFocusable =
				containerRef.current?.querySelector<HTMLElement>(focusableSelector);
			(initialFocusRef?.current ?? firstFocusable ?? containerRef.current)?.focus();
		});

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				onOpenChangeRef.current(false);
				return;
			}
			if (event.key !== "Tab" || !containerRef.current) return;
			const focusable = Array.from(
				containerRef.current.querySelectorAll<HTMLElement>(focusableSelector),
			).filter((element) => element.offsetParent !== null);
			if (!focusable.length) {
				event.preventDefault();
				containerRef.current.focus();
				return;
			}
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last?.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first?.focus();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => {
			window.cancelAnimationFrame(frame);
			document.removeEventListener("keydown", handleKeyDown);
			document.body.style.overflow = previousOverflow;
			returnFocusRef.current?.focus();
		};
	}, [containerRef, initialFocusRef, open]);
}

type OverlayBaseProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: ReactNode;
	description?: ReactNode;
	footer?: ReactNode;
	closeLabel?: string;
	closeOnBackdrop?: boolean;
	state?: ComponentState;
	initialFocusRef?: RefObject<HTMLElement | null>;
};

export type ModalProps = OverlayBaseProps;

export function Modal({
	open,
	onOpenChange,
	title,
	description,
	footer,
	closeLabel = "Fechar janela",
	closeOnBackdrop = true,
	state = "default",
	initialFocusRef,
	className,
	children,
	...props
}: ModalProps) {
	const dialogRef = useRef<HTMLElement>(null);
	const titleId = useId();
	const descriptionId = useId();
	useDialogBehavior(open, onOpenChange, dialogRef, initialFocusRef);

	return (
		<div
			className={cx("cc-overlay", className)}
			role="presentation"
			data-open={open || undefined}
			aria-hidden={!open}
			onMouseDown={(event) => {
				if (closeOnBackdrop && event.target === event.currentTarget) {
					onOpenChange(false);
				}
			}}
			{...props}
		>
			<section
				ref={dialogRef}
				className="cc-modal"
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={description ? descriptionId : undefined}
				data-state={state}
				tabIndex={-1}
			>
				<header className="cc-dialog__header">
					<div>
						<h2 id={titleId}>{title}</h2>
						{description && <p id={descriptionId}>{description}</p>}
					</div>
					<IconButton label={closeLabel} onClick={() => onOpenChange(false)}>
						<CloseIcon />
					</IconButton>
				</header>
				<div className="cc-dialog__body">{children}</div>
				{footer && <footer className="cc-dialog__footer">{footer}</footer>}
			</section>
		</div>
	);
}

export type DrawerProps = OverlayBaseProps & {
	position?: "left" | "right";
};

export function Drawer({
	open,
	onOpenChange,
	title,
	description,
	footer,
	closeLabel = "Fechar painel",
	closeOnBackdrop = true,
	state = "default",
	initialFocusRef,
	position = "right",
	className,
	children,
	...props
}: DrawerProps) {
	const drawerRef = useRef<HTMLElement>(null);
	const titleId = useId();
	const descriptionId = useId();
	useDialogBehavior(open, onOpenChange, drawerRef, initialFocusRef);

	return (
		<div
			className={cx("cc-overlay", "cc-overlay--drawer", className)}
			role="presentation"
			data-open={open || undefined}
			data-position={position}
			aria-hidden={!open}
			onMouseDown={(event) => {
				if (closeOnBackdrop && event.target === event.currentTarget) {
					onOpenChange(false);
				}
			}}
			{...props}
		>
			<aside
				ref={drawerRef}
				className="cc-drawer"
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={description ? descriptionId : undefined}
				data-state={state}
				tabIndex={-1}
			>
				<header className="cc-dialog__header">
					<div>
						<h2 id={titleId}>{title}</h2>
						{description && <p id={descriptionId}>{description}</p>}
					</div>
					<IconButton label={closeLabel} onClick={() => onOpenChange(false)}>
						<CloseIcon />
					</IconButton>
				</header>
				<div className="cc-dialog__body">{children}</div>
				{footer && <footer className="cc-dialog__footer">{footer}</footer>}
			</aside>
		</div>
	);
}
