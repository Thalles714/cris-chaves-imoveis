# ADR-0003 — Separação público/admin e DTO público

- **Status:** aceita
- **Data:** 3 de setembro de 2026
- **Escopo:** limites de confiança e exposição de dados

## Contexto

O site deve mostrar catálogo e cidade/bairro, enquanto endereço exato, coordenadas, notas, autorização, proprietário, usuários, leads, auditoria e originais são privados. Site e painel ficam no mesmo monólito para reduzir operação, mas compartilhar deploy não pode significar compartilhar dados ou autorização.

## Decisão

Separar rotas, módulos e contratos públicos dos administrativos. O navegador público recebe exclusivamente um **DTO público allowlisted**, construído por query/projeção server-only a partir de imóveis publicados.

O DTO público nunca é derivado com `omit` sobre uma entidade privada. Sua definição enumera campos permitidos e é aplicada igualmente a loader data, JSON, SSR/hydration, metadata, JSON-LD, sitemap, erros e logs.

O admin usa DTOs próprios mínimos. Toda action/loader administrativa autentica e autoriza a operação e o objeto; esconder rota, botão ou campo é somente UX.

## Consequências

- Alterar a entidade privada não amplia automaticamente o contrato público.
- Queries públicas não selecionam `*` e não acessam tabelas privadas.
- Código público não importa repositório administrativo nem chave privilegiada.
- Endereço exato não aparece nem para SEO, cache, source map ou mensagens de erro.
- Testes de BOLA/IDOR e BOPLA são obrigatórios em IDs e campos.

## Validação

- testes de contrato falham se chave não allowlisted aparecer;
- snapshots cobrem HTML, hydration data, API, JSON-LD e metadata;
- busca por nomes de campos privados no build não encontra valor real;
- anônimo não lê rascunho ou tabela privada por acesso direto;
- cada mutação é chamada diretamente sem a interface e deve negar perfis incorretos.

## Referências

- [Visão e contrato do DTO](../architecture-overview.md#contrato-do-dto-público)
- [OWASP ASVS 5.0.0](https://github.com/OWASP/ASVS/releases/tag/v5.0.0_release)
