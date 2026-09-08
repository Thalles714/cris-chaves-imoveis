# Prompts de implementação — ordem obrigatória

Estes arquivos são atalhos operacionais para os cinco prompts canônicos mantidos em `docs/plano-tecnico-seguranca-e-5-prompts.md`.

Execute **um prompt por vez**, nesta ordem:

1. `01-fundacao.md`
2. `02-dados-seguranca.md`
3. `03-site-publico.md`
4. `04-area-administrativa.md`
5. `05-hardening-lancamento.md`

## Regra de avanço

O agente deve terminar a etapa, executar todas as verificações, produzir o relatório de handoff e demonstrar que o gate foi atendido. O próximo prompt somente pode ser iniciado depois da revisão humana da etapa anterior.

## Fontes que prevalecem

1. Briefing mais recente: contrato funcional.
2. `design_system.html`: contrato visual final.
3. `docs/plano-tecnico-seguranca-e-5-prompts.md`: arquitetura, segurança, orçamento e prompts canônicos.
4. `docs/pesquisa-arquitetura-seguranca.md`: pesquisa de apoio; suas recomendações pagas antigas não prevalecem.

## Orçamento obrigatório

O único custo autorizado é o domínio. Não cadastrar cartão, ativar cobrança por uso, contratar plano, usar Vercel ou Cloudinary. A infraestrutura de lançamento é Cloudflare Workers Free + Supabase Free.

