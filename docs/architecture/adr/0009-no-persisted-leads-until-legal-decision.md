# ADR-0009 — Não persistir leads sem decisão legal e operacional

- **Status:** aceita; revisão obrigatória quando as decisões chegarem
- **Data:** 3 de setembro de 2026
- **Escopo:** banco, API, formulários, logs e auditoria

## Contexto

O briefing prevê contato, mas não define se o formulário apenas encaminha ou armazena. Finalidade, base legal, dados mínimos, acesso, retenção e exclusão estão pendentes. Criar tabela “para usar depois” ampliaria o tratamento pessoal sem necessidade aprovada.

## Decisão

Na Etapa 2:

- não criar tabela, view, RPC, bucket, seed, tipo persistente ou policy de `leads`;
- não criar interface ativa de armazenamento;
- não guardar payload de contato em auditoria, log, fila, cache ou metadata;
- não inserir exemplos que pareçam pessoas reais;
- manter formulário/encaminhamento desabilitado até decisão funcional e LGPD.

A futura página de contato não autoriza persistência por existir no escopo visual. Não haverá fallback silencioso.

## Condições para superseder

Um novo ADR só pode autorizar persistência após registrar:

1. finalidade e fluxo exatos;
2. dados mínimos e campos proibidos;
3. base legal validada e transparência;
4. acesso e testes de autorização;
5. retenção/exclusão, inclusive backups;
6. direitos do titular e incidentes;
7. provedor/transferências envolvidos;
8. testes de abuso, enumeração, idempotência, logs e RLS.

## Consequências e validação

- a Etapa 2 pode concluir sem entidade especulativa;
- a Etapa 3 pode avançar visualmente, mas formulário ativo depende da decisão;
- WhatsApp depende de número/mensagem confirmados e não transforma o servidor em repositório;
- testes devem provar ausência de `leads` em schema, DTO, fixtures, logs e Storage.

Referências: [inventário LGPD](../data-inventory-lgpd-stage-2.md), [matriz de acesso](../access-control-matrix-stage-2.md), [bloqueios](../decisions-and-blockers.md).
