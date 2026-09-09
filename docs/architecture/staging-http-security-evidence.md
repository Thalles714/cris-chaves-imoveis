# Evidência HTTP de segurança do staging

> Reexecução em 9 de setembro de 2026 após a migration 16 e o deploy do Worker compatível: 14 controles aprovados, sem mutação persistente.

**Data:** 8 de setembro de 2026  
**Alvo permitido:** `cris-chaves-imoveis-staging.thallestleal.workers.dev`  
**Comando:** `pnpm check:staging-security`

## Escopo e segurança de execução

O script `scripts/check-staging-http-security.mjs` aceita somente HTTPS e o hostname explícito do Worker de staging. Ele não usa credenciais, não segue redirects automaticamente e não executa transição de estado. Os identificadores administrativos usados são UUIDs inexistentes.

## Resultado reproduzível

| Controle | Resultado esperado e observado |
| --- | --- |
| home, headers e catálogo | `200`; HSTS, CSP obrigatória com nonce, anti-framing, `nosniff` e `noindex, nofollow` |
| admin sem sessão | `302` somente para `/admin/entrar`, com `private, no-store` |
| tentativa de IDOR sem sessão | `302` para login, sem conteúdo privado |
| POST sem `Origin` | `403` |
| POST com origem hostil | `400` genérico na rota aninhada, sem conteúdo privado |
| POST same-origin sem sessão | `302` para login |
| upload com origem hostil | `403` |
| upload JSON não permitido | `415` |
| marcador XSS no filtro | `400`, sem reflexão do marcador |
| mídia pública opaca | `200` e `Content-Type` de imagem permitido |
| projeção pública do imóvel | `200`; bairro/cidade presentes e campos privados ausentes |
| `robots.txt` de preview | `200`, bloqueio de `/admin` e header `noindex, nofollow` |
| sitemap público | `200`, origem correta e ausência de rotas/campos administrativos |

Todos os 14 controles foram aprovados sem mutação persistente. A diferença `400`/`403` do POST hostil decorre do tratamento da rota aninhada, mas permanece fail-closed, genérica e sem acesso à operação ou ao objeto.

## Complemento autenticado AAL2

Em 9 de setembro de 2026, uma sessão administrativa com MFA confirmado enviou uma imagem segura ao placeholder `DEMO-004`. O fluxo privilegiado concluiu o tratamento, publicou a derivada em rota opaca, aplicou a marca-d'água central `Cris Chaves` e registrou os eventos `Mídia adicionada` e `Mídia alterada`. A página pública apresentou somente bairro e cidade, sem endereço exato. Essa prova valida o novo segredo do Worker antes da aposentadoria da chave antiga.

## Rastreabilidade ASVS inicial

Esta evidência contribui diretamente para `v5.0.0-V1.1.2`, `V1.2.1`, `V3.4.1`, `V3.4.4`, `V3.4.6`, `V3.5.1`, `V4.1.1`, `V8.2.2` e `V14.3.2`. Ela não encerra isoladamente esses requisitos: revisão de código, testes autenticados, RLS/pgTAP, matriz de navegador e evidências complementares continuam aplicáveis.

## Pendências deliberadas

- repetir casos administrativos autenticados com papéis e objetos cruzados;
- executar ZAP Baseline quando a ferramenta estiver disponível;
- fechar a matriz individual dos 253 requisitos ASVS L2;
- repetir em domínio canônico somente após autorização explícita de go-live.

Fonte canônica: [OWASP ASVS 5.0.0](https://github.com/OWASP/ASVS/releases/tag/v5.0.0_release).
