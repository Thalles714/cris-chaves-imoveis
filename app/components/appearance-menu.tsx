import { useEffect, useId, useRef, useState } from "react";

import { CheckIcon, SunIcon } from "~/components/ui/icons";
import { designTokens, themeNames, useAppearance } from "~/design-system";
import type { ColorScheme, ThemeName } from "~/design-system";

const themeLabels: Record<ThemeName, string> = {
	horizonte: "Horizonte",
	atlantico: "Atlântico",
	araucaria: "Araucária",
	dunas: "Dunas",
	entardecer: "Entardecer",
	grafite: "Grafite",
};

const schemeLabels: Record<ColorScheme, string> = {
	dark: "Escuro",
	black: "Black",
	light: "Claro",
	system: "Sistema",
};

const schemeOrder = [
	"dark",
	"black",
	"light",
	"system",
] as const satisfies readonly ColorScheme[];

function themeColors(theme: ThemeName) {
	const tokens = designTokens.themes[theme];
	return [tokens.accent, tokens.secondary, tokens.ink];
}

/** Shared appearance control used by both the public site and the admin. */
export function AppearanceMenu() {
	const { theme, colorScheme, setTheme, setColorScheme } = useAppearance();
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const panelId = useId();

	useEffect(() => {
		if (!open) return;

		const closeOnOutsidePress = (event: PointerEvent) => {
			if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
		};
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			setOpen(false);
			triggerRef.current?.focus();
		};

		document.addEventListener("pointerdown", closeOnOutsidePress);
		document.addEventListener("keydown", closeOnEscape);
		return () => {
			document.removeEventListener("pointerdown", closeOnOutsidePress);
			document.removeEventListener("keydown", closeOnEscape);
		};
	}, [open]);

	return (
		<div className={`appearance${open ? " open" : ""}`} ref={containerRef}>
			<button
				ref={triggerRef}
				className="appearance-trigger"
				type="button"
				aria-label="Mudar aparência"
				aria-controls={panelId}
				aria-expanded={open}
				onClick={() => setOpen((current) => !current)}
			>
				<SunIcon />
			</button>
			<div
				id={panelId}
				className="appearance-panel"
				role="dialog"
				aria-label="Aparência"
				aria-hidden={!open}
			>
				<p className="appearance-label">Aparência</p>
				<div className="scheme-group" role="group" aria-label="Esquema de cores">
					{schemeOrder.map((value) => (
						<button
							key={value}
							className={`scheme-btn${colorScheme === value ? " active" : ""}`}
							type="button"
							aria-pressed={colorScheme === value}
							onClick={() => setColorScheme(value)}
						>
							{schemeLabels[value]}
						</button>
					))}
				</div>
				<div className="theme-list" role="group" aria-label="Paleta de cores">
					{themeNames.map((value) => (
						<button
							key={value}
							className={`theme-btn${theme === value ? " active" : ""}`}
							type="button"
							aria-pressed={theme === value}
							onClick={() => setTheme(value)}
						>
							<span className="theme-name">{themeLabels[value]}</span>
							<span className="swatches" aria-hidden="true">
								{themeColors(value).map((color) => (
									<i
										key={color}
										className="swatch-mini"
										style={{ backgroundColor: color }}
									/>
								))}
							</span>
							<CheckIcon className="theme-check" />
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
