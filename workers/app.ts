// Wrangler's generated GlobalProps imports this module before the framework
// declaration is visible to project-reference builds.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../.react-router/types/+server-build.d.ts" />

import { createRequestHandler, RouterContextProvider } from "react-router";

import { cloudflareContext } from "../app/lib/cloudflare-context";
import { readServerEnvironment } from "../app/lib/env/server-env.server";
import { redirectWwwToCanonicalHost } from "../app/lib/http/canonical-host.server";
import {
	applySecurityHeaders,
	createCspNonce,
} from "../app/lib/http/security-headers.server";

const requestHandler = createRequestHandler(
	() => import("virtual:react-router/server-build"),
	import.meta.env.MODE,
);

export default {
	async fetch(request, env, ctx) {
		const cspNonce = createCspNonce();
		const { appEnvironment } = readServerEnvironment(
			env as unknown as Readonly<Record<string, unknown>>,
		);
		const canonicalRedirect = redirectWwwToCanonicalHost(request, {
			appEnvironment,
			publicSiteUrl: env.PUBLIC_SITE_URL,
		});
		if (canonicalRedirect) {
			return applySecurityHeaders(request, canonicalRedirect, cspNonce, appEnvironment);
		}
		const routerContext = new RouterContextProvider();
		routerContext.set(cloudflareContext, { cspNonce, env, ctx });
		const response = await requestHandler(request, routerContext);
		return applySecurityHeaders(request, response, cspNonce, appEnvironment);
	},
} satisfies ExportedHandler<Env>;
