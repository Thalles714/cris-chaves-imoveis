# ADR-0006 — Backup manual de banco e mídia

- **Status:** solução futura; bloqueio inicial substituído pela ADR-0010
- **Data:** 3 de setembro de 2026
- **Escopo:** continuidade no Supabase Free

## Contexto

A documentação atual do Supabase recomenda que projetos Free exportem regularmente os dados com `supabase db dump` e mantenham backups off-site. O backup do banco não inclui os objetos do Storage, apenas seus metadados. O orçamento não autoriza Pro/PITR.

## Decisão

Usar duas rotinas independentes:

1. **Banco:** dump lógico reproduzível via Supabase CLI, incluindo schema/policies e dados conforme a opção suportada; migrations continuam versionadas no Git.
2. **Mídia:** cópia dos objetos do Storage por API, acompanhada de manifesto com caminho, tamanho, hash, propriedade e versão quando disponível.

Cada conjunto deve ser cifrado, ter checksum, data, versão das ferramentas e destino off-site sob controle do cliente. Um backup só é considerado válido depois de restore isolado e verificação de schema, RLS, catálogo, auth necessária, referências e arquivos.

Não declarar backup automático no Free. Não guardar a única cópia no mesmo projeto/conta Supabase.

## Parâmetros pendentes

- RPO e RTO aceitos;
- frequência, retenção e janela de execução;
- destino off-site e ferramenta de criptografia;
- responsável por executar, verificar, restaurar e apagar;
- tratamento das credenciais e dados pessoais no backup.

Até esses itens serem aprovados e um restore completo ser medido, esta rotina não pode ser declarada operacional. A ADR-0010 registra a aceitação temporária do risco e substitui somente o bloqueio de lançamento durante a fase inicial de baixo volume.

## Consequências

- A rotina manual tem risco humano e precisa de checklist/log de execução.
- Banco e mídia podem ficar temporalmente desalinhados; o runbook deve registrar o ponto dos dois conjuntos e aceitar ou mitigar a diferença conforme RPO aprovado.
- Exclusão no sistema não some imediatamente de backups; retenção/LGPD precisa documentar a janela.
- Restore deve usar ambiente isolado, sem dados reais em preview comum e sem sobrescrever produção.

## Validação

- dump e manifesto têm checksum verificado;
- restauração parte de ambiente vazio;
- testes confirmam policies/RLS e ausência de segredo no arquivo;
- amostra e total de objetos conferem com o manifesto;
- duração e perda observada são comparadas ao RPO/RTO aprovado;
- resultado fica registrado com data e responsável.

## Referências

- [Supabase — Database Backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase — Download de objetos](https://supabase.com/docs/guides/storage/management/download-objects)
- [Checklist de bloqueios](../decisions-and-blockers.md)
