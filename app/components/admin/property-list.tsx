import type { ChangeEvent, HTMLAttributes, ReactNode } from "react";

import { BuildingIcon, EmptyState, Pagination, Skeleton } from "../ui";
import { cx } from "../ui/utils";

import type { AdminStatusBadgeProps } from "./status-badge";
import { AdminStatusBadge } from "./status-badge";

export type AdminPropertyListItem = {
	id: string;
	title: string;
	code: string;
	locationLabel: string;
	priceLabel: string;
	updatedLabel: string;
	image?: {
		src: string;
		width?: number;
		height?: number;
	};
	statuses: AdminStatusBadgeProps[];
	actions: ReactNode;
};

export type AdminPropertyListProps = HTMLAttributes<HTMLElement> & {
	items: AdminPropertyListItem[];
	searchLabel?: string;
	searchPlaceholder?: string;
	searchValue?: string;
	searchName?: string;
	searchAction?: string;
	onSearchChange?: (value: string) => void;
	tools?: ReactNode;
	emptyTitle: ReactNode;
	emptyDescription?: ReactNode;
	emptyAction?: ReactNode;
	caption?: string;
	pagination?: {
		page: number;
		totalPages: number;
		onPageChange?: (page: number) => void;
		loading?: boolean;
	};
};

export function AdminPropertyList({
	items,
	searchLabel = "Buscar imóveis",
	searchPlaceholder = "Buscar por código ou título",
	searchValue,
	searchName = "busca",
	searchAction,
	onSearchChange,
	tools,
	emptyTitle,
	emptyDescription,
	emptyAction,
	caption = "Imóveis cadastrados",
	pagination,
	className,
	...props
}: AdminPropertyListProps) {
	const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
		onSearchChange?.(event.currentTarget.value);
	};

	return (
		<section className={cx("admin-property-list", className)} {...props}>
			<form className="admin-table-tools" action={searchAction} method="get">
				<label className="admin-table-search">
					<span className="admin-visually-hidden">{searchLabel}</span>
					<input
						type="search"
						className="cc-field__control"
						placeholder={searchPlaceholder}
						name={searchName}
						{...(onSearchChange
							? { value: searchValue ?? "" }
							: { defaultValue: searchValue })}
						onChange={handleSearch}
					/>
				</label>
				<button className="cc-button cc-button--secondary" type="submit">
					Buscar
				</button>
				{tools && <div className="admin-table-tools__actions">{tools}</div>}
			</form>

			{items.length === 0 ? (
				<EmptyState
					className="admin-property-list__empty"
					title={emptyTitle}
					description={emptyDescription}
					action={emptyAction}
				/>
			) : (
				<div className="admin-data-table-wrap">
					<table className="admin-data-table">
						<caption className="admin-visually-hidden">{caption}</caption>
						<thead>
							<tr>
								<th scope="col">Imóvel</th>
								<th scope="col">Situação</th>
								<th scope="col">Preço</th>
								<th scope="col">Atualizado</th>
								<th scope="col">
									<span className="admin-visually-hidden">Ações</span>
								</th>
							</tr>
						</thead>
						<tbody>
							{items.map((item) => (
								<tr key={item.id}>
									<td data-label="Imóvel">
										<div className="admin-table-property">
											{item.image ? (
												<img
													src={item.image.src}
													alt=""
													width={item.image.width ?? 100}
													height={item.image.height ?? 76}
													loading="lazy"
												/>
											) : (
												<span
													className="admin-table-property__placeholder"
													aria-hidden="true"
												>
													<BuildingIcon />
												</span>
											)}
											<span className="admin-table-property__copy">
												<strong>{item.title}</strong>
												<small>
													{item.code} · {item.locationLabel}
												</small>
											</span>
										</div>
									</td>
									<td data-label="Situação">
										<div className="admin-table-statuses">
											{item.statuses.map((status, index) => (
												<AdminStatusBadge key={index} {...status} />
											))}
										</div>
									</td>
									<td className="admin-data-table__mono" data-label="Preço">
										{item.priceLabel}
									</td>
									<td data-label="Atualizado">{item.updatedLabel}</td>
									<td className="admin-data-table__actions" data-label="Ações">
										{item.actions}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{pagination && items.length > 0 && (
				<div className="admin-property-list__pagination">
					<Pagination {...pagination} />
				</div>
			)}
		</section>
	);
}

export function AdminPropertyListSkeleton({ rows = 4 }: { rows?: number }) {
	return (
		<div
			className="admin-property-list-skeleton"
			role="status"
			aria-label="Carregando imóveis"
		>
			<Skeleton className="admin-property-list-skeleton__search" />
			{Array.from({ length: rows }, (_, index) => (
				<div className="admin-property-list-skeleton__row" key={index}>
					<Skeleton className="admin-property-list-skeleton__image" />
					<div>
						<Skeleton shape="text" />
						<Skeleton shape="text" className="admin-property-list-skeleton__short" />
					</div>
					<Skeleton shape="text" />
					<Skeleton shape="text" />
				</div>
			))}
			<span className="admin-visually-hidden">Carregando imóveis</span>
		</div>
	);
}
