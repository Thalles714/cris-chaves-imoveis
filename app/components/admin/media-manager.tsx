import { createClient } from "@supabase/supabase-js";
import { Form, useRevalidator } from "react-router";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import {
	adminImageUploadGrantSchema,
	type AdminMediaItem,
} from "~/modules/media/admin/admin-media";
import { processImageInBrowser, type ProcessedBrowserImage } from "~/modules/media";
import { Modal } from "~/components/ui";

import { AdminEmpty, AdminMutationFeedback } from "./feedback";

const WATERMARK_TEXT = "Cris Chaves";

type UploadStage = "idle" | "processing" | "planning" | "uploading" | "confirming";

type QueuedImage = {
	id: string;
	file: File;
	previewUrl: string;
	altText: string;
	sortOrder: number;
};

function assetDescriptor(image: ProcessedBrowserImage) {
	return {
		mimeType: image.output.mimeType,
		byteLength: image.output.byteLength,
		width: image.output.width,
		height: image.output.height,
		checksumSha256: image.checksumSha256,
	};
}

function stageLabel(stage: UploadStage) {
	switch (stage) {
		case "processing":
			return "Preparando e removendo metadados…";
		case "planning":
			return "Validando o envio…";
		case "uploading":
			return "Enviando original e versão pública…";
		case "confirming":
			return "Confirmando os arquivos…";
		default:
			return "";
	}
}

async function readJson(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return null;
	}
}

function responseError(payload: unknown) {
	if (
		typeof payload === "object" &&
		payload !== null &&
		"error" in payload &&
		typeof payload.error === "string"
	) {
		return payload.error;
	}
	return "Não foi possível concluir o envio. Tente novamente.";
}

function friendlyUploadError(error: unknown, stage: UploadStage) {
	const code =
		typeof error === "object" && error !== null && "code" in error
			? String(error.code)
			: "";
	if (code === "SOURCE_TOO_LARGE" || code === "OUTPUT_TOO_LARGE") {
		return "A imagem ultrapassa o limite de 8 MB. Escolha uma versão menor e tente novamente.";
	}
	if (
		code === "SOURCE_DIMENSIONS_OUT_OF_RANGE" ||
		code === "DECODED_DIMENSIONS_INVALID"
	) {
		return "A imagem precisa ter pelo menos 320 × 240 pixels e não pode exceder os limites de resolução.";
	}
	if (
		code === "INVALID_SOURCE_FILE" ||
		code === "SOURCE_TYPE_MISMATCH" ||
		code === "OUTPUT_TYPE_MISMATCH"
	) {
		return "O arquivo não é uma imagem PNG, JPEG ou WebP válida. Exporte a foto novamente e tente de novo.";
	}
	if (error instanceof Error && /^[A-ZÀ-Ú][^:]+[.!?]$/u.test(error.message)) {
		return error.message;
	}
	if (stage === "processing") {
		return "Não foi possível preparar a imagem. Confirme o formato, o tamanho e a resolução do arquivo.";
	}
	if (stage === "uploading") {
		return "O envio foi interrompido. A foto continua na fila para você tentar novamente.";
	}
	return "Não foi possível confirmar a foto. Ela continua na fila para uma nova tentativa.";
}

function MediaArchiveControl({ item }: { item: AdminMediaItem }) {
	const [open, setOpen] = useState(false);
	const label = item.kind === "image" ? "foto" : "vídeo";
	const article = item.kind === "image" ? "esta" : "este";
	return (
		<>
			<button
				className="cc-button cc-button--ghost admin-media-item__remove"
				type="button"
				onClick={() => setOpen(true)}
			>
				Ocultar {label}
			</button>
			<Modal
				open={open}
				onOpenChange={setOpen}
				title={`Ocultar ${article} ${label}?`}
				description="Ela deixará de aparecer neste anúncio, mas continuará guardada com segurança para recuperação."
				footer={
					<>
						<button
							className="cc-button cc-button--secondary"
							type="button"
							onClick={() => setOpen(false)}
						>
							Cancelar
						</button>
						<Form method="post">
							<input type="hidden" name="intent" value="archive-media" />
							<input type="hidden" name="mediaId" value={item.id} />
							<input type="hidden" name="expectedVersion" value={item.version} />
							<button className="cc-button cc-button--primary" type="submit">
								Sim, ocultar
							</button>
						</Form>
					</>
				}
			>
				<p>
					Use esta opção quando a mídia mostrar pessoas, documentos ou o endereço exato.
				</p>
			</Modal>
		</>
	);
}

