# ADR-0005 — Catálogo dinâmico e admin sem cache compartilhado

- **Status:** aceita
- **Data:** 3 de setembro de 2026
- **Escopo:** consistência, cache e privacidade

## Contexto

Um imóvel publicado, reservado, vendido ou arquivado precisa refletir a mudança na consulta seguinte. O painel carrega sessão e dados privados. Uma invalidação incompleta ou Cache Rule ampla pode servir conteúdo administrativo a outra pessoa ou manter anúncio desatualizado.

## Decisão

Nesta fase, catálogo, filtros e detalhe são **dinâmicos**, lidos da projeção pública em loaders, sem cache compartilhado manual de HTML ou dados. Após uma mutação confirmada, a consulta pública seguinte observa o banco.

Login, recuperação, painel, loaders/actions autenticados e toda resposta personalizada usam:

```http
Cache-Control: private, no-store
X-Robots-Tag: noindex, nofollow
```

Respostas administrativas nunca recebem `public`, `s-maxage` ou regra “Cache Everything”. Assets imutáveis com hash podem usar cache público longo. Cache futuro do catálogo exige novo ADR com chave, TTL, invalidação, teste de remoção e prova de que só contém DTO público.

## Consequências

- Mais invocações dinâmicas e queries ao Supabase; monitorar cotas Workers/Supabase.
- Consistência e segurança têm prioridade sobre uma otimização não medida.
- `no-cache` não substitui `no-store`: o primeiro pode armazenar e revalidar.
- `Set-Cookie` não é usado como única garantia de bypass; os headers explícitos e ausência de regras conflitantes são testados.
- Não se afirma consistência transacional entre cache inexistente e banco; a fonte de verdade permanece a projeção pública.

## Validação

- teste de headers em toda rota admin/auth e resposta de erro;
- verificação de `Cf-Cache-Status`/configuração em staging;
- teste publica/arquiva e consulta em seguida;
- revisão de Cache Rules sem override de `no-store`;
- snapshots públicos contêm somente o DTO.

## Referências

- [Cloudflare — Origin Cache Control](https://developers.cloudflare.com/cache/concepts/cache-control/)
- [Cloudflare — configuração de Workers Cache](https://developers.cloudflare.com/workers/cache/configuration/)
- [React Router — HTTP Headers](https://reactrouter.com/how-to/headers)
