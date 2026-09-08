import { useEffect, useId, useRef, useState } from "react";
import type { HTMLAttributes, KeyboardEvent, ReactNode } from "react";

import {
	ChevronDownIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	CloseIcon,
	MenuIcon,
} from "./icons";
import { IconButton } from "./primitives";
import { cx } from "./utils";

export type TabItem = {
	id: string;
	label: ReactNode;
	content: ReactNode;
	disabled?: boolean;
};

export type TabsProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
	items: TabItem[];
	value?: string;
	defaultValue?: string;
	onValueChange?: (id: string) => void;
	label: string;
};

export function Tabs({
	items,
	value,
	defaultValue,
	onValueChange,
	label,
	className,
	...props
}: TabsProps) {
	const generatedId = useId();
	const firstEnabled = items.find((item) => !item.disabled)?.id ?? "";
	const [internalValue, setInternalValue] = useState(defaultValue ?? firstEnabled);
	const requestedValue = value ?? internalValue;
	const selectedValue = items.some((item) => item.id === requestedValue && !item.disabled)
		? requestedValue
		: firstEnabled;
	const tabsRef = useRef<Array<HTMLButtonElement | null>>([]);

	const select = (id: string) => {
		if (value === undefined) setInternalValue(id);
		onValueChange?.(id);
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
		if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
			return;
		}
		event.preventDefault();
		const enabledIndexes = items
			.map((item, itemIndex) => (!item.disabled ? itemIndex : -1))
			.filter((itemIndex) => itemIndex >= 0);
		if (!enabledIndexes.length) return;
		const currentPosition = enabledIndexes.indexOf(index);
		let targetPosition = currentPosition;
		if (event.key === "Home") targetPosition = 0;
		if (event.key === "End") targetPosition = enabledIndexes.length - 1;
		if (event.key === "ArrowRight") {
			targetPosition = (currentPosition + 1) % enabledIndexes.length;
		}
		if (event.key === "ArrowLeft") {
			targetPosition =
				(currentPosition - 1 + enabledIndexes.length) % enabledIndexes.length;
		}
		const targetIndex = enabledIndexes[targetPosition];
		const target = items[targetIndex];
		if (!target) return;
		select(target.id);
		tabsRef.current[targetIndex]?.focus();
	};

	return (
		<div className={cx("cc-tabs", className)} {...props}>
			<div className="cc-tabs__list" role="tablist" aria-label={label}>
				{items.map((item, index) => {
					const selected = item.id === selectedValue;
					const tabId = `${generatedId}-tab-${item.id}`;
					const panelId = `${generatedId}-panel-${item.id}`;
					return (
						<button
							key={item.id}
							ref={(node) => {
								tabsRef.current[index] = node;
							}}
							id={tabId}
							className="cc-tabs__tab"
							type="button"
							role="tab"
							aria-controls={panelId}
							aria-selected={selected}
							tabIndex={selected ? 0 : -1}
							disabled={item.disabled}
							data-state={selected ? "active" : "default"}
							onClick={() => select(item.id)}
							onKeyDown={(event) => handleKeyDown(event, index)}
						>
							{item.label}
						</button>
					);
				})}
			</div>
			{items.map((item) => {
				const selected = item.id === selectedValue;
				return (
					<div
						key={item.id}
						id={`${generatedId}-panel-${item.id}`}
						className="cc-tabs__panel"
						role="tabpanel"
						aria-labelledby={`${generatedId}-tab-${item.id}`}
						tabIndex={0}
						hidden={!selected}
					>
						{item.content}
					</div>
				);
			})}
		</div>
	);
}

export type DisclosureProps = Omit<HTMLAttributes<HTMLDetailsElement>, "title"> & {
	title: ReactNode;
	disabled?: boolean;
};

