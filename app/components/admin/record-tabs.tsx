export function AdminRecordTabs({
	propertyId,
	active,
}: {
	propertyId: string;
	active: "details" | "media" | "review";
}) {
	return (
		<nav className="admin-record-tabs cc-tabs__list" aria-label="Seções do imóvel">
			<a
				className="cc-tabs__tab"
				data-state={active === "details" ? "active" : "default"}
				aria-current={active === "details" ? "page" : undefined}
				href={`/admin/imoveis/${propertyId}`}
			>
				1. Informações
			</a>
			<a
				className="cc-tabs__tab"
				data-state={active === "media" ? "active" : "default"}
				aria-current={active === "media" ? "page" : undefined}
				href={`/admin/imoveis/${propertyId}/midia`}
			>
				2. Fotos e vídeos
			</a>
			<a
				className="cc-tabs__tab"
				data-state={active === "review" ? "active" : "default"}
				aria-current={active === "review" ? "page" : undefined}
				href={`/admin/imoveis/${propertyId}/revisar`}
			>
				3. Revisar e publicar
			</a>
		</nav>
	);
}
