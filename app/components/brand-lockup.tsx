export type BrandLockupVariant = "header" | "footer" | "compact";

export interface BrandLockupProps {
	creci: string | null;
	variant: BrandLockupVariant;
	href?: string;
	accessibleName?: string;
	className?: string;
}

export function BrandLockup({
	creci,
	variant,
	href = "/",
	accessibleName = "Cris Chaves Corretor de Imóveis — início",
	className,
}: BrandLockupProps) {
	const classes = ["brand-lockup", `brand-lockup--${variant}`, className]
		.filter(Boolean)
		.join(" ");

	return (
		<a className={classes} href={href} aria-label={accessibleName}>
			<span className="brand-lockup__mark" aria-hidden="true">
				<picture>
					<source
						srcSet="/brand/cris-chaves-logo-header-274.webp 274w, /brand/cris-chaves-logo-header.webp 548w"
						sizes={variant === "footer" ? "208px" : "140px"}
						type="image/webp"
					/>
					<img
						src="/brand/cris-chaves-logo-header-274.png"
						alt=""
						width="274"
						height="128"
						decoding="async"
					/>
				</picture>
			</span>
			{creci && (
				<span className="brand-lockup__credential">
					<span className="brand-lockup__role">Corretor de imóveis</span>
					<span className="brand-lockup__creci">{creci}</span>
				</span>
			)}
		</a>
	);
}
