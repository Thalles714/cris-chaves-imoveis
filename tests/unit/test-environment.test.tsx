import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

function AccessibleProbe() {
	const [active, setActive] = useState(false);

	return (
		<button type="button" onClick={() => setActive(true)}>
			{active ? "Estado atualizado" : "Atualizar estado"}
		</button>
	);
}

describe("ambiente de testes da interface", () => {
	it("renderiza, encontra elementos por nome acessível e processa interação", async () => {
		const user = userEvent.setup();
		render(<AccessibleProbe />);

		const button = screen.getByRole("button", { name: "Atualizar estado" });
		expect(button).toBeVisible();

		await user.click(button);

		expect(screen.getByRole("button", { name: "Estado atualizado" })).toBeEnabled();
	});
});
