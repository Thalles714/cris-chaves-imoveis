import { Alert } from "~/components/ui";

export function ContactForm({
	intent,
	whatsappUrl,
}: {
	intent: "general" | "property" | "sell";
	whatsappUrl: string | null;
}) {
	const title =
		intent === "sell"
			? "Conte o básico sobre o seu imóvel."
			: intent === "property"
				? "Converse sobre este imóvel."
				: "Comece a conversa pelo WhatsApp.";

	return (
		<div className="contact-form-panel">
			<p className="site-eyebrow">Atendimento direto</p>
			<h2>{title}</h2>
			<p className="contact-form-panel__lede">
				Você fala diretamente com o Cris, sem cadastro e sem deixar seus dados em um
				formulário intermediário.
			</p>
			{whatsappUrl ? (
				<a
					className="cc-button cc-button--primary contact-form-panel__cta"
					href={whatsappUrl}
					target="_blank"
					rel="noreferrer"
				>
					Conversar pelo WhatsApp
				</a>
			) : (
				<Alert title="Canal temporariamente indisponível" tone="info">
					O contato direto está sendo configurado. Nenhum dado é coletado nesta página.
				</Alert>
			)}
			<p className="contact-form-panel__privacy">
				Ao continuar, você será direcionado ao WhatsApp e poderá decidir o que deseja
				compartilhar.
			</p>
		</div>
	);
}
