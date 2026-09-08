import { z } from "zod";

import type { CloudflareContext } from "~/lib/cloudflare-context";
import { readServerEnvironment } from "~/lib/env/server-env.server";
import { approvedRegions, type PublicSiteConfig } from "./config";

const whatsappSchema = z
	.string()
	.trim()
	.regex(/^55\d{10,11}$/u, "O WhatsApp público deve usar DDI 55 e somente dígitos.");

const creciSchema = z
	.string()
	.trim()
	.regex(/^CRECI-RS \d{4,8}$/u, "O CRECI público deve conter UF e número válidos.");

function readBindings(env: Env): Readonly<Record<string, unknown>> {
	return env as unknown as Readonly<Record<string, unknown>>;
}

function readOptionalApprovedValue<T>(
	value: unknown,
	schema: z.ZodType<T>,
	environment: string,
): T | null {
	if (value === undefined || value === null || value === "") return null;
	const parsed = schema.safeParse(value);
	if (parsed.success) return parsed.data;
	if (environment === "production") throw new Error("Configuração pública inválida.");
	return null;
}

function resolveCanonicalOrigin(
	request: Request,
	bindings: Readonly<Record<string, unknown>>,
	environment: string,
) {
	const configured = bindings.PUBLIC_SITE_URL;
	if (typeof configured === "string" && configured.trim()) {
		const url = new URL(configured);
		if (url.username || url.password || url.hash || url.search || url.pathname !== "/") {
			throw new Error("PUBLIC_SITE_URL deve conter apenas a origem canônica.");
		}
		if (environment === "production" && url.protocol !== "https:") {
			throw new Error("PUBLIC_SITE_URL deve usar HTTPS em produção.");
		}
		return url.origin;
	}
	if (environment === "production") {
		throw new Error("PUBLIC_SITE_URL é obrigatório em produção.");
	}
	return new URL(request.url).origin;
}

export function readPublicSiteConfig(
	request: Request,
	cloudflare: CloudflareContext,
): PublicSiteConfig {
	const bindings = readBindings(cloudflare.env);
	const { appEnvironment } = readServerEnvironment(bindings);
	const canonicalOrigin = resolveCanonicalOrigin(request, bindings, appEnvironment);
	const pathname = new URL(request.url).pathname;

	return {
		brandName: "Cris Chaves Corretor de Imóveis",
		shortBrandName: "Cris Chaves",
		canonicalOrigin,
		canonicalUrl: new URL(pathname, `${canonicalOrigin}/`).href,
		creci: readOptionalApprovedValue(bindings.PUBLIC_CRECI, creciSchema, appEnvironment),
		whatsappNumber: readOptionalApprovedValue(
			bindings.PUBLIC_WHATSAPP_NUMBER,
			whatsappSchema,
			appEnvironment,
		),
		regions: approvedRegions,
		contactFormAvailable: false,
	};
}
