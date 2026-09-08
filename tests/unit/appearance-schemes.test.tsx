// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppearanceMenu } from "~/components/appearance-menu";
import {
	AppearanceProvider,
	colorSchemes,
	designTokens,
	isColorScheme,
	resolveColorScheme,
} from "~/design-system";

describe("esquemas de aparência", () => {
	beforeEach(() => {
		Object.defineProperty(window, "matchMedia", {
			configurable: true,
			value: vi.fn().mockImplementation((query: string) => ({
				matches: false,
				media: query,
				onchange: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				addListener: vi.fn(),
				removeListener: vi.fn(),
				dispatchEvent: vi.fn(),
			})),
		});
		window.localStorage.clear();
		document.documentElement.className = "";
		document.documentElement.removeAttribute("data-color-scheme");
	});

	it("mantém o escuro temático e oferece Black como quarto esquema persistível", async () => {
		expect(colorSchemes).toEqual(["light", "dark", "black", "system"]);
		expect(isColorScheme("black")).toBe(true);
		expect(resolveColorScheme("system", true)).toBe("dark");
		expect(resolveColorScheme("system", false)).toBe("light");
		expect(designTokens.colorScheme.dark.background).toBe("#0e171b");
		expect(designTokens.colorScheme.black).toMatchObject({
			background: "#050607",
			text: "#f7f9fb",
			cta: "#1689ff",
		});

		render(
			<AppearanceProvider>
				<AppearanceMenu />
			</AppearanceProvider>,
		);
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Mudar aparência" }));
		await user.click(screen.getByRole("button", { name: "Black" }));

		expect(document.documentElement.dataset.colorScheme).toBe("black");
		expect(document.documentElement).toHaveClass("black");
		expect(document.documentElement).not.toHaveClass("dark");
		expect(document.documentElement.style.colorScheme).toBe("dark");
		expect(window.localStorage.getItem("cris.colorScheme")).toBe("black");
	});
});
