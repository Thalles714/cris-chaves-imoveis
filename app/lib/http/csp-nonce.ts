import { useContext } from "react";
import { UNSAFE_FrameworkContext } from "react-router";

/** Reads the per-document nonce supplied by ServerRouter during SSR. */
export function useCspNonce() {
	return useContext(UNSAFE_FrameworkContext)?.nonce;
}
