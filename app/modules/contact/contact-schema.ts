import { z } from "zod";

export const contactIntentSchema = z.enum(["general", "property", "sell"]);

const safePlainText = (minimum: number, maximum: number) =>
	z
		.string()
		.trim()
		.min(minimum)
		.max(maximum)
		.regex(/^[^<>]*$/u, "O campo contém caracteres não permitidos.");

export const contactSubmissionSchema = z
	.object({
		name: safePlainText(2, 100),
		phone: z
			.string()
			.trim()
			.min(10)
			.max(20)
			.regex(/^[+()\d\s-]+$/u, "Informe um telefone válido."),
		email: z.email().max(254).optional().or(z.literal("")),
		message: safePlainText(10, 1_500),
		intent: contactIntentSchema,
		propertyCode: z
			.string()
			.trim()
			.toUpperCase()
			.regex(/^[A-Z0-9][A-Z0-9-]{2,31}$/u)
			.optional()
			.or(z.literal("")),
		turnstileToken: z.string().trim().min(1).max(2_048),
	})
	.strict();

export type ContactSubmission = z.infer<typeof contactSubmissionSchema>;
