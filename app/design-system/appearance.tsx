import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { ReactNode } from "react";

import { useCspNonce } from "../lib/http/csp-nonce";
import { designTokens, isColorScheme, isThemeName } from "./tokens";
import type { ColorScheme, ResolvedColorScheme, ThemeName } from "./tokens";

const STORAGE_KEYS = {
	theme: "cris.theme",
	colorScheme: "cris.colorScheme",
} as const;

export type Appearance = {
	theme: ThemeName;
	colorScheme: ColorScheme;
};

type AppearanceContextValue = Appearance & {
	resolvedColorScheme: ResolvedColorScheme;
	setTheme: (theme: ThemeName) => void;
	setColorScheme: (colorScheme: ColorScheme) => void;
};

const defaultAppearance: Appearance = {
	theme: designTokens.meta.defaultTheme,
	colorScheme: designTokens.meta.defaultColorScheme,
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function systemPrefersDark() {
	return (
		typeof window !== "undefined" &&
		window.matchMedia("(prefers-color-scheme: dark)").matches
	);
}

export function resolveColorScheme(
	colorScheme: ColorScheme,
	prefersDark = systemPrefersDark(),
): ResolvedColorScheme {
	if (colorScheme === "system") return prefersDark ? "dark" : "light";
	return colorScheme;
}

export function readStoredAppearance(): Appearance {
	if (typeof window === "undefined") return defaultAppearance;

	try {
		const theme = window.localStorage.getItem(STORAGE_KEYS.theme);
		const colorScheme = window.localStorage.getItem(STORAGE_KEYS.colorScheme);
		return {
			theme: isThemeName(theme) ? theme : defaultAppearance.theme,
			colorScheme: isColorScheme(colorScheme)
				? colorScheme
				: defaultAppearance.colorScheme,
		};
	} catch {
		return defaultAppearance;
	}
}

export function applyAppearance({ theme, colorScheme }: Appearance) {
	if (typeof document === "undefined") return;
	const resolved = resolveColorScheme(colorScheme);
	const root = document.documentElement;
	root.dataset.theme = theme;
	root.dataset.colorScheme = colorScheme;
	root.classList.toggle("dark", resolved === "dark");
	root.classList.toggle("black", resolved === "black");
	root.style.colorScheme = resolved === "light" ? "light" : "dark";
	root.dataset.designSystemVersion = designTokens.meta.version;
	const themeColor = window.getComputedStyle(root).getPropertyValue("--cc-bg").trim();
	if (themeColor) {
		document
			.querySelector('meta[name="theme-color"]')
			?.setAttribute("content", themeColor);
	}
}

/** Run this inline in <head> to prevent an appearance flash before hydration. */
export const appearanceBootScript = `(()=>{try{const r=document.documentElement,t=[${designTokens.meta.defaultTheme ? `"${designTokens.meta.defaultTheme}"` : ""},"atlantico","araucaria","dunas","entardecer","grafite"],s=["light","dark","black","system"],a=localStorage.getItem("${STORAGE_KEYS.theme}"),c=localStorage.getItem("${STORAGE_KEYS.colorScheme}"),T=t.includes(a)?a:"${designTokens.meta.defaultTheme}",C=s.includes(c)?c:"${designTokens.meta.defaultColorScheme}",b=C==="black",d=C==="dark"||(C==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);r.dataset.theme=T;r.dataset.colorScheme=C;r.dataset.designSystemVersion="${designTokens.meta.version}";r.classList.toggle("dark",d);r.classList.toggle("black",b);r.style.colorScheme=d||b?"dark":"light"}catch{}})();`;

export function AppearanceScript() {
	const nonce = useCspNonce();
	return (
		<script dangerouslySetInnerHTML={{ __html: appearanceBootScript }} nonce={nonce} />
	);
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
	const [appearance, setAppearance] = useState<Appearance>(defaultAppearance);
	const [prefersDark, setPrefersDark] = useState(false);

	useEffect(() => {
		const frame = window.requestAnimationFrame(() => {
			const stored = readStoredAppearance();
			setAppearance(stored);
			setPrefersDark(systemPrefersDark());
			applyAppearance(stored);
		});

		return () => window.cancelAnimationFrame(frame);
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const handleChange = (event: MediaQueryListEvent) => {
			setPrefersDark(event.matches);
			if (appearance.colorScheme === "system") applyAppearance(appearance);
		};
		media.addEventListener("change", handleChange);
		return () => media.removeEventListener("change", handleChange);
	}, [appearance]);

	const persist = useCallback((next: Appearance) => {
		setAppearance(next);
		applyAppearance(next);
		try {
			window.localStorage.setItem(STORAGE_KEYS.theme, next.theme);
			window.localStorage.setItem(STORAGE_KEYS.colorScheme, next.colorScheme);
		} catch {
			// Storage is optional; the current document still receives the appearance.
		}
	}, []);

	const setTheme = useCallback(
		(theme: ThemeName) => persist({ ...appearance, theme }),
		[appearance, persist],
	);
	const setColorScheme = useCallback(
		(colorScheme: ColorScheme) => persist({ ...appearance, colorScheme }),
		[appearance, persist],
	);

	const value = useMemo<AppearanceContextValue>(
		() => ({
			...appearance,
			resolvedColorScheme: resolveColorScheme(appearance.colorScheme, prefersDark),
			setTheme,
			setColorScheme,
		}),
		[appearance, prefersDark, setColorScheme, setTheme],
	);

	return (
		<AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
	);
}

export function useAppearance() {
	const value = useContext(AppearanceContext);
	if (!value) {
		throw new Error("useAppearance must be used within AppearanceProvider");
	}
	return value;
}
