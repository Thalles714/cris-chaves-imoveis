export function disabledContactAction() {
	return Response.json(
		{
			ok: false,
			message:
				"O envio ainda não está disponível. Nenhum dado foi armazenado. Tente novamente mais tarde.",
		},
		{ status: 503, headers: { "Cache-Control": "no-store" } },
	);
}
