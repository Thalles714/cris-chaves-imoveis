import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import type { ReactNode } from "react";
import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import { AppearanceProvider, AppearanceScript } from "./design-system";
import "./styles/design-system.css";
import "./app.css";

export function Layout({ children }: { children: ReactNode }) {
	return (
		<html
			lang="pt-BR"
			data-theme="horizonte"
			data-color-scheme="light"
			suppressHydrationWarning
		>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<meta name="color-scheme" content="light dark" />
				<meta name="theme-color" content="#f4f1ed" />
				<link rel="icon" href="/favicon.ico" sizes="any" />
				<link rel="icon" type="image/png" sizes="32x32" href="/brand/favicon-32x32.png" />
				<link rel="apple-touch-icon" href="/brand/apple-touch-icon.png" />
				<link rel="manifest" href="/site.webmanifest" />
				<Meta />
				<Links />
				<AppearanceScript />
			</head>
			<body>
				<AppearanceProvider>{children}</AppearanceProvider>
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let title = "Não foi possível abrir esta página";
	let detail = "Ocorreu um erro inesperado. Tente novamente em instantes.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		title =
			error.status === 404
				? "Página não encontrada"
				: error.status === 400
					? "Não foi possível aplicar esta busca"
					: `Erro ${error.status}`;
		detail =
			error.status === 404
				? "O endereço informado não existe ou o conteúdo não está publicado."
				: error.status === 400
					? "Revise os filtros informados e tente novamente."
					: error.statusText || detail;
	} else if (import.meta.env.DEV && error instanceof Error) {
		detail = error.message;
		stack = error.stack;
	}

	return (
		<main className="error-page cc-container" id="conteudo">
			<p className="site-eyebrow">Cris Chaves Imóveis</p>
			<h1>{title}</h1>
			<p>{detail}</p>
			<a className="cc-button cc-button--primary" href="/">
				Voltar ao início
			</a>
			{stack && (
				<details className="error-page__details">
					<summary>Detalhes técnicos</summary>
					<pre>
						<code>{stack}</code>
					</pre>
				</details>
			)}
		</main>
	);
}
