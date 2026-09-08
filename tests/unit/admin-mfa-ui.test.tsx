import type { ComponentProps } from "react";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-router", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react-router")>();
	return {
		...actual,
		Form: (props: ComponentProps<"form">) => <form {...props} />,
		useNavigation: () => ({ state: "submitting" }),
	};
});

import AdminMfa from "~/routes/admin-mfa";

describe("administrative MFA interface", () => {
	it("blocks another enrollment submission while Supabase is processing", () => {
		const props = {
			loaderData: { state: "enrollment_required" },
			actionData: undefined,
		} as Parameters<typeof AdminMfa>[0];

		const { container } = render(<AdminMfa {...props} />);

		expect(container.querySelector("form")).toHaveAttribute("aria-busy", "true");
		expect(screen.getByRole("button", { name: "Configurando…" })).toBeDisabled();
	});
});
