import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
	layout("routes/public-layout.tsx", [
		index("routes/properties.tsx"),
		route("home", "routes/home.tsx"),
		route("imoveis", "routes/properties-legacy.tsx"),
		route("imoveis/:slug", "routes/property-detail.tsx"),
		route("regioes", "routes/regions.tsx"),
		route("sobre-cris", "routes/about.tsx"),
		route("anuncie-seu-imovel", "routes/sell.tsx"),
		route("contato", "routes/contact.tsx"),
		route("privacidade", "routes/privacy.tsx"),
		route("termos", "routes/terms.tsx"),
	]),
	route("admin/entrar", "routes/admin-login.tsx"),
	route("admin/recuperar-senha", "routes/admin-recovery.tsx"),
	route("admin/auth/callback", "routes/admin-auth-callback.ts"),
	route("admin/convite", "routes/admin-invite-accept.tsx"),
	route("admin/redefinir-senha", "routes/admin-password-reset.tsx"),
	route("admin/mfa", "routes/admin-mfa.tsx"),
	route("admin/sair", "routes/admin-logout.ts"),
	route(
		"admin/imoveis/:propertyId/midia/upload",
		"routes/admin-property-media-upload.ts",
	),
	route(
		"admin/imoveis/:propertyId/midia/:mediaId/preview",
		"routes/admin-property-media-preview.ts",
	),
	layout("routes/admin-layout.tsx", [
		route("admin", "routes/admin-dashboard.tsx"),
		route("admin/imoveis", "routes/admin-properties.tsx"),
		route("admin/imoveis/novo", "routes/admin-property-new.tsx"),
		route("admin/imoveis/:propertyId", "routes/admin-property-edit.tsx"),
		route("admin/imoveis/:propertyId/midia", "routes/admin-property-media.tsx"),
		route("admin/imoveis/:propertyId/revisar", "routes/admin-property-review.tsx"),
		route("admin/auditoria", "routes/admin-audit.tsx"),
		route("admin/membros", "routes/admin-members.tsx"),
	]),
	route("media/:mediaCode", "routes/media.ts"),
	route("robots.txt", "routes/robots.ts"),
	route("sitemap.xml", "routes/sitemap.ts"),
] satisfies RouteConfig;
