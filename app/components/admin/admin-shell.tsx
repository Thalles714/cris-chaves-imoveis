import type { HTMLAttributes, ReactNode } from "react";

import { AdminNav } from "../ui";
import type { AdminNavSection } from "../ui";
import { cx } from "../ui/utils";

export type AdminIdentity = {
	name: string;
	roleLabel: string;
	initials: string;
};

export type AdminShellProps = HTMLAttributes<HTMLDivElement> & {
	brand: ReactNode;
	navigation: AdminNavSection[];
	identity: AdminIdentity;
	pageTitle: ReactNode;
	status?: ReactNode;
	topbarActions?: ReactNode;
	sidebarFooter?: ReactNode;
	children: ReactNode;
};

/**
 * Structural shell only. Route guards, session data and no-store headers belong
 * to the route/server layer; this component intentionally receives them as UI.
 */
export function AdminShell({
	brand,
	navigation,
	identity,
	pageTitle,
	status,
	topbarActions,
	sidebarFooter,
	children,
	className,
	...props
}: AdminShellProps) {
	return (
		<div className={cx("admin-shell", className)} {...props}>
			<a className="admin-skip-link" href="#admin-main">
				Ir para o conteúdo
			</a>
			<AdminNav
				className="admin-shell__sidebar"
				brand={brand}
				sections={navigation}
				user={<AdminUser identity={identity} />}
				footer={sidebarFooter}
			/>
			<div className="admin-shell__workspace">
				<header className="admin-topbar">
					<strong className="admin-topbar__title">{pageTitle}</strong>
					<div className="admin-topbar__end">
						{status && <div className="admin-topbar__status">{status}</div>}
						{topbarActions && (
							<div className="admin-topbar__actions">{topbarActions}</div>
						)}
						<span className="admin-avatar" aria-hidden="true">
							{identity.initials}
						</span>
					</div>
				</header>
				<main id="admin-main" className="admin-shell__content" tabIndex={-1}>
					{children}
				</main>
			</div>
		</div>
	);
}

function AdminUser({ identity }: { identity: AdminIdentity }) {
	return (
		<div className="admin-user">
			<span className="admin-avatar" aria-hidden="true">
				{identity.initials}
			</span>
			<span className="admin-user__copy">
				<strong>{identity.name}</strong>
				<small>{identity.roleLabel}</small>
			</span>
		</div>
	);
}

export type AdminPageHeaderProps = HTMLAttributes<HTMLElement> & {
	eyebrow?: ReactNode;
	title: ReactNode;
	description?: ReactNode;
	actions?: ReactNode;
};

export function AdminPageHeader({
	eyebrow,
	title,
	description,
	actions,
	className,
	...props
}: AdminPageHeaderProps) {
	return (
		<header className={cx("admin-page-header", className)} {...props}>
			<div>
				{eyebrow && <p className="admin-page-header__eyebrow">{eyebrow}</p>}
				<h1>{title}</h1>
				{description && <p className="admin-page-header__description">{description}</p>}
			</div>
			{actions && <div className="admin-page-header__actions">{actions}</div>}
		</header>
	);
}
