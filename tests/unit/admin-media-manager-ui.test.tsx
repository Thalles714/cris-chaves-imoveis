import type { ComponentProps } from "react";

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mediaSpies = vi.hoisted(() => ({
	processImage: vi.fn(),
	revalidate: vi.fn(),
	upload: vi.fn(),
}));

vi.mock("~/modules/media", async (importOriginal) => {
	const actual = await importOriginal<typeof import("~/modules/media")>();
	return { ...actual, processImagePairInBrowser: mediaSpies.processImage };
});

vi.mock("@supabase/supabase-js", () => ({
	createClient: () => ({
		storage: { from: () => ({ uploadToSignedUrl: mediaSpies.upload }) },
	}),
}));

vi.mock("react-router", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react-router")>();
	return {
		...actual,
		Form: (props: ComponentProps<"form">) => <form {...props} />,
		useRevalidator: () => ({ revalidate: mediaSpies.revalidate, state: "idle" }),
	};
});

import { AdminMediaManager } from "~/components/admin/media-manager";

const propertyId = "40000000-0000-4000-8000-000000000004";

function processedImage(checksum: string) {
	return {
		blob: new Blob(["imagem"], { type: "image/jpeg" }),
		checksumSha256: checksum,
		opaqueFileName: "50000000-0000-4000-8000-000000000005.jpg",
		output: {
			mimeType: "image/jpeg",
			byteLength: 6,
			width: 800,
			height: 600,
		},
	};
}

function processedPair() {
	return {
		original: processedImage("a".repeat(64)),
		publicDerivative: processedImage("b".repeat(64)),
	};
}

function uploadGrant(isCover: boolean) {
	const mediaId = "50000000-0000-4000-8000-000000000005";
	const sharedPlan = {
		kind: "image",
		propertyId,
		mimeType: "image/jpeg",
		byteLength: 6,
		width: 800,
		height: 600,
		altText: "Frente da casa",
		sortOrder: 0,
		isCover,
	};
	return {
		mediaId,
		mediaVersion: 1,
		original: {
			uploadToken: "original-upload-token-1234567890",
			plan: {
				...sharedPlan,
				bucket: "property-originals",
				objectPath: `properties/${propertyId}/originals/${mediaId}.jpg`,
				checksumSha256: "a".repeat(64),
			},
		},
		publicDerivative: {
			uploadToken: "public-upload-token-1234567890",
			plan: {
				...sharedPlan,
				bucket: "property-public",
				objectPath: `properties/${propertyId}/public/${mediaId}.jpg`,
				checksumSha256: "b".repeat(64),
			},
		},
		supabaseUrl: "https://example.supabase.co",
		publishableKey: "publishable-key-1234567890",
	};
}

