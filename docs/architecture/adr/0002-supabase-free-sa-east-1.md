# ADR-0002 — Supabase Free em `sa-east-1`

- **Status:** aceita com condição operacional
- **Data:** 3 de setembro de 2026
- **Escopo:** banco, autenticação, arquivos e região primária

## Contexto

O domínio exige relações e filtros de imóveis, autenticação administrativa, controle de acesso por linha e armazenamento de fotos. O orçamento proíbe serviço pago. A documentação atual do Supabase lista São Paulo (`sa-east-1`) como região específica e informa que a região escolhida define a localização primária dos dados; isso não prova conformidade LGPD por si só.

## Decisão

Usar Supabase Free para PostgreSQL, Auth e Storage. Criar a produção em **South America (São Paulo), `sa-east-1`**, somente se a região estiver disponível ao provisionar o projeto Free.

Se `sa-east-1` não estiver disponível, não selecionar outra região silenciosamente: registrar o bloqueio, avaliar latência, residência/transferência internacional e obter decisão humana antes de prosseguir.

Desenvolvimento e preview não usam dados nem credenciais de produção. Signup público fica fechado; MFA e políticas serão implementados na Etapa 2. Originais de fotos ficam privados e derivados aprovados podem ser públicos conforme a futura política de Storage.

## Consequências

- A arquitetura depende da disponibilidade e cotas do Free; pausas/cotas devem ser acompanhadas.
- Banco, Auth e Storage compartilham o ciclo operacional de um fornecedor, reduzindo integrações e aumentando impacto de indisponibilidade.
- RLS e GRANT precisam ser versionados e testados; dashboard não é fonte única do schema.
- Storage exige backup separado do banco.
- Chave publicável pode existir no cliente; chave secreta ignora RLS e fica server-only, com uso excepcional.
- Não há criação de projeto real ou credencial nesta Etapa 1.

## Validação

- confirmar `sa-east-1` e plano Free no momento do provisionamento;
- registrar project ref/região sem segredo;
- verificar signup fechado, MFA, GRANT/RLS e buckets antes de dados reais;
- medir banco, Storage, egress e usuários contra as cotas vigentes;
- restaurar dump e mídia em ambiente isolado antes do lançamento.

## Referências

- [Supabase — regiões disponíveis](https://supabase.com/docs/guides/platform/regions)
- [Supabase — RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase — controle de acesso do Storage](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase — API keys](https://supabase.com/docs/guides/getting-started/api-keys)
