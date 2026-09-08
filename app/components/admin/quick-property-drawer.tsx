import { useRef, useState } from "react";

import { createPropertySlug } from "~/modules/properties/admin";

import { Drawer } from "../ui";

export function QuickPropertyDrawer() {
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [slug, setSlug] = useState("");
	const [slugEdited, setSlugEdited] = useState(false);
	const firstFieldRef = useRef<HTMLInputElement>(null);

	return (
		<>
			<button
				className="cc-button cc-button--primary"
				type="button"
				onClick={() => setOpen(true)}
			>
				Cadastrar imóvel
			</button>
			<Drawer
				open={open}
				onOpenChange={setOpen}
				title="Novo rascunho"
				description="Registre o essencial agora e complete fotos e detalhes depois."
				initialFocusRef={firstFieldRef}
			>
				<form className="admin-quick-create" method="post" action="/admin/imoveis/novo">
					<input type="hidden" name="priceDisplay" value="on_request" />
					<label className="cc-field">
						<span className="cc-field__label">Código do imóvel</span>
						<input
							ref={firstFieldRef}
							className="cc-field__control"
							name="publicCode"
							placeholder="IMV-001"
							pattern="[A-Z0-9][A-Z0-9-]{2,31}"
							required
						/>
					</label>
					<label className="cc-field">
						<span className="cc-field__label">Título</span>
						<input
							className="cc-field__control"
							name="title"
							value={title}
							onChange={(event) => {
								const nextTitle = event.target.value;
								setTitle(nextTitle);
								if (!slugEdited) setSlug(createPropertySlug(nextTitle));
							}}
							minLength={3}
							maxLength={140}
							required
						/>
					</label>
					<label className="cc-field">
						<span className="cc-field__label">Endereço amigável</span>
						<input
							className="cc-field__control"
							name="slug"
							value={slug}
							onChange={(event) => {
								setSlugEdited(true);
								setSlug(createPropertySlug(event.target.value));
							}}
							placeholder="casa-em-cidreira"
							pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
							required
						/>
					</label>
					<div className="admin-quick-create__row">
						<label className="cc-field">
							<span className="cc-field__label">Finalidade</span>
							<select className="cc-field__control" name="purpose" defaultValue="sale">
								<option value="sale">Venda</option>
								<option value="rent">Aluguel</option>
							</select>
						</label>
						<label className="cc-field">
							<span className="cc-field__label">Tipo</span>
							<input
								className="cc-field__control"
								name="propertyType"
								minLength={2}
								required
							/>
						</label>
					</div>
					<div className="admin-quick-create__row">
						<label className="cc-field">
							<span className="cc-field__label">Cidade</span>
							<input className="cc-field__control" name="city" minLength={2} required />
						</label>
						<label className="cc-field">
							<span className="cc-field__label">Bairro</span>
							<input className="cc-field__control" name="neighborhood" required />
						</label>
					</div>
					<div className="admin-quick-create__actions">
						<a className="cc-button cc-button--ghost" href="/admin/imoveis/novo">
							Abrir formulário completo
						</a>
						<button className="cc-button cc-button--primary" type="submit">
							Salvar rascunho
						</button>
					</div>
				</form>
			</Drawer>
		</>
	);
}