describe("admin media privacy workflow", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		mediaSpies.processImage.mockReset();
		mediaSpies.revalidate.mockReset();
		mediaSpies.upload.mockReset();
		mediaSpies.upload.mockResolvedValue({ data: {}, error: null });
	});

	it("makes the first photo the cover and asks for publication confirmation", () => {
		render(<AdminMediaManager propertyId={propertyId} items={[]} maxImages={30} />);

		expect(
			screen.getByRole("checkbox", { name: "Usar a primeira foto como capa" }),
		).toBeChecked();
		expect(
			screen.getByRole("checkbox", { name: /Revisei as fotos e confirmo/u }),
		).toBeRequired();
	});

	it("lets the administrator prepare several supported photos at once", async () => {
		const user = userEvent.setup();
		vi.spyOn(URL, "createObjectURL")
			.mockReturnValueOnce("blob:casa-frente")
			.mockReturnValueOnce("blob:casa-lateral");
		vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
		render(<AdminMediaManager propertyId={propertyId} items={[]} maxImages={30} />);

		const fileInput = screen.getByLabelText("Arquivos");
		expect(fileInput).toHaveAttribute("multiple");
		expect(fileInput).toHaveAttribute(
			"accept",
			"image/png,image/jpeg,image/jpg,image/pjpeg,image/webp,.png,.jpg,.jpeg,.jfif,.webp",
		);

		await user.upload(fileInput, [
			new File(["frente"], "casa-frente.jpg", { type: "image/jpeg" }),
			new File(["lateral"], "casa-lateral.jpg", { type: "image/jpeg" }),
			new File(["cozinha"], "casa.cozinha.01.jpeg"),
		]);

		expect(screen.getByRole("img", { name: "Prévia de casa-frente.jpg" })).toBeVisible();
		expect(screen.getByRole("img", { name: "Prévia de casa-lateral.jpg" })).toBeVisible();
		expect(
			screen.getByRole("img", { name: "Prévia de casa.cozinha.01.jpeg" }),
		).toBeVisible();
		expect(screen.getByLabelText("Descrição de casa-frente.jpg")).toBeVisible();
		expect(screen.getByLabelText("Descrição de casa-lateral.jpg")).toBeVisible();
		expect(screen.getByLabelText("Descrição de casa.cozinha.01.jpeg")).toBeVisible();
	});

	it("keeps the current and remaining photos queued when a sequential upload fails", async () => {
		const user = userEvent.setup();
		let rejectProcessing: (reason: unknown) => void = () => undefined;
		mediaSpies.processImage.mockReturnValueOnce(
			new Promise((_, reject) => {
				rejectProcessing = reject;
			}),
		);
		vi.spyOn(URL, "createObjectURL")
			.mockReturnValueOnce("blob:casa-frente")
			.mockReturnValueOnce("blob:casa-lateral");
		vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
		render(<AdminMediaManager propertyId={propertyId} items={[]} maxImages={30} />);

		await user.upload(screen.getByLabelText("Arquivos"), [
			new File(["frente"], "casa-frente.jpg", { type: "image/jpeg" }),
			new File(["lateral"], "casa-lateral.webp", { type: "image/webp" }),
		]);
		await user.type(screen.getByLabelText("Descrição de casa-frente.jpg"), "Frente");
		await user.type(screen.getByLabelText("Descrição de casa-lateral.webp"), "Lateral");
		await user.click(screen.getByRole("checkbox", { name: /Revisei as fotos/u }));
		await user.click(screen.getByRole("button", { name: "Preparar e enviar 2 fotos" }));

		expect(await screen.findByText("Enviando foto 1 de 2")).toBeVisible();
		await act(async () => {
			rejectProcessing({ code: "SOURCE_TOO_LARGE" });
		});

		expect(
			await screen.findByText(
				/A foto “casa-frente.jpg” não foi enviada.*limite de 8 MB/u,
			),
		).toBeVisible();
		expect(screen.getByLabelText("Descrição de casa-frente.jpg")).toHaveValue("Frente");
		expect(screen.getByLabelText("Descrição de casa-lateral.webp")).toHaveValue(
			"Lateral",
		);
		expect(mediaSpies.processImage).toHaveBeenCalledTimes(1);
		expect(mediaSpies.revalidate).not.toHaveBeenCalled();
	});

	it("removes confirmed photos, revalidates and does not assign a second cover on retry", async () => {
		const user = userEvent.setup();
		mediaSpies.processImage
			.mockResolvedValueOnce(processedPair())
			.mockRejectedValueOnce({ code: "SOURCE_TOO_LARGE" });
		vi.spyOn(URL, "createObjectURL")
			.mockReturnValueOnce("blob:casa-frente")
			.mockReturnValueOnce("blob:casa-lateral");
		vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ grant: uploadGrant(true) }), { status: 200 }),
			)
			.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);
		render(<AdminMediaManager propertyId={propertyId} items={[]} maxImages={30} />);

		await user.upload(screen.getByLabelText("Arquivos"), [
			new File(["frente"], "casa-frente.jpg", { type: "image/jpeg" }),
			new File(["lateral"], "casa-lateral.jpg", { type: "image/jpeg" }),
		]);
		await user.type(
			screen.getByLabelText("Descrição de casa-frente.jpg"),
			"Frente da casa",
		);
		await user.type(screen.getByLabelText("Descrição de casa-lateral.jpg"), "Lateral");
		await user.click(screen.getByRole("checkbox", { name: /Revisei as fotos/u }));
		await user.click(screen.getByRole("button", { name: "Preparar e enviar 2 fotos" }));

		expect(
			await screen.findByText(
				/A foto “casa-lateral.jpg” não foi enviada.*limite de 8 MB/u,
			),
		).toBeVisible();
		expect(
			screen.queryByRole("img", { name: "Prévia de casa-frente.jpg" }),
		).not.toBeInTheDocument();
		expect(screen.getByRole("img", { name: "Prévia de casa-lateral.jpg" })).toBeVisible();
		expect(
			screen.getByRole("checkbox", { name: "Usar a primeira foto como capa" }),
		).not.toBeChecked();
		await waitFor(() => expect(mediaSpies.revalidate).toHaveBeenCalledOnce());
		const firstPlanBody = fetchMock.mock.calls[0]?.[1]?.body;
		expect(fetchMock.mock.calls[0]?.[0]).toBe(
			`/admin/imoveis/${propertyId}/midia/upload`,
		);
		expect(firstPlanBody).toBeInstanceOf(URLSearchParams);
		expect((firstPlanBody as URLSearchParams).get("isCover")).toBe("true");
		expect(mediaSpies.processImage).toHaveBeenCalledTimes(2);
	});

	it("shows an authenticated preview and asks before hiding an existing photo", async () => {
		const user = userEvent.setup();
		const mediaId = "50000000-0000-4000-8000-000000000005";
		render(
			<AdminMediaManager
				propertyId={propertyId}
				maxImages={30}
				items={[
					{
						id: mediaId,
						publicId: "60000000-0000-4000-8000-000000000006",
						propertyId,
						kind: "image",
						altText: "Fachada da casa",
						sortOrder: 0,
						isCover: true,
						processingStatus: "processed",
						isApprovedForPublication: true,
						originalStored: true,
						publicDerivativeStored: true,
						version: 2,
						videoUrl: null,
						image: {
							mimeType: "image/webp",
							byteLength: 120_000,
							width: 1_200,
							height: 800,
						},
					},
				]}
			/>,
		);

		expect(screen.getByRole("img", { name: "Prévia: Fachada da casa" })).toHaveAttribute(
			"src",
			`/admin/imoveis/${propertyId}/midia/${mediaId}/preview`,
		);
		await user.click(screen.getByRole("button", { name: "Ocultar foto" }));
		expect(screen.getByRole("dialog", { name: "Ocultar esta foto?" })).toBeVisible();
		expect(screen.getByRole("button", { name: "Sim, ocultar" })).toBeVisible();
	});
});
