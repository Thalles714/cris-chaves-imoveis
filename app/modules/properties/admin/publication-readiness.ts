export type PublicationReadinessInput = {
	description: string;
	imageCount: number;
	hasApprovedCover: boolean;
};

export type PublicationReadinessItem = {
	id: "description" | "images" | "cover";
	label: string;
	complete: boolean;
};

/**
 * Editorial gate used by both the route action and the operator-facing checklist.
 */
export function assessPublicationReadiness(
	input: PublicationReadinessInput,
): readonly PublicationReadinessItem[] {
	return [
		{
			id: "description",
			label: "Descrição pública preenchida",
			complete: input.description.trim().length > 0,
		},
		{
			id: "images",
			label: "Pelo menos uma foto tratada",
			complete: input.imageCount > 0,
		},
		{
			id: "cover",
			label: "Foto de capa definida",
			complete: input.hasApprovedCover,
		},
	] as const;
}

export function isPublicationReady(input: PublicationReadinessInput) {
	return assessPublicationReadiness(input).every((item) => item.complete);
}
