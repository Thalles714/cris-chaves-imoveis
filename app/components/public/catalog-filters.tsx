import { useState, useSyncExternalStore } from "react";

import { Drawer, Modal } from "~/components/ui";

const desktopQuery = "(min-width: 48rem)";
const preservedSearchKeys = [
	"finalidade",
	"tipo",
	"cidade",
	"bairro",
	"preco_min",
	"preco_max",
	"dormitorios",
	"vagas",
	"codigo",
] as const;

function subscribeToDesktopQuery(onChange: () => void) {
	const query = window.matchMedia(desktopQuery);
	query.addEventListener("change", onChange);
	return () => query.removeEventListener("change", onChange);
}

function getDesktopSnapshot() {
	return window.matchMedia(desktopQuery).matches;
}

function getServerDesktopSnapshot() {
	return true;
}

function subscribeToHydration() {
	return () => undefined;
}

function getHydratedSnapshot() {
	return true;
}

function getServerHydratedSnapshot() {
	return false;
}

export function CatalogSearch({ filters }: { filters: Record<string, string> }) {
	return (
		<form className="cc-catalog-search" method="get" action="/" role="search">
			<label htmlFor="catalog-search">Buscar imóveis</label>
			<div className="cc-catalog-search__field">
				<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
					<circle cx="11" cy="11" r="7" />
					<path d="m16.5 16.5 4 4" />
				</svg>
				<input
					id="catalog-search"
					name="busca"
					defaultValue={filters.busca}
					placeholder="Cidade, bairro ou característica"
					minLength={2}
					maxLength={160}
					autoComplete="off"
				/>
				{preservedSearchKeys.map((key) =>
					filters[key] ? (
						<input key={key} type="hidden" name={key} value={filters[key]} />
					) : null,
				)}
				<button type="submit">Buscar</button>
			</div>
		</form>
	);
}

function CatalogFilterForm({
	filters,
	regions,
}: {
	filters: Record<string, string>;
	regions: readonly string[];
}) {
	return (
		<form
			id="catalog-filter-form"
			className="cc-catalog-filter-form"
			method="get"
			action="/"
		>
			<label className="cc-catalog-filter-form__wide">
				<span>Busca livre</span>
				<input
					name="busca"
					defaultValue={filters.busca}
					placeholder="Praia, pátio, lareira..."
					minLength={2}
					maxLength={160}
				/>
			</label>
			<label>
				<span>Finalidade</span>
				<select name="finalidade" defaultValue={filters.finalidade ?? ""}>
					<option value="">Comprar ou alugar</option>
					<option value="venda">Comprar</option>
					<option value="aluguel">Alugar</option>
				</select>
			</label>
			<label>
				<span>Tipo de imóvel</span>
				<input
					name="tipo"
					defaultValue={filters.tipo}
					placeholder="Casa, apartamento..."
					minLength={2}
					maxLength={80}
				/>
			</label>
			<label>
				<span>Cidade</span>
				<select name="cidade" defaultValue={filters.cidade ?? ""}>
					<option value="">Todas as cidades</option>
					{regions.map((region) => (
						<option key={region} value={region}>
							{region}
						</option>
					))}
				</select>
			</label>
			<label>
				<span>Bairro</span>
				<input
					name="bairro"
					defaultValue={filters.bairro}
					placeholder="Nome do bairro"
					maxLength={120}
				/>
			</label>
			<label>
				<span>Preço mínimo</span>
				<input
					name="preco_min"
					type="number"
					inputMode="numeric"
					min="0"
					max="1000000000"
					step="1000"
					defaultValue={filters.preco_min}
				/>
			</label>
			<label>
				<span>Preço máximo</span>
				<input
					name="preco_max"
					type="number"
					inputMode="numeric"
					min="0"
					max="1000000000"
					step="1000"
					defaultValue={filters.preco_max}
				/>
			</label>
			<label>
				<span>Dormitórios (mínimo)</span>
				<input
					name="dormitorios"
					type="number"
					inputMode="numeric"
					min="0"
					max="100"
					defaultValue={filters.dormitorios}
				/>
			</label>
			<label>
				<span>Vagas (mínimo)</span>
				<input
					name="vagas"
					type="number"
					inputMode="numeric"
					min="0"
					max="100"
					defaultValue={filters.vagas}
				/>
			</label>
			<label className="cc-catalog-filter-form__wide">
				<span>Código do imóvel</span>
				<input
					name="codigo"
					defaultValue={filters.codigo}
					placeholder="Ex.: CC-1024"
					pattern="[A-Za-z0-9][A-Za-z0-9-]{2,31}"
					maxLength={32}
					autoCapitalize="characters"
				/>
			</label>
			<div className="cc-catalog-filter-form__actions cc-catalog-filter-form__wide">
				<a className="cc-button cc-button--secondary" href="/">
					<span>Limpar filtros</span>
				</a>
				<button className="cc-button cc-button--primary" type="submit">
					<span>Aplicar filtros</span>
				</button>
			</div>
		</form>
	);
}

export function CatalogFilters({
	filters,
	regions,
}: {
	filters: Record<string, string>;
	regions: readonly string[];
}) {
	const [open, setOpen] = useState(false);
	const mounted = useSyncExternalStore(
		subscribeToHydration,
		getHydratedSnapshot,
		getServerHydratedSnapshot,
	);
	const desktop = useSyncExternalStore(
		subscribeToDesktopQuery,
		getDesktopSnapshot,
		getServerDesktopSnapshot,
	);
	const activeCount = Object.entries(filters).filter(
		([key, value]) => key !== "pagina" && value.trim().length > 0,
	).length;
	const triggerLabel = activeCount
		? `Filtros, ${activeCount} ${activeCount === 1 ? "ativo" : "ativos"}`
		: "Filtros";
	const content = <CatalogFilterForm filters={filters} regions={regions} />;

	return (
		<>
			<button
				className="cc-button cc-button--secondary cc-catalog-filter-trigger"
				type="button"
				aria-controls="catalog-filter-dialog"
				aria-expanded={open}
				aria-disabled={!mounted}
				disabled={!mounted}
				data-hydrated={mounted || undefined}
				onClick={() => setOpen(true)}
			>
				<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
					<path d="M4 7h16M7 12h10M10 17h4" />
				</svg>
				<span>{triggerLabel}</span>
			</button>
			{desktop ? (
				<Modal
					id="catalog-filter-dialog"
					className="cc-catalog-filter-overlay"
					open={open}
					onOpenChange={setOpen}
					title="Filtrar imóveis"
					description="Refine a seleção sem perder o contexto da sua busca."
				>
					{content}
				</Modal>
			) : (
				<Drawer
					id="catalog-filter-dialog"
					className="cc-catalog-filter-overlay cc-catalog-filter-overlay--mobile"
					open={open}
					onOpenChange={setOpen}
					title="Filtrar imóveis"
					description="Ajuste os filtros e veja a seleção atualizada."
					position="right"
				>
					{content}
				</Drawer>
			)}
		</>
	);
}
