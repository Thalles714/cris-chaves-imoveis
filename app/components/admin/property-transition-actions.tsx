import { useId, useState } from "react";

import type { AdminPropertyEditRecord } from "~/modules/properties/admin";

import { Modal } from "../ui";

type Transition =
	| "publish"
	| "archive"
	| "restore"
	| "reserve"
	| "releaseReservation"
	| "markSold"
	| "softDelete";

type TransitionButtonProps = {
	property: Pick<AdminPropertyEditRecord, "id" | "version">;
	transition: Transition;
	label: string;
	confirmation?: string;
	tone?: "primary" | "secondary" | "danger";
};

function TransitionButton({
	property,
	transition,
	label,
	confirmation,
	tone = "secondary",
}: TransitionButtonProps) {
	const [confirmOpen, setConfirmOpen] = useState(false);
	const confirmationFormId = useId();
	const buttonClass = `cc-button cc-button--${tone}`;
	const fields = (
		<>
			<input type="hidden" name="intent" value="transition" />
			<input type="hidden" name="transition" value={transition} />
			<input type="hidden" name="expectedVersion" value={property.version} />
			<input type="hidden" name="returnTo" value="review" />
		</>
	);

	if (!confirmation) {
		return (
			<form method="post">
				{fields}
				<button className={buttonClass} type="submit">
					{label}
				</button>
			</form>
		);
	}

	return (
		<>
			<button className={buttonClass} type="button" onClick={() => setConfirmOpen(true)}>
				{label}
			</button>
			<Modal
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				title="Confirme a alteração"
				description={confirmation}
				footer={
					<>
						<button
							className="cc-button cc-button--secondary"
							type="button"
							onClick={() => setConfirmOpen(false)}
						>
							Cancelar
						</button>
						<form id={confirmationFormId} method="post">
							{fields}
							<button className={buttonClass} type="submit">
								Confirmar
							</button>
						</form>
					</>
				}
			>
				{transition === "publish" ? (
					<label className="admin-publication-confirmation">
						<input
							type="checkbox"
							name="authorizationConfirmed"
							value="true"
							form={confirmationFormId}
							required
						/>
						<span>
							Confirmo que tenho a autorização escrita do proprietário para anunciar este
							imóvel.
						</span>
					</label>
				) : (
					<p>Revise a informação antes de continuar.</p>
				)}
			</Modal>
		</>
	);
}

export function AdminPropertyTransitionActions({
	property,
	publicationReady,
}: {
	property: Pick<
		AdminPropertyEditRecord,
		"id" | "version" | "publicationStatus" | "dealStatus" | "isDeleted"
	>;
	publicationReady: boolean;
}) {
	return (
		<section className="admin-transition-panel" aria-labelledby="property-actions-title">
			<div className="admin-transition-panel__heading">
				<div>
					<p className="admin-publication-checklist__eyebrow">Próxima ação</p>
					<h2 id="property-actions-title">Decida o que acontece com este imóvel</h2>
				</div>
				{property.publicationStatus === "draft" &&
					!publicationReady &&
					!property.isDeleted && (
						<span className="admin-transition-panel__hint">
							Conclua o checklist antes de publicar.
						</span>
					)}
			</div>
			<div className="admin-transition-actions">
				{property.publicationStatus === "draft" &&
					publicationReady &&
					!property.isDeleted && (
						<TransitionButton
							property={property}
							transition="publish"
							label="Publicar imóvel"
							confirmation="Publicar este imóvel no site agora?"
							tone="primary"
						/>
					)}
				{property.publicationStatus !== "archived" && !property.isDeleted && (
					<TransitionButton
						property={property}
						transition="archive"
						label="Arquivar"
						confirmation="Arquivar este imóvel e removê-lo do catálogo público?"
					/>
				)}
				{(property.publicationStatus === "archived" || property.isDeleted) && (
					<TransitionButton
						property={property}
						transition="restore"
						label="Restaurar como rascunho"
					/>
				)}
				{property.dealStatus === "available" && !property.isDeleted && (
					<TransitionButton
						property={property}
						transition="reserve"
						label="Marcar como reservado"
					/>
				)}
				{property.dealStatus === "reserved" && !property.isDeleted && (
					<TransitionButton
						property={property}
						transition="releaseReservation"
						label="Liberar reserva"
						confirmation="Liberar a reserva e tornar este imóvel disponível novamente?"
					/>
				)}
				{property.dealStatus !== "sold" && !property.isDeleted && (
					<TransitionButton
						property={property}
						transition="markSold"
						label="Marcar como vendido"
						confirmation="Confirmar que este imóvel foi vendido?"
					/>
				)}
				{!property.isDeleted && (
					<TransitionButton
						property={property}
						transition="softDelete"
						label="Mover para excluídos"
						confirmation="Mover este imóvel para excluídos? Ele poderá ser restaurado depois."
						tone="danger"
					/>
				)}
			</div>
		</section>
	);
}
