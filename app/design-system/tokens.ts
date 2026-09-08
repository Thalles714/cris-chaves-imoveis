export const DESIGN_SYSTEM_VERSION = "1.1.0" as const;

export const themeNames = [
	"horizonte",
	"atlantico",
	"araucaria",
	"dunas",
	"entardecer",
	"grafite",
] as const;

export const colorSchemes = ["light", "dark", "black", "system"] as const;

export type ThemeName = (typeof themeNames)[number];
export type ColorScheme = (typeof colorSchemes)[number];
export type ResolvedColorScheme = Exclude<ColorScheme, "system">;

/**
 * Canonical, framework-agnostic source for the Cris Chaves visual language.
 * CSS custom properties in styles/tokens.css mirror these versioned values.
 */
export const designTokens = {
	meta: {
		version: DESIGN_SYSTEM_VERSION,
		name: "Cris Chaves Design System",
		defaultTheme: "horizonte" as ThemeName,
		defaultColorScheme: "light" as ColorScheme,
	},
	typography: {
		fontFamily: {
			sans: '"Geist", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
			mono: '"Geist Mono", ui-monospace, SFMono-Regular, Consolas, monospace',
		},
		fontSize: {
			xs: "0.6875rem",
			sm: "0.8125rem",
			md: "0.9375rem",
			lg: "1.125rem",
			h3: "1.5rem",
			h2: "clamp(1.6875rem, 3vw, 2.375rem)",
			h1: "clamp(2.125rem, 4.5vw, 3.625rem)",
			display: "clamp(2.625rem, 6vw, 4.875rem)",
		},
	},
	brand: {
		blue: "#1778a8",
		blueStrong: "#105b82",
		blueSoft: "#a8d5e8",
		orange: "#c7643f",
		orangeStrong: "#a94a2d",
		ink: "#183c49",
	},
	themes: {
		horizonte: {
			accent: "#c7643f",
			accentStrong: "#a94a2d",
			secondary: "#1778a8",
			secondaryStrong: "#105b82",
			ink: "#183c49",
		},
		atlantico: {
			accent: "#1689b5",
			accentStrong: "#0e668c",
			secondary: "#46bdd0",
			secondaryStrong: "#18879b",
			ink: "#103b50",
		},
		araucaria: {
			accent: "#2f8a6b",
			accentStrong: "#21684f",
			secondary: "#8ca55a",
			secondaryStrong: "#61793b",
			ink: "#1d4238",
		},
		dunas: {
			accent: "#b7783d",
			accentStrong: "#8d5728",
			secondary: "#73929a",
			secondaryStrong: "#506f77",
			ink: "#473a2c",
		},
		entardecer: {
			accent: "#cf5f46",
			accentStrong: "#a54331",
			secondary: "#8275ad",
			secondaryStrong: "#5f548c",
			ink: "#45323c",
		},
		grafite: {
			accent: "#576c78",
			accentStrong: "#354a55",
			secondary: "#9c6c52",
			secondaryStrong: "#744a35",
			ink: "#263941",
		},
	},
	colorScheme: {
		light: {
			background: "#f1f3f4",
			raised: "#ffffff",
			muted: "#e8edef",
			subtle: "#f5f7f7",
			text: "#14343f",
			textMuted: "#536a72",
			textFaint: "#65787e",
			border: "#dce5e7",
			borderStrong: "#c6d2d5",
			glass: "rgba(241, 243, 244, .84)",
			scrim: "rgba(8, 24, 30, .54)",
		},
		dark: {
			background: "#0e171b",
			raised: "#162328",
			muted: "#111e23",
			subtle: "#101a1e",
			text: "#edf4f4",
			textMuted: "#a4b3b7",
			textFaint: "#71858b",
			border: "#2a3b41",
			borderStrong: "#40545b",
			glass: "rgba(15, 27, 32, .78)",
			scrim: "rgba(2, 8, 10, .72)",
		},
		black: {
			background: "#050607",
			raised: "#0b0d10",
			muted: "#111317",
			subtle: "#08090b",
			text: "#f7f9fb",
			textMuted: "#b5bbc3",
			textFaint: "#858b94",
			border: "#252932",
			borderStrong: "#3c424d",
			glass: "rgba(5, 6, 7, .86)",
			scrim: "rgba(0, 0, 0, .78)",
			cta: "#1689ff",
		},
	},
	semantic: {
		success: { foreground: "#27825a", strong: "#35a56f" },
		warning: { foreground: "#a66818", strong: "#d79032" },
		error: { foreground: "#b93838", strong: "#c84b4b" },
		info: { foreground: "var(--cc-secondary)", strong: "var(--cc-secondary)" },
	},
	layout: {
		gridColumns: 12,
		container: "80rem",
		gutter: "clamp(0.875rem, 3vw, 2.5rem)",
		headerHeight: "4rem",
		touchTarget: "2.75rem",
	},
	spacing: {
		0: "0",
		1: "0.25rem",
		2: "0.5rem",
		3: "0.75rem",
		4: "1rem",
		6: "1.5rem",
		8: "2rem",
		12: "3rem",
		16: "4rem",
	},
	radius: {
		xs: "0.125rem",
		sm: "0.25rem",
		md: "0.5rem",
		lg: "0.875rem",
		xl: "1.25rem",
		full: "999px",
	},
	shadow: {
		xs: "0 1px 2px rgba(9, 35, 45, .06)",
		sm: "0 8px 28px rgba(12, 44, 55, .08)",
		md: "0 20px 58px rgba(8, 31, 40, .13)",
	},
	focus: {
		width: "2px",
		offset: "3px",
		ring: "0 0 0 3px rgb(var(--cc-secondary-rgb) / .22)",
	},
	motion: {
		duration: {
			instant: "120ms",
			fast: "150ms",
			base: "220ms",
			slow: "320ms",
			emphasis: "360ms",
		},
		easing: {
			standard: "cubic-bezier(.2, .8, .2, 1)",
			linear: "linear",
		},
		reducedMotionDuration: ".001ms",
	},
} as const;

export const isThemeName = (value: unknown): value is ThemeName =>
	typeof value === "string" && (themeNames as readonly string[]).includes(value);

export const isColorScheme = (value: unknown): value is ColorScheme =>
	typeof value === "string" && (colorSchemes as readonly string[]).includes(value);
