import type { ComponentProps } from "react";

import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ state: "idle" as "idle" | "submitting" }));

vi.mock("react-router", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react-router")>();
	return {
		...actual,
		Form: (props: ComponentProps<"form">) => <form {...props} />,
		useNavigation: () => navigation,
	};
});

import AdminRecovery from "~/routes/admin-recovery";

function renderRecovery() {
	const props = { actionData: undefined } as Parameters<typeof AdminRecovery>[0];
	return render(<AdminRecovery {...props} />);
}

describe("administrative password recovery form", () => {
	afterEach(() => {
		navigation.state = "idle";
	});

	it("locks and announces the form while the recovery request is being submitted", () => {
		navigation.state = "submitting";
		renderRecovery();

		const form = screen.getByRole("textbox", { name: "E-mail" }).closest("form");
		const email = screen.getByRole("textbox", { name: "E-mail" });
		const submit = screen.getByRole("button", { name: "Enviando instruções…" });

		expect(form).toHaveAttribute("aria-busy", "true");
		expect(email).toBeDisabled();
		expect(submit).toBeDisabled();
	});

	it("allows a new request when navigation is idle", () => {
		renderRecovery();

		expect(
			screen.getByRole("textbox", { name: "E-mail" }).closest("form"),
		).not.toHaveAttribute("aria-busy");
		expect(screen.getByRole("textbox", { name: "E-mail" })).toBeEnabled();
		expect(screen.getByRole("button", { name: "Enviar instruções" })).toBeEnabled();
	});
});
