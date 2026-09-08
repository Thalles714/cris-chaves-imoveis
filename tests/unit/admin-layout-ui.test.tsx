import type { ComponentProps } from "react";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-router", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react-router")>();
	return {
		...actual,
		Form: (props: ComponentProps<"form">) => <form {...props} />,
		Outlet: () => null,
		useLocation: () => ({ pathname: "/admin" }),
	};
});

import { AppearanceProvider } from "~/design-system";
import AdminLayout from "~/routes/admin-layout";

Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

describe("administrative shell", () => {
	it("reuses the site appearance control and offers a direct property action", () => {
		const props = {
			loaderData: { role: "owner", creci: "CRECI-RS TESTE" },
		} as Parameters<typeof AdminLayout>[0];

		render(
			<AppearanceProvider>
				<AdminLayout {...props} />
			</AppearanceProvider>,
		);

		expect(screen.getByRole("button", { name: "Mudar aparência" })).toBeVisible();
		expect(screen.getByRole("link", { name: "Cadastrar imóvel" })).toBeVisible();
	});
});