export function Disclosure({
	title,
	disabled = false,
	className,
	children,
	...props
}: DisclosureProps) {
	return (
		<details
			className={cx("cc-disclosure", className)}
			data-disabled={disabled || undefined}
			{...props}
		>
			<summary
				aria-disabled={disabled || undefined}
				onClick={disabled ? (event) => event.preventDefault() : undefined}
			>
				<span>{title}</span>
				<ChevronDownIcon />
			</summary>
			<div className="cc-disclosure__content">{children}</div>
		</details>
	);
}

export type PaginationProps = Omit<HTMLAttributes<HTMLElement>, "onChange"> & {
	page: number;
	totalPages: number;
	onPageChange?: (page: number) => void;
	disabled?: boolean;
	loading?: boolean;
	siblingCount?: number;
};

function paginationRange(page: number, totalPages: number, siblingCount: number) {
	if (totalPages <= siblingCount * 2 + 5) {
		return Array.from({ length: totalPages }, (_, index) => index + 1);
	}
	const pages: Array<number | "ellipsis"> = [1];
	const start = Math.max(2, page - siblingCount);
	const end = Math.min(totalPages - 1, page + siblingCount);
	if (start > 2) pages.push("ellipsis");
	for (let current = start; current <= end; current += 1) pages.push(current);
	if (end < totalPages - 1) pages.push("ellipsis");
	pages.push(totalPages);
	return pages;
}

export function Pagination({
	page,
	totalPages,
	onPageChange,
	disabled = false,
	loading = false,
	siblingCount = 1,
	className,
	...props
}: PaginationProps) {
	const safeTotal = Math.max(1, totalPages);
	const safePage = Math.min(Math.max(1, page), safeTotal);
	const goTo = (nextPage: number) => {
		if (!disabled && !loading && nextPage !== safePage) onPageChange?.(nextPage);
	};

	return (
		<nav
			className={cx("cc-pagination", className)}
			aria-label="Paginação"
			aria-busy={loading || undefined}
			{...props}
		>
			<button
				type="button"
				className="cc-pagination__button"
				aria-label="Página anterior"
				disabled={disabled || loading || safePage <= 1}
				onClick={() => goTo(safePage - 1)}
			>
				<ChevronLeftIcon />
			</button>
			{paginationRange(safePage, safeTotal, siblingCount).map((item, index) =>
				item === "ellipsis" ? (
					<span
						key={`ellipsis-${index}`}
						className="cc-pagination__ellipsis"
						aria-hidden="true"
					>
						…
					</span>
				) : (
					<button
						key={item}
						type="button"
						className="cc-pagination__button"
						data-state={item === safePage ? "active" : "default"}
						aria-label={`Página ${item}`}
						aria-current={item === safePage ? "page" : undefined}
						disabled={disabled || loading}
						onClick={() => goTo(item)}
					>
						{item}
					</button>
				),
			)}
			<button
				type="button"
				className="cc-pagination__button"
				aria-label="Próxima página"
				disabled={disabled || loading || safePage >= safeTotal}
				onClick={() => goTo(safePage + 1)}
			>
				<ChevronRightIcon />
			</button>
		</nav>
	);
}

export type BreadcrumbItem = {
	label: ReactNode;
	href?: string;
	current?: boolean;
};

export type BreadcrumbProps = HTMLAttributes<HTMLElement> & {
	items: BreadcrumbItem[];
};

