export const approvedRegions = [
	"Cidreira",
	"Tramandaí",
	"Balneário Pinhal",
	"Magistério",
	"Quintão",
] as const;

export interface PublicSiteConfig {
	brandName: "Cris Chaves Corretor de Imóveis";
	shortBrandName: "Cris Chaves";
	canonicalOrigin: string;
	canonicalUrl: string;
	creci: string | null;
	whatsappNumber: string | null;
	regions: typeof approvedRegions;
	contactFormAvailable: false;
}

export function buildWhatsAppUrl(
	number: string | null,
	options: { propertyCode?: string; canonicalUrl?: string } = {},
) {
	if (!number) return null;
	const parts = ["Olá, Cris. Encontrei seu site e gostaria de conversar sobre imóveis."];
	if (options.propertyCode) parts.push(`Código: ${options.propertyCode}.`);
	if (options.canonicalUrl) parts.push(`Link: ${options.canonicalUrl}`);
	return `https://wa.me/${number}?text=${encodeURIComponent(parts.join(" "))}`;
}
