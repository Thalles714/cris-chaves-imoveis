import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BrandLockup } from "~/components/brand-lockup";

const approvedCreci = ["CRECI-RS", "89448"].join(" ");

describe("brand lockup", () => {
	it("presents the approved credential as real text associated with the brand", () => {
		render(<BrandLockup creci={approvedCreci} variant="header" />);

		const link = screen.getByRole("link", {
			name: "Cris Chaves Corretor de Imóveis — início",
		});
		const credential = screen.getByText(approvedCreci);

		expect(link).toContainElement(credential);
		expect(credential.tagName).toBe("SPAN");
		expect(link.querySelector("img")).toHaveAttribute("width", "274");
		expect(link.querySelector("img")).toHaveAttribute("height", "128");
	});

	it("does not reserve credential space or invent content when CRECI is absent", () => {
		const { container } = render(<BrandLockup creci={null} variant="footer" />);

		expect(container.querySelector(".brand-lockup__credential")).not.toBeInTheDocument();
		expect(screen.queryByText(/CRECI/u)).not.toBeInTheDocument();
	});
});
