import type { ComponentProps } from "react";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-router", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react-router")>();
	return {
		...actual,
		Form: (props: ComponentProps<"form">) => <form {...props} />,
	};
});

import AdminLogin, { loader } from "~/routes/admin-login";

const approvedCreci = ["CRECI-RS", "89448"].join(" ");
const routeContext = {
	get: () => ({ env: { APP_ENV: "test", PUBLIC_CRECI: approvedCreci } }),
} as unknown as Parameters<typeof loader>[0]["context"];

describe("administrative login feedback", () => {
	it("confirms that the password was changed before asking the member to sign in", () => {
		const props = {
			actionData: undefined,
			loaderData: { passwordChanged: true, creci: approvedCreci },
		} as Parameters<typeof AdminLogin>[0];

		render(<AdminLogin {...props} />);

		expect(screen.getByRole("status")).toHaveTextContent(
			"Senha criada com sucesso. Entre com seu e-mail e a nova senha.",
		);
		expect(screen.getByText(approvedCreci)).toBeVisible();
	});

	it("only enables the confirmation for the exact successful redirect", () => {
		expect(
			loader({
				request: new Request("http://localhost/admin/entrar?senha=alterada"),
				context: routeContext,
			} as Parameters<typeof loader>[0]),
		).toEqual({ passwordChanged: true, creci: approvedCreci });
		expect(
			loader({
				request: new Request("http://localhost/admin/entrar?senha=outra"),
				context: routeContext,
			} as Parameters<typeof loader>[0]),
		).toEqual({ passwordChanged: false, creci: approvedCreci });
	});
});
