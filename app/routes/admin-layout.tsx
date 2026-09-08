import { data, Form, Outlet, useLocation } from "react-router";

import { AdminShell } from "~/components/admin";
import { AppearanceMenu } from "~/components/appearance-menu";
import { BrandLockup } from "~/components/brand-lockup";
import { AuditIcon, BuildingIcon, HomeIcon, PlusIcon, UsersIcon } from "~/components/ui";
import { loadPublicSiteContext } from "~/lib/public-site/loader.server";
import "~/styles/admin.css";

import type { Route } from "./+types/admin-layout";
import { adminResponseHeaders, requireAdminRoute } from "./admin-route-helpers.server";

export function headers() {
	return adminResponseHeaders();
}

export async function loader({ request, context }: Route.LoaderArgs) {
	const { session, responseHeaders } = await requireAdminRoute(
		request,
		context,
		"admin.read",
	);
	const site = loadPublicSiteContext(request, context);
	return data(
		{ role: session.role, creci: site.creci },
		{ headers: adminResponseHeaders(responseHeaders) },
	);
}

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
	const { pathname } = useLocation();
	const onProperties = pathname.startsWith("/admin/imoveis");
	const onAudit = pathname.startsWith("/admin/auditoria");
	const onMembers = pathname.startsWith("/admin/membros");
	const pageTitle = onProperties
		? "Imóveis"
		: onAudit
			? "Auditoria"
			: onMembers
				? "Equipe"
				: "Visão geral";

	return (
		<AdminShell
			brand={
				<BrandLockup
					className="admin-brand"
					creci={loaderData.creci}
					variant="compact"
					href="/admin"
					accessibleName="Administração Cris Chaves — visão geral"
				/>
			}
			navigation={[
				{
					label: "Operação",
					items: [
						{
							label: "Visão geral",
							href: "/admin",
							active: pathname === "/admin",
							icon: <HomeIcon />,
						},
						{
							label: "Meus imóveis",
							href: "/admin/imoveis",
							active: onProperties && pathname !== "/admin/imoveis/novo",
							icon: <BuildingIcon />,
						},
						{
							label: "Cadastrar imóvel",
							href: "/admin/imoveis/novo",
							active: pathname === "/admin/imoveis/novo",
							icon: <PlusIcon />,
						},
					],
				},
				...(loaderData.role === "owner"
					? [
							{
								label: "Administração",
								items: [
									{
										label: "Equipe",
										href: "/admin/membros",
										active: onMembers,
										icon: <UsersIcon />,
									},
									{
										label: "Auditoria",
										href: "/admin/auditoria",
										active: onAudit,
										icon: <AuditIcon />,
									},
								],
							},
						]
					: []),
			]}
			identity={{
				name: "Conta administrativa",
				roleLabel: loaderData.role === "owner" ? "Proprietário" : "Editor",
				initials: loaderData.role === "owner" ? "PR" : "ED",
			}}
			pageTitle={pageTitle}
			status={<span className="admin-session-status">MFA confirmado</span>}
			topbarActions={
				<>
					<AppearanceMenu />
					<Form action="/admin/sair" method="post">
						<button className="cc-button cc-button--ghost" type="submit">
							Sair
						</button>
					</Form>
				</>
			}
			sidebarFooter={
				<a className="cc-button cc-button--secondary admin-public-site-link" href="/">
					Ver site público
				</a>
			}
		>
			<Outlet />
		</AdminShell>
	);
}
