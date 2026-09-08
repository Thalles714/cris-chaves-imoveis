# Registro de custos, cotas e gatilhos de upgrade

**Estado:** Etapa 5 em andamento; nenhum serviço pago autorizado

**Fotografia:** 7 de setembro de 2026

Valores e limites mudam. Revalidar as fontes oficiais antes de contratar, provisionar ou lançar.

## Baseline sem custo recorrente

| Serviço | Plano atual | Custo base | Uso previsto | Gatilho de revisão |
|---|---|---:|---|---|
| GitHub | Free, repositório público | US$ 0 | código, Actions, Dependabot, CodeQL e secret scanning | exposição indevida, necessidade de tornar privado ou consumo anormal de Actions |
| Cloudflare Workers | Free | US$ 0 | SSR e static assets | 70% de qualquer cota, erro 1027/1102 ou necessidade de recurso pago |
| Supabase | Free | US$ 0 | PostgreSQL, Auth e Storage | 70% de banco, Storage, egress, MAU ou indisponibilidade incompatível com o RPO/RTO aprovado |
| Domínio | pendente | único custo recorrente previamente autorizado | DNS, origem canônica e TLS | seleção e aprovação humana antes da compra |

## Limites operacionais verificados

### Cloudflare Workers Free

- 100.000 requests dinâmicos por dia;
- 10 ms de CPU por request;
- 128 MB de memória;
- 50 subrequests por request;
- 20.000 static assets por versão;
- arquivo estático individual de até 25 MiB.

Fonte: [Workers — Limits](https://developers.cloudflare.com/workers/platform/limits/).

### GitHub Free público

- repositório público sem mensalidade;
- minutos de Actions gratuitos para repositórios públicos;
- Dependabot, code scanning/CodeQL e secret scanning disponíveis no repositório público;
- branch protection/rulesets disponíveis no plano Free para repositórios públicos.

Fontes: [GitHub Pricing](https://github.com/pricing), [GitHub security features](https://docs.github.com/en/code-security/getting-started/github-security-features) e [protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

## Investimento futuro opcional

Nenhum destes itens está autorizado ou necessário para criar o repositório público atual.

| Necessidade futura | Opção | Referência de preço atual |
|---|---|---:|
| tornar repositório pessoal privado com controles avançados de revisão/proteção | GitHub Pro | cerca de US$ 4/mês |
| organização privada com colaboração | GitHub Team | US$ 4 por usuário/mês na tabela atual |
| CodeQL/code scanning avançado em repositório privado de organização | GitHub Code Security | US$ 30 por committer ativo/mês, além do plano elegível |
| secret scanning/push protection completo em repositório privado de organização | GitHub Secret Protection | US$ 19 por committer ativo/mês, além do plano elegível |

Preços em dólar não incluem variação cambial, IOF ou tributos. A combinação privada com Team, Code Security e Secret Protection para um único committer ficaria na ordem de US$ 53/mês antes desses encargos; ela não deve ser contratada sem nova análise de necessidade e aprovação expressa.

Fontes: [GitHub Pricing](https://github.com/pricing) e [Advanced Security billing](https://docs.github.com/en/billing/concepts/product-billing/github-advanced-security).

## Regras financeiras

1. alerta em 50% e revisão em 70% de qualquer cota conhecida;
2. nunca habilitar cobrança por uso, plano pago ou cartão como correção silenciosa;
3. primeiro reduzir consumo, abuso, retenção ou processamento;
4. upgrade exige estimativa mensal, responsável financeiro e aprovação humana registrada;
5. domínio é o único custo recorrente já autorizado, mas compra e nome ainda exigem confirmação.
