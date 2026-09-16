import type { ComponentProps } from "react";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

let navigationState: "idle" | "submitting" = "idle";
const syntheticEmail = ["person", "example.invalid"].join("@");

vi.mock("react-router", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react-router")>();
	return {
		...actual,
		Form: (props: ComponentProps<"form">) => <form {...props} />,
		useActionData: () => undefined,
		useLoaderData: () => ({
			members: [
				{
					userId: "20000000-0000-4000-8000-000000000002",
					email: syntheticEmail,
					role: "editor",
					status: "active",
					invitedAt: "2026-09-01T10:00:00+00:00",
					activatedAt: "2026-09-01T10:05:00+00:00",
					disabledAt: null,
					version: 2,
				},
			],
		}),
		useNavigation: () => ({ state: navigationState }),
	};
});

import AdminMembers from "~/routes/admin-members";

describe("administrative member interface", () => {
	it("confirms a role change with a redacted member reference and access impact", async () => {
		navigationState = "idle";
		const user = userEvent.setup();
		render(<AdminMembers />);

		await user.click(screen.getByRole("button", { name: "Tornar proprietário" }));

		expect(screen.getByRole("dialog")).toBeVisible();
		expect(screen.getByText("Membro …00000002")).toBeVisible();
		expect(screen.getByText("Editor", { selector: "strong" })).toBeVisible();
		expect(screen.getByText("Proprietário", { selector: "strong" })).toBeVisible();
		expect(
			screen.getByText(/poderá gerenciar membros e consultar a auditoria/u),
		).toBeVisible();
		expect(screen.getByRole("button", { name: "Cancelar" })).toBeVisible();
		expect(screen.getByRole("button", { name: "Confirmar alteração" })).toBeVisible();
	});

	it("disables member mutations while a submission is in progress", () => {
		navigationState = "submitting";
		render(<AdminMembers />);

		expect(screen.getByRole("button", { name: "Enviando…" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Tornar proprietário" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Desativar" })).toBeDisabled();
	});
});
