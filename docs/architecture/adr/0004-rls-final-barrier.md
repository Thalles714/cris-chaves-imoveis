# ADR-0004 — RLS como barreira final

- **Status:** aceita
- **Data:** 3 de setembro de 2026
- **Escopo:** autorização no PostgreSQL e Storage

## Contexto

Actions, loaders e IDs são superfícies atacáveis. Uma falha na autorização da aplicação não deve, sozinha, liberar linhas ou objetos privados. O Supabase expõe APIs sobre Postgres e Storage e recomenda RLS; chaves secretas/`service_role` ignoram essas políticas.

## Decisão

Aplicar **GRANT mínimo + RLS default-deny** em toda tabela/schema exposto e políticas equivalentes em `storage.objects`. RLS é a barreira final, não a única barreira.

Ordem de defesa:

1. UI oferece somente ações permitidas, como UX.
2. Loader/action valida entrada, sessão, AAL2, papel, ação e objeto.
3. DAL server-only executa query com identidade/privilégio mínimo.
4. GRANT restringe operação e RLS restringe linha/objeto.
5. Testes reais do banco provam negações.

Tabelas novas nascem sem policy permissiva. `anon` recebe apenas leitura da projeção pública necessária. Tabelas privadas, leads, auditoria, usuários e originais não recebem policy pública.

## Consequências

- Migrations, policies, grants e funções são código versionado.
- Owner de tabela, `security definer` e chave secreta exigem revisão explícita porque podem contornar RLS.
- A chave secreta não será cliente padrão do admin. Quando inevitável, seu módulo e operações são allowlisted e testados.
- Policies complexas precisam de índices e testes de desempenho sem relaxar segurança.
- O dashboard não é fonte única de alterações.

## Validação

- matriz por operação para `anon`, autenticado sem membro, `aal1`, editor e owner;
- testes de IDs pertencentes a outro objeto/usuário;
- testes de leitura e escrita direta via API e Storage;
- migrations sobem do zero e pgTAP/testes SQL passam;
- nenhuma chave secreta aparece no navegador, logs ou artefatos.

## Referências

- [PostgreSQL — Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase — Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase — API keys e bypass de RLS](https://supabase.com/docs/guides/getting-started/api-keys)
