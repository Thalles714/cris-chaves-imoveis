import { useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";

import { HeartIcon } from "./icons";
import { Badge, IconButton, Skeleton } from "./primitives";
import type { StatusTone } from "./primitives";
import { cx } from "./utils";

export type PropertyFact = {
	label: string;
	value: ReactNode;
};

export type PropertyCardProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
	title: ReactNode;
	href?: string;
	imageSrc?: string;
	imageAlt?: string;
	location?: ReactNode;
	purpose?: ReactNode;
	price?: ReactNode;
	code?: ReactNode;
	status?: ReactNode;
	statusTone?: StatusTone;
	facts?: PropertyFact[];
	favorite?: boolean;
	onFavoriteChange?: (favorite: boolean) => void;
	favoriteControl?: boolean;
	disabled?: boolean;
	loading?: boolean;
	state?: "default" | "active" | "success" | "error";
};

export function PropertyCard({
	title,
	href,
	imageSrc,
	imageAlt = "",
	location,
	purpose,
	price,
	code,
	status,
	statusTone = "success",
	facts = [],
	favorite = false,
	onFavoriteChange,
	favoriteControl = false,
	disabled = false,
	loading = false,
	state = "default",
	className,
	...props
}: PropertyCardProps) {
	const [localFavorite, setLocalFavorite] = useState(favorite);
	const visibleFavorite = onFavoriteChange ? favorite : localFavorite;

	if (loading) {
		return (
			<article
				className={cx("cc-property-card", className)}
				aria-busy="true"
				aria-label="Carregando imóvel"
				data-state="loading"
				{...props}
			>
				<Skeleton className="cc-property-card__media" />
				<div className="cc-property-card__body">
					<Skeleton shape="text" style={{ width: "38%" }} />
					<Skeleton shape="text" style={{ width: "76%" }} />
					<Skeleton shape="text" style={{ width: "52%" }} />
				</div>
			</article>
		);
	}

	const interactiveHref = disabled ? undefined : href;
	const visibleStatus =
		status ??
		(state === "error"
			? "Requer atenção"
			: state === "success"
				? "Atualizado"
				: undefined);
	const visibleStatusTone =
		state === "error" ? "error" : state === "success" ? "success" : statusTone;
	return (
		<article
			className={cx("cc-property-card", className)}
			data-state={state}
			data-disabled={disabled || undefined}
			{...props}
		>
			<div className="cc-property-card__media">
				{imageSrc ? (
					<img src={imageSrc} alt={imageAlt} loading="lazy" decoding="async" />
				) : (
					<div className="cc-property-card__placeholder" aria-hidden="true" />
				)}
				{code && <span className="cc-property-card__code">{code}</span>}
				{(favoriteControl || onFavoriteChange) && (
					<IconButton
						className="cc-property-card__favorite"
						label={visibleFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
						aria-pressed={visibleFavorite}
						rounded
						disabled={disabled}
						state={visibleFavorite ? "active" : "default"}
						onClick={() => {
							const nextFavorite = !visibleFavorite;
							if (onFavoriteChange) onFavoriteChange(nextFavorite);
							else setLocalFavorite(nextFavorite);
						}}
					>
						<HeartIcon filled={visibleFavorite} />
					</IconButton>
				)}
			</div>
			<div className="cc-property-card__body">
				<div className="cc-property-card__header">
					{(purpose || location) && (
						<p className="cc-property-card__place">
							{purpose}
							{purpose && location && <span aria-hidden="true"> · </span>}
							{location}
						</p>
					)}
					{visibleStatus && <Badge tone={visibleStatusTone}>{visibleStatus}</Badge>}
				</div>
				<h3 className="cc-property-card__title">
					{interactiveHref ? (
						<a
							href={interactiveHref}
							aria-current={state === "active" ? "page" : undefined}
						>
							{title}
						</a>
					) : (
						<span>{title}</span>
					)}
				</h3>
				{price && <div className="cc-property-card__price">{price}</div>}
				{facts.length > 0 && (
					<dl className="cc-property-card__facts">
						{facts.map((fact) => (
							<div key={fact.label}>
								<dt>{fact.label}</dt>
								<dd>{fact.value}</dd>
							</div>
						))}
					</dl>
				)}
			</div>
		</article>
	);
}
