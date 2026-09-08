import {
	dealStatuses,
	publicationStatuses,
	type DealStatus,
	type PublicationStatus,
} from "../domain/property";

export function isPublicationStatus(value: unknown): value is PublicationStatus {
	return (
		typeof value === "string" &&
		(publicationStatuses as readonly string[]).includes(value)
	);
}

export function isDealStatus(value: unknown): value is DealStatus {
	return typeof value === "string" && (dealStatuses as readonly string[]).includes(value);
}
