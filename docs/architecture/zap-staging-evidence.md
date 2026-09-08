# Evidência OWASP ZAP do staging

**Alvo:** `https://cris-chaves-imoveis-staging.thallestleal.workers.dev`

**Modo:** baseline passivo, com spider tradicional e Ajax por três minutos

**Persistência:** nenhuma credencial e nenhuma ação ativa de alteração

## Primeira execução

A execução GitHub Actions `34181535465`, em 8 de setembro de 2026, terminou bloqueada após 4 minutos e 12 segundos porque o ZAP encontrou alertas. O comportamento fail-closed era o esperado.

O relatório continha 19 grupos de alerta, distribuídos em 12 IDs de regra. Não houve alerta alto ou crítico. A revisão identificou:

- achados reais em assets estáticos: ausência de HSTS, `X-Content-Type-Options` e `Permissions-Policy`;
- ausência de `Cross-Origin-Resource-Policy` em parte das respostas;
- alertas esperados sobre CSRF apesar da validação obrigatória de `Origin` nas ações;
- detecção esperada da rota de autenticação;
- falsos positivos de Base64 sobre nonces CSP e strings do bundle;
- armazenamento local limitado a tema/esquema de cor e posições de rolagem do React Router;
- políticas deliberadas de cache (`no-store` para HTML/admin e revalidação para assets);
- ausência de cabeçalhos `Sec-Fetch-*` nas requisições sintéticas do próprio ZAP;
- parâmetros controláveis sem reflexão executável, já cobertos por encoding do framework e teste XSS negativo.

## Remediação

- `public/_headers` aplica HSTS, `nosniff`, Permissions-Policy, CORP, Referrer-Policy e anti-framing aos Static Assets servidos sem invocar o Worker;
- respostas do Worker também passam a aplicar `Cross-Origin-Resource-Policy: same-origin`;
- `pnpm check:staging-security` verifica os headers tanto em respostas dinâmicas quanto em favicon, manifest e JavaScript versionado;
- `.zap/rules.tsv` contém somente nove exceções revisadas; qualquer alerta não listado continua falhando o workflow;
- teste arquitetural congela a lista exata de exceções e proíbe ignorar as regras corrigidas `10021`, `10035` e `10063`.

COEP `require-corp` não foi habilitado porque o produto usa frames cross-origin explicitamente permitidos para Cloudflare Turnstile, YouTube e Vimeo. Ativá-lo sem uma matriz completa desses recursos poderia causar indisponibilidade. CORP é aplicado e testado separadamente; a regra agregada `90004` fica justificada na política ZAP.

## Estado

Remediação publicada no staging como versão `800fcffd-6e32-41ac-bf5d-f510944d6514`. O comando `pnpm check:staging-security` aprovou 14 controles sem credenciais ou mutação, incluindo favicon, manifest e JavaScript versionado com os headers completos.

A segunda execução ZAP, `34182848680`, foi aprovada em 8 de setembro de 2026 após 4 minutos e 17 segundos. A inspeção do artifact confirmou 15 grupos de alerta pertencentes exatamente aos nove IDs justificados em `.zap/rules.tsv`. Não houve ID novo ou alerta não classificado.

Os achados corrigidos desapareceram do relatório:

- `10021` — `X-Content-Type-Options Header Missing`: ausente;
- `10035` — `Strict-Transport-Security Header Not Set`: ausente;
- `10063` — `Permissions Policy Header Not Set`: ausente.

**Resultado do gate:** baseline ZAP do staging aprovada, com exceções explícitas, versionadas e protegidas por teste arquitetural. Isso não substitui pentest profissional nem encerra isoladamente o ASVS L2.

Fontes: [headers de Static Assets do Cloudflare Workers](https://developers.cloudflare.com/workers/static-assets/headers/) e [configuração oficial do ZAP Baseline Action](https://github.com/zaproxy/action-baseline/blob/master/README.md).
