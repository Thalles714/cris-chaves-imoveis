import { Form, useNavigation } from "react-router";

import { Alert, Button, Field } from "~/components/ui";

export function ContactForm({ intent }: { intent: "general" | "property" | "sell" }) {
	const navigation = useNavigation();
	const busy = navigation.state === "submitting";
	const unavailable = true;

	return (
		<div className="contact-form-panel">
			<Alert title="Prefere escrever por aqui?" tone="info">
				Este formulário ainda não recebe mensagens. Enquanto ele não é ativado, fale
				comigo pelo canal direto no topo da página. Nenhum dado digitado abaixo é enviado
				ou armazenado.
			</Alert>
			<Form method="post" className="contact-form" aria-disabled={unavailable}>
				<input type="hidden" name="intent" value={intent} />
				<Field label="Nome" disabled={unavailable}>
					<input name="name" autoComplete="name" maxLength={100} required />
				</Field>
				<div className="contact-form__row">
					<Field label="WhatsApp" disabled={unavailable}>
						<input
							name="phone"
							inputMode="tel"
							autoComplete="tel"
							maxLength={20}
							required
						/>
					</Field>
					<Field label="E-mail" optional disabled={unavailable}>
						<input name="email" type="email" autoComplete="email" maxLength={254} />
					</Field>
				</div>
				<Field label="O que você procura?" disabled={unavailable}>
					<textarea name="message" minLength={10} maxLength={1500} required />
				</Field>
				<div className="contact-form__footer">
					<p>
						Quando este canal estiver disponível, seus dados serão tratados apenas para
						responder ao seu contato.
					</p>
					<Button
						type="submit"
						disabled={unavailable}
						state={busy ? "loading" : "default"}
					>
						Enviar para o Cris
					</Button>
				</div>
			</Form>
		</div>
	);
}
