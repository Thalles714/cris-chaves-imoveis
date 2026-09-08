# Matriz de acesso — Etapa 2

**Estado:** políticas implementadas e matriz ampliada para 48 controles; 52 testes locais e os 48 controles remotos com rollback aprovados em 7 de setembro de 2026
**Escopo:** aplicação, PostgreSQL e Storage

## Atores

| Ator | Definição |
|---|---|
| `anon` | requisição sem sessão Supabase válida |
| `auth-sem-papel` | identidade autenticada sem vínculo administrativo ativo |
| `aal1` | membro `owner` ou `editor` ativo, mas sem MFA `aal2` na sessão atual |
| `editor` | membro ativo com papel `editor` e sessão `aal2` |
| `owner` | membro ativo com papel `owner` e sessão `aal2` |

E-mail, `user_id`, botão oculto ou claim do navegador não concedem papel. O servidor valida token, AAL, vínculo, papel, operação e alvo.

**Permitir** sempre pressupõe validação server-side e RLS/GRANT. **Condicional** exige o gate descrito. **Sistema** significa trigger/função server-only nominada, não permissão do usuário.

## Capacidades

| Capacidade | `anon` | `auth-sem-papel` | `aal1` | `editor` | `owner` |
|---|---|---|---|---|---|
| Ler catálogo/detalhe pelo DTO publicado | Permitir | Permitir | Permitir | Permitir | Permitir |
| Ler rascunhos/arquivados ou dados administrativos | Negar | Negar | Negar | Permitir | Permitir |
| Ler endereço/coordenada, notas e comprovação privada | Negar | Negar | Negar | Permitir | Permitir |
| Criar/editar imóvel e detalhe privado | Negar | Negar | Negar | Permitir | Permitir |
| Publicar, reservar, vender, arquivar ou restaurar | Negar | Negar | Negar | Condicional aos gates | Condicional aos gates |
| Executar exclusão lógica | Negar | Negar | Negar | Permitir com confirmação/auditoria | Permitir com confirmação/auditoria |
| Executar exclusão física | Negar | Negar | Negar | Negar | Condicional a operação dedicada, MFA recente e razão auditada |
| Ler/organizar originais e fotos pendentes | Negar | Negar | Negar | Permitir | Permitir |
| Publicar derivado de foto | Negar | Negar | Negar | Condicional à validação | Condicional à validação |
| Cadastrar vídeo normalizado | Negar | Negar | Negar | Condicional à allowlist/tratamento/autorização | Condicional à allowlist/tratamento/autorização |
| Consultar o próprio vínculo administrativo | Negar | Própria linha; resultado vazio | Própria linha | Própria linha | Própria linha |
| Listar membros | Negar | Negar | Negar | Negar | Permitir |
| Convidar, alterar papel ou desativar membro | Negar | Negar | Negar | Negar | Permitir, sem autoelevação ou remoção do último owner |
| Ler auditoria | Negar | Negar | Negar | Negar | Permitir |
| Criar/editar/apagar auditoria diretamente | Negar | Negar | Negar | Negar | Negar; criação é do sistema e registro é append-only |
| Criar/consultar lead persistido | Negar | Negar | Negar | Negar | Negar; entidade não existe nesta etapa |

O baseline conservador deixa `aal1` apenas completar/recuperar MFA e encerrar sessão; não entrega dados administrativos. Relaxar isso exige revisão da matriz e dos testes.

## Políticas esperadas por recurso

| Recurso/operação | Política esperada |
|---|---|
| projeção pública — `SELECT` | todos; somente linhas publicadas, não excluídas e colunas allowlisted |
| `properties` — `SELECT` | membro ativo `aal2`; nenhuma leitura base para `anon`, sem papel ou `aal1` |
| `properties` — `INSERT/UPDATE` | `editor`/`owner` `aal2`, com schema, versão e gates |
| `properties` — `DELETE` | negado a todos os papéis do painel; usar somente soft delete recuperável |
| `property_private_details` | sem policy pública; `editor`/`owner` `aal2` conforme imóvel/operação |
| `property_media` | público recebe só derivado aprovado no DTO; admins `aal2` gerem registros |
| `admin_members` — própria linha | leitura mínima da associação; sem associação resulta em zero linhas |
| `admin_members` — lista/mutação | owner `aal2`; proteger autoelevação e último owner |
| `audit_events` — `SELECT` | owner `aal2` |
| `audit_events` — `INSERT` | mecanismo confiável do sistema após ação autorizada |
| `audit_events` — `UPDATE/DELETE` | negar a todos os fluxos comuns, inclusive owner |
| `storage.objects` — original/pendente | bucket privado; `editor`/`owner` `aal2`, caminho do imóvel autorizado |
| `storage.objects` — derivado público | leitura do objeto aprovado; listar bucket não é implicitamente permitido |
| `storage.objects` — escrita/remoção | escrita por `editor`/`owner` `aal2`; remoção física negada a todos os papéis do painel |
| `leads` | tabela, DTO, policy e rota de persistência não existem |

Backup, restore e convite inicial não pertencem ao papel `owner` da aplicação. São operações de responsável operacional nominal. Chave secret/`service_role` ignora RLS e não é atalho do painel.

## Testes necessários

- `anon` lê só projeção publicada e não enumera privado por ID, filtro, RPC, erro ou Storage;
- `auth-sem-papel` não acessa admin nem ganha efeito ao enviar identidade/papel;
- `aal1` não lê admin nem faz mutação;
- `editor` não gere membros ou auditoria e não possui exclusão definitiva;
- `owner` executa apenas o previsto, não remove o último owner e também não possui exclusão definitiva;
- troca de ID não atravessa objeto/campo não autorizado;
- negação não produz alteração parcial ou evento enganoso;
- auditoria rejeita update/delete e registra evento seguro após ação válida;
- original/pendente não é público e o bucket não é listável anonimamente;
- não existe tabela, view, RPC, bucket ou DTO de leads.

As policies existem nas migrations versionadas. Em 7 de setembro de 2026, o banco local foi reconstruído do zero com as 15 migrations, o lint dos schemas terminou sem erros e os 52 testes pgTAP passaram. Os 48 controles de segurança também foram repetidos no projeto remoto dentro de transação com `ROLLBACK`, sem resíduos sintéticos, conforme registrado no [handoff da Etapa 4](handoff-stage-4.md).

Referências: [ADR-0004](adr/0004-rls-final-barrier.md), [ADR-0003](adr/0003-public-admin-separation-public-dto.md), [ASVS](asvs-5-l2-initial-matrix.md).
