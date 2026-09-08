import { useLocation } from "react-router";
import type { ReactNode } from "react";

import { BrandLockup } from "~/components/brand-lockup";
import { buildWhatsAppUrl, type PublicSiteConfig } from "~/lib/public-site/config";
import { PublicNav } from "~/components/ui";
import { AppearanceMenu } from "./appearance-menu";

function isActive(pathname: string, href: string) {
	return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SiteShell({
	site,
	children,
}: {
	site: PublicSiteConfig;
	children: ReactNode;
}) {
	const { pathname } = useLocation();
	const whatsappUrl = buildWhatsAppUrl(site.whatsappNumber);
	const navItems = [
		{ label: "Início", href: "/home" },
		{ label: "Imóveis", href: "/" },
		{ label: "Regiões", href: "/regioes" },
		{ label: "Sobre Cris", href: "/sobre-cris" },
		{ label: "Anuncie", href: "/anuncie-seu-imovel" },
		{ label: "Contato", href: "/contato" },
	].map((item) => ({ ...item, active: isActive(pathname, item.href) }));

	return (
		<>
			<a className="skip-link" href="#conteudo">
				Ir para o conteúdo
			</a>
			<PublicNav
				brand={<BrandLockup creci={site.creci} variant="header" />}
				items={navItems}
				actions={
					<>
						<a
							className="cc-button cc-button--primary site-header-cta"
							href={whatsappUrl ?? "/contato"}
							aria-label={whatsappUrl ? "Falar com Cris pelo WhatsApp" : "Contato"}
							target={whatsappUrl ? "_blank" : undefined}
							rel={whatsappUrl ? "noreferrer" : undefined}
						>
							<span className="site-header-cta__wide" aria-hidden="true">
								{whatsappUrl ? "Falar com Cris" : "Contato"}
							</span>
							<span className="site-header-cta__short" aria-hidden="true">
								Contato
							</span>
						</a>
						<AppearanceMenu />
					</>
				}
			/>
			{children}
			<footer className="site-footer">
				<div className="cc-container site-footer__grid">
					<div className="site-footer__brand">
						<BrandLockup creci={site.creci} variant="footer" />
						<p>
							Atendimento pessoal para encontrar, anunciar e decidir com clareza no
							Litoral Norte Gaúcho.
						</p>
					</div>
					<nav aria-label="Navegação do rodapé">
						<strong>Explore</strong>
						<a href="/">Imóveis</a>
						<a href="/regioes">Regiões</a>
						<a href="/sobre-cris">Sobre Cris</a>
						<a href="/anuncie-seu-imovel">Anuncie seu imóvel</a>
					</nav>
					<nav aria-label="Informações legais">
						<strong>Informações</strong>
						<a href="/contato">Contato</a>
						<a href="/privacidade">Privacidade</a>
						<a href="/termos">Termos de uso</a>
					</nav>
					<div className="site-footer__region">
						<strong>Onde eu atuo</strong>
						<p>{site.regions.join(" · ")}</p>
					</div>
				</div>
				<div className="cc-container site-footer__bottom">
					<span>© {new Date().getFullYear()} Cris Chaves Corretor de Imóveis</span>
					<a href="#topo">Voltar ao topo ↑</a>
				</div>
			</footer>
		</>
	);
}
