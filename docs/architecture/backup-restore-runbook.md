# Runbook manual de backup e restauração

**Estado:** rotina definida; reconstrução local validada, dump criptografado/off-site ainda não executado  
**Plano:** Supabase Free; não há alegação de backup automático  
**Escopo:** banco e mídia em conjuntos separados

Este runbook operacionaliza o [ADR-0006](adr/0006-manual-database-and-media-backup.md). O Supabase recomenda `supabase db dump` e cópia off-site para projetos Free; dump do banco não substitui cópia dos objetos do Storage.

## Parâmetros bloqueantes

| Parâmetro | Valor |
|---|---|
| responsável nominal/substituto | PENDENTE |
| RPO e RTO aceitos | PENDENTE |
| cadência/janela | PENDENTE |
| retenção/descarte | PENDENTE |
| destino off-site do cliente | PENDENTE |
| ferramenta/comando de criptografia | PENDENTE |
| registro/alerta | PENDENTE |
| lista canônica de buckets | virá das migrations/configuração |
| versão da Supabase CLI | deve coincidir com o lockfile final |

Sem esses valores, pode-se ensaiar com dados sintéticos, mas não declarar continuidade pronta nem lançar produção.

## Pré-condições

- máquina controlada, staging em disco cifrado, espaço suficiente e relógio correto;
- Node/pnpm/Supabase CLI fixados, Docker quando exigido e `psql` compatível;
- conta nominal com MFA e menor privilégio suficiente;
- origem identificada por nome, project ref e região — nunca inferida pelo último link;
- restore em projeto vazio, isolado e nunca produção;
- secrets vindos de gerenciador, fora de histórico, Git, log e captura.

## Estrutura fora do repositório

```text
<backup-root>/YYYYMMDDTHHMMSSZ/
├── database/{roles.sql,schema.sql,data.sql}
├── media/<bucket>/...
├── manifests/{operation.md,migrations.txt,storage-list-<bucket>.txt,sha256.csv}
└── evidence/{backup-result.md,restore-result.md}
```

## Backup

### 1. Abrir registro e confirmar origem

Em `operation.md`, registrar em UTC: ticket, operador, commit/release, ambiente, project ref redigido, região, horários, RPO/RTO e buckets. Nunca registrar credencial ou PII.

```powershell
pnpm exec supabase --version
pnpm exec supabase projects list
pnpm exec supabase migration list --linked
git rev-parse HEAD
```

Comparar manualmente o projeto ligado com o aprovado. Divergência encerra a operação.

### 2. Exportar banco

```powershell
pnpm exec supabase db dump --linked --file "<backup-root>\database\roles.sql" --role-only
pnpm exec supabase db dump --linked --file "<backup-root>\database\schema.sql"
pnpm exec supabase db dump --linked --file "<backup-root>\database\data.sql" --data-only --use-copy --exclude "storage.buckets_vectors" --exclude "storage.vector_indexes"
```

Salvar `migration list` no manifesto. Conferir três arquivos não vazios e sem senha/chave. O dump não prova que configuração do painel/Auth/Storage foi capturada; migrations e inventário de configuração continuam necessários.

### 3. Copiar cada bucket

```powershell
pnpm exec supabase storage ls "ss://<bucket>" --recursive --experimental --linked
pnpm exec supabase storage cp "ss://<bucket>" "<backup-root>\media\<bucket>" --recursive --experimental --linked
```

Guardar a listagem e comparar caminhos/quantidade/bytes. Os comandos são marcados experimentais; confirmar a sintaxe da versão fixada antes de cada exercício. Mudança bloqueia a operação — não improvisar com `mv`/`rm`.

### 4. Gerar checksums

```powershell
$backupRoot = (Resolve-Path -LiteralPath "<backup-root>").Path
Get-ChildItem -LiteralPath $backupRoot -Recurse -File |
  Where-Object { $_.Name -ne "sha256.csv" } |
  ForEach-Object {
    [pscustomobject]@{
      Path = [IO.Path]::GetRelativePath($backupRoot, $_.FullName)
      Sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
      Bytes = $_.Length
    }
  } |
  Export-Csv -LiteralPath (Join-Path $backupRoot "manifests\sha256.csv") -NoTypeInformation -Encoding utf8
```

