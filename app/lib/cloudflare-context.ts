import { createContext } from "react-router";

export interface CloudflareContext {
	cspNonce: string;
	env: Env;
	ctx: ExecutionContext;
}

export const cloudflareContext = createContext<CloudflareContext>();
