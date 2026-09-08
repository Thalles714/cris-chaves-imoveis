import { createRequestHandler, RouterContextProvider } from "react-router";

import { cloudflareContext } from "../app/lib/cloudflare-context";
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
		const routerContext = new RouterContextProvider();
		routerContext.set(cloudflareContext, { cspNonce, env, ctx });
		const response = await requestHandler(request, routerContext);
		return applySecurityHeaders(request, response, cspNonce);
	},
} satisfies ExportedHandler<Env>;
