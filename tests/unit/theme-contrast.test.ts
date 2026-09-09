import { describe, expect, it } from "vitest";

import { designTokens, themeNames } from "~/design-system";

function relativeLuminance(hex: string) {
	const channels = hex
		.slice(1)
		.match(/.{2}/gu)
		?.map((value) => Number.parseInt(value, 16) / 255);
	if (!channels || channels.length !== 3) throw new Error(`Cor inválida: ${hex}`);
	const [red, green, blue] = channels.map((value) =>
		value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
	);
	return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: string, second: string) {
	const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
	const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
	return (lighter + 0.05) / (darker + 0.05);
}

describe("contraste das paletas", () => {
	it.each(themeNames)("mantém texto e controles legíveis em %s", (themeName) => {
		const theme = designTokens.themes[themeName];
		for (const scheme of [theme.light, theme.dark]) {
			expect(contrast(scheme.text, scheme.background)).toBeGreaterThanOrEqual(7);
			expect(contrast(scheme.textMuted, scheme.background)).toBeGreaterThanOrEqual(4.5);
			expect(contrast(scheme.borderStrong, scheme.raised)).toBeGreaterThanOrEqual(3);
		}
		expect(contrast("#ffffff", theme.accentStrong)).toBeGreaterThanOrEqual(4.5);
		expect(contrast(theme.light.muted, theme.accentStrong)).toBeGreaterThanOrEqual(4.5);
	});

	it("mantém o Black legível e seu CTA azul reconhecível", () => {
		const black = designTokens.colorScheme.black;
		expect(contrast(black.text, black.background)).toBeGreaterThanOrEqual(7);
		expect(contrast(black.textMuted, black.background)).toBeGreaterThanOrEqual(4.5);
		expect(contrast(black.borderStrong, black.raised)).toBeGreaterThanOrEqual(3);
		expect(contrast("#ffffff", black.cta)).toBeGreaterThanOrEqual(4.5);
	});
});