### 5. Cifrar, copiar e verificar

Executar os comandos aprovados na tabela de parâmetros. Enquanto não definidos, este passo é bloqueio deliberado: não criar ZIP aberto nem enviar por e-mail/WhatsApp.

Depois da cópia off-site: recuperar para outro diretório cifrado, decifrar, recalcular todos os SHA-256 e registrar bytes/horários/resultados. Só limpar o staging após confirmação e segundo a retenção aprovada.

## Restore isolado

### 1. Preparar

- obter autorização/ticket;
- identificar alvo vazio, isolado e não produtivo;
- fixar ferramentas e validar checksums após recuperar/decifrar;
- confirmar visualmente project ref/região;
- nunca reutilizar secrets produtivos no exercício.

### 2. Restaurar banco

Obter connection string por canal seguro e seguir o guia oficial vigente. Não colar senha no histórico. Fluxo de referência atual:

```powershell
psql --single-transaction --variable ON_ERROR_STOP=1 `
  --file "<backup-root>\database\roles.sql" `
  --file "<backup-root>\database\schema.sql" `
  --command "SET session_replication_role = replica" `
  --file "<backup-root>\database\data.sql" `
  --dbname "<TARGET_CONNECTION_STRING_FROM_SECURE_CHANNEL>"
```

Antes, revisar orientação vigente sobre privilégios padrão, schemas gerenciados e criptografia do projeto. Não ignorar erro “objeto existente” sem entender o alvo.

### 3. Recriar configuração declarativa

Aplicar migrations/configuração próprias da plataforma: buckets, policies, Auth, redirect URLs, signup fechado, MFA, templates e secrets. Não presumir que o dump captura control plane.

### 4. Restaurar mídia

Depois de buckets/policies existirem, vincular explicitamente a CLI ao alvo:

```powershell
pnpm exec supabase storage cp "<backup-root>\media\<bucket>" "ss://<bucket>" --recursive --experimental --linked
pnpm exec supabase storage ls "ss://<bucket>" --recursive --experimental --linked
```

Comparar listagem, quantidade, bytes e checksums. Nunca tornar bucket privado público para facilitar o restore.

### 5. Aceite

Exigir evidência de:

- schema/histórico reconciliados; constraints, GRANT e RLS ativos;
- testes de todas as personas da [matriz](access-control-matrix-stage-2.md);
- projeção sem rascunho, endereço, nota, lead ou auditoria;
- originais privados e derivados conforme policy;
- auditoria append-only;
- ausência de tabela/policy/DTO/dado `leads`;
- contagens e checksums reconciliados;
- Auth/MFA/recuperação testados conforme o que foi restaurado;
- bundle sem secret e app apontando somente ao alvo.

Registrar duração, ponto restaurado, diferença banco/mídia e falhas. Comparar com RPO/RTO **aprovados**, não com proposta antiga. Não apagar alvo/staging antes da revisão humana.

## Evidência local da Etapa 2

Em 3 de setembro de 2026, o schema foi reconstruído duas vezes a partir das três migrations com seed vazio. Após o reset final, o lint SQL passou sem erros e os 26 cenários pgTAP passaram. Isso valida a reconstrução declarativa e as políticas de acesso, mas **não** é um restore de dump e não substitui o ensaio off-site exigido antes do lançamento.

## Estado do exercício de backup/restore

| Campo | Resultado |
|---|---|
| data/operador | dump/restore off-site NÃO EXECUTADO |
| RPO/RTO observado | NÃO MEDIDO |
| banco/mídia | SEM EVIDÊNCIA |
| RLS/Auth/MFA | RLS local validada; restore de Auth/MFA ainda sem evidência |
| go/no-go | NO-GO até execução e aprovação |

## Referências atuais

- [Backups de banco](https://supabase.com/docs/guides/platform/backups)
- [Backup e restore via CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [CLI `db dump`](https://supabase.com/docs/reference/cli/supabase-migration#supabase-db-dump)
- [Download de objetos](https://supabase.com/docs/guides/storage/management/download-objects)
- [CLI `storage cp`](https://supabase.com/docs/reference/cli/supabase-storage-cp)
