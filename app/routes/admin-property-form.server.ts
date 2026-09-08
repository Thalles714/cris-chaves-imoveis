import {
	adminPropertyDraftInputSchema,
	adminPropertyPrivateInputSchema,
	adminPropertyTransitionSchema,
} from "~/modules/properties/admin";

function value(form: FormData, name: string) {
	const entry = form.get(name);
	return typeof entry === "string" ? entry : "";
}

const draftFieldNames = [
	"publicCode",
	"title",
	"slug",
	"purpose",
	"propertyType",
	"city",
	"neighborhood",
	"priceDisplay",
	"price",
	"description",
	"totalAreaSquareMeters",
	"privateAreaSquareMeters",
	"lotAreaSquareMeters",
	"bedrooms",
	"suites",
	"bathrooms",
	"parkingSpaces",
	"features",
	"isFeatured",
] as const;

export type AdminPropertyDraftFormValues = Record<
	(typeof draftFieldNames)[number],
	string
>;

export function readAdminPropertyDraftFormValues(
	form: FormData,
): AdminPropertyDraftFormValues {
	return Object.fromEntries(
		draftFieldNames.map((name) => [name, value(form, name)]),
	) as AdminPropertyDraftFormValues;
}

const draftFieldLabels: Partial<Record<(typeof draftFieldNames)[number], string>> = {
	publicCode: "Código do imóvel",
	title: "Título",
	slug: "Endereço amigável",
	propertyType: "Tipo de imóvel",
	city: "Cidade",
	neighborhood: "Bairro",
	price: "Valor em reais",
	description: "Descrição pública",
	features: "Diferenciais",
};

export function adminPropertyDraftErrorMessage(error: {
	issues: readonly { message: string; path: readonly PropertyKey[] }[];
}) {
	const issue = error.issues[0];
	if (!issue) return "Revise os campos informados.";
	if (!issue.message.startsWith("Too ") && !issue.message.startsWith("Invalid ")) {
		return issue.message;
	}
	const field = issue.path[0];
	const normalizedField = field === "priceInCents" ? "price" : field;
	const label =
		typeof normalizedField === "string"
			? draftFieldLabels[normalizedField as keyof typeof draftFieldLabels]
			: undefined;
	return label ? `Revise o campo “${label}”.` : "Revise os campos informados.";
}

export function adminPropertyDraftErrorField(error: {
	issues: readonly { path: readonly PropertyKey[] }[];
}) {
	const field = error.issues[0]?.path[0];
	const normalizedField = field === "priceInCents" ? "price" : field;
	return typeof normalizedField === "string"
		? draftFieldNames.find((name) => name === normalizedField)
		: undefined;
}

function nullableNumber(form: FormData, name: string) {
	const raw = value(form, name).trim();
	return raw === "" ? null : Number(raw.replace(",", "."));
}

export function parseAdminPropertyDraftForm(form: FormData) {
	const priceDisplay = value(form, "priceDisplay");
	const price = nullableNumber(form, "price");
	return adminPropertyDraftInputSchema.safeParse({
		publicCode: value(form, "publicCode").toUpperCase(),
		slug: value(form, "slug").toLowerCase(),
		title: value(form, "title"),
		purpose: value(form, "purpose"),
		propertyType: value(form, "propertyType"),
		priceDisplay,
		priceInCents:
			priceDisplay === "on_request" || price === null ? null : Math.round(price * 100),
		city: value(form, "city"),
		neighborhood: value(form, "neighborhood"),
		description: value(form, "description"),
		totalAreaSquareMeters: nullableNumber(form, "totalAreaSquareMeters"),
		privateAreaSquareMeters: nullableNumber(form, "privateAreaSquareMeters"),
		lotAreaSquareMeters: nullableNumber(form, "lotAreaSquareMeters"),
		bedrooms: nullableNumber(form, "bedrooms"),
		suites: nullableNumber(form, "suites"),
		bathrooms: nullableNumber(form, "bathrooms"),
		parkingSpaces: nullableNumber(form, "parkingSpaces"),
		features: value(form, "features")
			.split(/[\n,;•]+/u)
			.map((item) => item.trim())
			.filter(Boolean),
		isFeatured: ["on", "true"].includes(value(form, "isFeatured")),
	});
}

export function parseAdminPropertyPrivateForm(form: FormData) {
	return adminPropertyPrivateInputSchema.safeParse({
		addressLine: value(form, "addressLine"),
		addressNumber: value(form, "addressNumber"),
		addressComplement: value(form, "addressComplement"),
		postalCode: value(form, "postalCode"),
		ownerName: value(form, "ownerName"),
		ownerContact: value(form, "ownerContact"),
		internalNotes: value(form, "internalNotes"),
		expectedVersion: Number(value(form, "privateExpectedVersion")),
	});
}

export function parseAdminPropertyTransitionForm(form: FormData, propertyId: string) {
	return adminPropertyTransitionSchema.safeParse({
		propertyId,
		expectedVersion: Number(value(form, "expectedVersion")),
		transition: value(form, "transition"),
		authorizationConfirmed: ["on", "true"].includes(
			value(form, "authorizationConfirmed"),
		),
	});
}