export function Breadcrumb({ items, className, ...props }: BreadcrumbProps) {
	return (
		<nav
			className={cx("cc-breadcrumb", className)}
			aria-label="Trilha de navegação"
			{...props}
		>
			<ol>
				{items.map((item, index) => {
					const current = item.current ?? index === items.length - 1;
					return (
						<li key={index}>
							{index > 0 && <ChevronRightIcon aria-hidden="true" />}
							{item.href && !current ? (
								<a href={item.href}>{item.label}</a>
							) : (
								<span aria-current={current ? "page" : undefined}>{item.label}</span>
							)}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}

export type NavItem = {
	label: ReactNode;
	href: string;
	active?: boolean;
	disabled?: boolean;
	icon?: ReactNode;
	count?: number | string;
};

export type PublicNavProps = HTMLAttributes<HTMLElement> & {
	brand: ReactNode;
	items: NavItem[];
	actions?: ReactNode;
	menuLabel?: string;
};

export function PublicNav({
	brand,
	items,
	actions,
	menuLabel = "Abrir menu",
	className,
	...props
}: PublicNavProps) {
	const [open, setOpen] = useState(false);
	const menuId = useId();
	const navigationRef = useRef<HTMLElement>(null);

	useEffect(() => {
		if (!open) return;

		const closeOnOutsidePress = (event: PointerEvent) => {
			if (!navigationRef.current?.contains(event.target as Node)) setOpen(false);
		};
		const closeOnEscape = (event: globalThis.KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};

		document.addEventListener("pointerdown", closeOnOutsidePress);
		document.addEventListener("keydown", closeOnEscape);
		return () => {
			document.removeEventListener("pointerdown", closeOnOutsidePress);
			document.removeEventListener("keydown", closeOnEscape);
		};
	}, [open]);

	return (
		<header ref={navigationRef} className={cx("cc-public-nav", className)} {...props}>
			<div className="cc-public-nav__inner">
				<div className="cc-public-nav__brand">{brand}</div>
				<nav
					id={menuId}
					className="cc-public-nav__links"
					aria-label="Navegação principal"
					data-open={open || undefined}
				>
					{items.map((item) =>
						item.disabled ? (
							<span key={item.href} aria-disabled="true" data-state="disabled">
								{item.label}
							</span>
						) : (
							<a
								key={item.href}
								href={item.href}
								aria-current={item.active ? "page" : undefined}
								data-state={item.active ? "active" : "default"}
								onClick={() => setOpen(false)}
							>
								{item.label}
							</a>
						),
					)}
				</nav>
				{actions && <div className="cc-public-nav__actions">{actions}</div>}
				<IconButton
					className="cc-public-nav__toggle"
					label={open ? "Fechar menu" : menuLabel}
					aria-controls={menuId}
					aria-expanded={open}
					onClick={() => setOpen((current) => !current)}
				>
					{open ? <CloseIcon /> : <MenuIcon />}
				</IconButton>
			</div>
		</header>
	);
}

export type AdminNavSection = {
	label?: string;
	items: NavItem[];
};

export type AdminNavProps = HTMLAttributes<HTMLElement> & {
	brand: ReactNode;
	sections: AdminNavSection[];
	user?: ReactNode;
	footer?: ReactNode;
};

export function AdminNav({
	brand,
	sections,
	user,
	footer,
	className,
	...props
}: AdminNavProps) {
	return (
		<aside className={cx("cc-admin-nav", className)} {...props}>
			<div className="cc-admin-nav__brand">{brand}</div>
			{user && <div className="cc-admin-nav__user">{user}</div>}
			<nav aria-label="Navegação administrativa">
				{sections.map((section, sectionIndex) => (
					<div className="cc-admin-nav__section" key={sectionIndex}>
						{section.label && <p>{section.label}</p>}
						{section.items.map((item) => {
							const content = (
								<>
									{item.icon && <span className="cc-admin-nav__icon">{item.icon}</span>}
									<span className="cc-admin-nav__text">{item.label}</span>
									{item.count !== undefined && (
										<span className="cc-admin-nav__count">{item.count}</span>
									)}
								</>
							);

							return item.disabled ? (
								<span
									key={item.href}
									className="cc-admin-nav__link"
									aria-disabled="true"
									data-state="disabled"
								>
									{content}
								</span>
							) : (
								<a
									key={item.href}
									href={item.href}
									className="cc-admin-nav__link"
									aria-current={item.active ? "page" : undefined}
									data-state={item.active ? "active" : "default"}
								>
									{content}
								</a>
							);
						})}
					</div>
				))}
			</nav>
			{footer && <div className="cc-admin-nav__footer">{footer}</div>}
		</aside>
	);
}