export function AdminMediaManager({
	propertyId,
	items,
	maxImages,
}: {
	propertyId: string;
	items: readonly AdminMediaItem[];
	maxImages: number;
}) {
	const revalidator = useRevalidator();
	const imageCount = items.filter((item) => item.kind === "image").length;
	const fileInput = useRef<HTMLInputElement>(null);
	const queueSequence = useRef(0);
	const previewUrls = useRef(new Set<string>());
	const [queue, setQueue] = useState<QueuedImage[]>([]);
	const [isCover, setIsCover] = useState(imageCount === 0);
	const [privacyReviewed, setPrivacyReviewed] = useState(false);
	const [stage, setStage] = useState<UploadStage>("idle");
	const [progress, setProgress] = useState<{ current: number; total: number } | null>(
		null,
	);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const endpoint = `/admin/imoveis/${propertyId}/midia/upload`;
	const busy = stage !== "idle";

	useEffect(() => {
		const activePreviewUrls = previewUrls.current;
		return () => {
			for (const previewUrl of activePreviewUrls) URL.revokeObjectURL(previewUrl);
		};
	}, []);

	function chooseFile(event: ChangeEvent<HTMLInputElement>) {
		const selectedFiles = Array.from(event.target.files ?? []);
		event.target.value = "";
		if (selectedFiles.length === 0) return;
		const availableSlots = maxImages - imageCount - queue.length;
		if (selectedFiles.length > availableSlots) {
			setError(
				`Você pode adicionar mais ${availableSlots} ${availableSlots === 1 ? "foto" : "fotos"} a este imóvel.`,
			);
			return;
		}
		const invalidFile = selectedFiles.find(
			(file) => !["image/png", "image/jpeg", "image/webp"].includes(file.type),
		);
		if (invalidFile) {
			setError(
				`O arquivo “${invalidFile.name}” não é compatível. Use imagens PNG, JPEG ou WebP.`,
			);
			return;
		}

		const firstSortOrder = imageCount + queue.length;
		const additions = selectedFiles.map((file, index): QueuedImage => {
			const previewUrl = URL.createObjectURL(file);
			previewUrls.current.add(previewUrl);
			queueSequence.current += 1;
			return {
				id: `queued-image-${queueSequence.current}`,
				file,
				previewUrl,
				altText: "",
				sortOrder: firstSortOrder + index,
			};
		});
		setQueue((current) => [...current, ...additions]);
		setPrivacyReviewed(false);
		setError(null);
		setSuccess(null);
	}

	function updateQueuedImage(
		id: string,
		change: Partial<Pick<QueuedImage, "altText" | "sortOrder">>,
	) {
		setQueue((current) =>
			current.map((item) => (item.id === id ? { ...item, ...change } : item)),
		);
	}

	function removeQueuedImage(id: string) {
		setQueue((current) => {
			const removed = current.find((item) => item.id === id);
			if (removed) {
				URL.revokeObjectURL(removed.previewUrl);
				previewUrls.current.delete(removed.previewUrl);
			}
			return current.filter((item) => item.id !== id);
		});
		setPrivacyReviewed(false);
	}

	async function uploadImage(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (queue.length === 0 || queue.some((item) => !item.altText.trim())) {
			setError("Selecione as imagens e preencha a descrição de cada foto.");
			return;
		}
		if (!privacyReviewed) {
			setError("Revise a foto e confirme que ela não expõe pessoas ou dados privados.");
			return;
		}
		setError(null);
		setSuccess(null);
		const batch = [...queue];
		let completed = 0;
		let currentStage: UploadStage = "processing";

		try {
			for (const [index, queuedImage] of batch.entries()) {
				setProgress({ current: index + 1, total: batch.length });
				currentStage = "processing";
				setStage(currentStage);
				const original = await processImageInBrowser(queuedImage.file);
				const cleanFile = new File([original.blob], original.opaqueFileName, {
					type: original.output.mimeType,
				});
				const publicDerivative = await processImageInBrowser(cleanFile, {
					outputMimeType: original.output.mimeType,
					watermarkText: WATERMARK_TEXT,
				});

				currentStage = "planning";
				setStage(currentStage);
				const planBody = new URLSearchParams({
					intent: "plan-image",
					original: JSON.stringify(assetDescriptor(original)),
					publicDerivative: JSON.stringify(assetDescriptor(publicDerivative)),
					altText: queuedImage.altText.trim(),
					sortOrder: String(queuedImage.sortOrder),
					isCover: String(isCover && index === 0),
					privacyReviewed: "true",
				});
				const planResponse = await fetch(endpoint, { method: "POST", body: planBody });
				const planPayload = await readJson(planResponse);
				if (!planResponse.ok || typeof planPayload !== "object" || planPayload === null) {
					throw new Error(responseError(planPayload));
				}
				const grant = adminImageUploadGrantSchema.parse(
					"grant" in planPayload ? planPayload.grant : null,
				);

				currentStage = "uploading";
				setStage(currentStage);
				const storage = createClient(grant.supabaseUrl, grant.publishableKey, {
					auth: {
						persistSession: false,
						autoRefreshToken: false,
						detectSessionInUrl: false,
					},
				});
				const originalUpload = await storage.storage
					.from(grant.original.plan.bucket)
					.uploadToSignedUrl(
						grant.original.plan.objectPath,
						grant.original.uploadToken,
						original.blob,
						{ contentType: grant.original.plan.mimeType },
					);
				if (originalUpload.error) {
					throw new Error("O envio do arquivo original foi interrompido.");
				}
				const publicUpload = await storage.storage
					.from(grant.publicDerivative.plan.bucket)
					.uploadToSignedUrl(
						grant.publicDerivative.plan.objectPath,
						grant.publicDerivative.uploadToken,
						publicDerivative.blob,
						{ contentType: grant.publicDerivative.plan.mimeType },
					);
				if (publicUpload.error) {
					throw new Error("O envio da versão pública foi interrompido.");
				}

				currentStage = "confirming";
				setStage(currentStage);
				const confirmResponse = await fetch(endpoint, {
					method: "POST",
					body: new URLSearchParams({
						intent: "confirm-image",
						mediaId: grant.mediaId,
						expectedVersion: String(grant.mediaVersion),
						isCover: String(grant.publicDerivative.plan.isCover),
					}),
				});
				const confirmPayload = await readJson(confirmResponse);
				if (!confirmResponse.ok) throw new Error(responseError(confirmPayload));

				completed += 1;
				if (isCover && index === 0) setIsCover(false);
				URL.revokeObjectURL(queuedImage.previewUrl);
				previewUrls.current.delete(queuedImage.previewUrl);
				setQueue((current) => current.filter((item) => item.id !== queuedImage.id));
			}

			setPrivacyReviewed(false);
			setIsCover(false);
			if (fileInput.current) fileInput.current.value = "";
			setSuccess(
				`${completed} ${completed === 1 ? "foto enviada" : "fotos enviadas"} com marca d’água e privacidade confirmadas.`,
			);
		} catch (caught) {
			const currentImage = batch[completed];
			setError(
				`${currentImage ? `A foto “${currentImage.file.name}” não foi enviada. ` : ""}${friendlyUploadError(caught, currentStage)}`,
			);
		} finally {
			if (completed > 0) void revalidator.revalidate();
			setProgress(null);
			setStage("idle");
		}
	}

	return (
		<div className="admin-media-manager">
			{error && (
				<AdminMutationFeedback tone="error" title="Não foi possível concluir">
					{error}
				</AdminMutationFeedback>
			)}
			{success && (
				<AdminMutationFeedback tone="success" title="Mídia atualizada">
					{success}
				</AdminMutationFeedback>
			)}

			<section className="admin-media-panel" aria-labelledby="nova-foto-title">
				<header>
					<div>
						<p className="admin-media-panel__eyebrow">Fotos</p>
						<h2 id="nova-foto-title">Adicionar foto</h2>
					</div>
					<span>
						{imageCount} de {maxImages}
					</span>
				</header>
				<p>
					PNG, JPEG ou WebP, até 8 MB por foto. O navegador remove metadados e cria a
					cópia pública com a marca “{WATERMARK_TEXT}”.
				</p>
				<div className="admin-media-privacy-note">
					<strong>Antes de enviar</strong>
					<p>
						Não use fotos com pessoas reconhecíveis, placas, documentos, chaves ou números
						que revelem o endereço exato.
					</p>
				</div>
				<form
					className="admin-media-upload"
					onSubmit={(event) => void uploadImage(event)}
				>
					<label>
						<span>Arquivos</span>
						<input
							ref={fileInput}
							type="file"
							accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
							multiple
							onChange={chooseFile}
							disabled={busy || imageCount + queue.length >= maxImages}
						/>
					</label>
					{queue.length > 0 && (
						<div className="admin-media-queue" aria-label="Fotos selecionadas">
							{queue.map((queuedImage) => (
								<article className="admin-media-preview" key={queuedImage.id}>
									<figure>
										<img
											src={queuedImage.previewUrl}
											alt={`Prévia de ${queuedImage.file.name}`}
										/>
										<figcaption>{queuedImage.file.name}</figcaption>
									</figure>
									<div className="admin-media-preview__fields">
										<label>
											<span>{`Descrição de ${queuedImage.file.name}`}</span>
											<input
												type="text"
												value={queuedImage.altText}
												onChange={(event) =>
													updateQueuedImage(queuedImage.id, {
														altText: event.target.value,
													})
												}
												maxLength={500}
												disabled={busy}
												required
											/>
										</label>
										<label>
											<span>Ordem</span>
											<input
												type="number"
												min="0"
												max="1000"
												value={queuedImage.sortOrder}
												onChange={(event) =>
													updateQueuedImage(queuedImage.id, {
														sortOrder: Number(event.target.value),
													})
												}
												disabled={busy}
											/>
										</label>
										<button
											className="cc-button cc-button--ghost"
											type="button"
											onClick={() => removeQueuedImage(queuedImage.id)}
											disabled={busy}
										>
											Remover
										</button>
									</div>
								</article>
							))}
						</div>
					)}
					<label className="admin-media-check">
						<input
							type="checkbox"
							checked={isCover}
							onChange={(event) => setIsCover(event.target.checked)}
							disabled={busy}
						/>
						<span>Usar a primeira foto como capa</span>
					</label>
					<label className="admin-media-check admin-media-check--privacy">
						<input
							type="checkbox"
							checked={privacyReviewed}
							onChange={(event) => setPrivacyReviewed(event.target.checked)}
							disabled={busy}
							required
						/>
						<span>
							Revisei todas as fotos e confirmo que elas não expõem pessoas reconhecíveis
							nem dados privados.
						</span>
					</label>
					{progress && (
						<p className="admin-media-progress" role="status" aria-live="polite">
							Enviando foto {progress.current} de {progress.total}
						</p>
					)}
					<button
						className="cc-button cc-button--primary"
						type="submit"
						disabled={busy || queue.length === 0 || imageCount >= maxImages}
					>
						{busy
							? stageLabel(stage)
							: queue.length > 0
								? `Preparar e enviar ${queue.length} ${queue.length === 1 ? "foto" : "fotos"}`
								: "Preparar e enviar fotos"}
					</button>
				</form>
			</section>

			<section className="admin-media-panel" aria-labelledby="novo-video-title">
				<header>
					<div>
						<p className="admin-media-panel__eyebrow">Vídeo externo</p>
						<h2 id="novo-video-title">Adicionar YouTube ou Vimeo</h2>
					</div>
				</header>
				<Form className="admin-media-upload" method="post">
					<input type="hidden" name="intent" value="add-video" />
					<label>
						<span>URL HTTPS</span>
						<input
							type="url"
							name="url"
							placeholder="https://…"
							maxLength={2048}
							required
						/>
					</label>
					<label>
						<span>Descrição</span>
						<input type="text" name="altText" maxLength={500} required />
					</label>
					<label>
						<span>Ordem</span>
						<input type="number" name="sortOrder" min="0" max="1000" defaultValue="0" />
					</label>
					<label className="admin-media-check">
						<input type="checkbox" name="confirmedWatermarked" value="true" required />
						<span>Confirmo que o vídeo está tratado e autorizado para publicação.</span>
					</label>
					<button className="cc-button cc-button--secondary" type="submit">
						Adicionar vídeo
					</button>
				</Form>
			</section>

			<section className="admin-media-panel" aria-labelledby="midias-title">
				<header>
					<div>
						<p className="admin-media-panel__eyebrow">Biblioteca</p>
						<h2 id="midias-title">Mídias do anúncio</h2>
					</div>
					<span>{items.length} itens</span>
				</header>
				{items.length === 0 ? (
					<AdminEmpty
						title="Nenhuma mídia cadastrada"
						description="Adicione a primeira foto ou um link de vídeo acima."
					/>
				) : (
					<div className="admin-media-list">
						{items.map((item) => (
							<article className="admin-media-item" key={item.id}>
								<div className="admin-media-item__summary">
									{item.kind === "image" && (
										<img
											className="admin-media-item__image"
											src={`/admin/imoveis/${propertyId}/midia/${item.id}/preview`}
											alt={`Prévia: ${item.altText}`}
										/>
									)}
									<strong>{item.kind === "image" ? "Foto" : "Vídeo"}</strong>
									<span>
										{item.isApprovedForPublication
											? "Pronto para publicar"
											: "Envio pendente"}
										{item.isCover ? " • Capa" : ""}
									</span>
									{item.videoUrl && (
										<a href={item.videoUrl} target="_blank" rel="noreferrer">
											Abrir vídeo
										</a>
									)}
								</div>
								<Form className="admin-media-item__form" method="post">
									<input type="hidden" name="intent" value="update-metadata" />
									<input type="hidden" name="mediaId" value={item.id} />
									<input type="hidden" name="expectedVersion" value={item.version} />
									<label>
										<span>Descrição</span>
										<input
											name="altText"
											defaultValue={item.altText}
											maxLength={500}
											required
										/>
									</label>
									<label>
										<span>Ordem</span>
										<input
											type="number"
											name="sortOrder"
											min="0"
											max="1000"
											defaultValue={item.sortOrder}
										/>
									</label>
									{item.kind === "image" && item.isApprovedForPublication && (
										<label className="admin-media-check">
											<input
												type="checkbox"
												name="isCover"
												value="true"
												defaultChecked={item.isCover}
											/>
											<span>Capa</span>
										</label>
									)}
									<button className="cc-button cc-button--ghost" type="submit">
										Salvar
									</button>
								</Form>
								<MediaArchiveControl item={item} />
							</article>
						))}
					</div>
				)}
			</section>
		</div>
	);
}
