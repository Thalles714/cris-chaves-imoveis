# Política de ambientes e variáveis

**Estado:** aceita para a fundação  
**Objetivo:** impedir mistura de dados, credenciais e comportamento entre local, preview/staging e produção

## Ambientes

| Ambiente | Dados | Serviços | Publicação/indexação |
|---|---|---|---|
| Local/teste | somente dados sintéticos; catálogo pode usar fixtures claramente marcadas | runtime local do Workers e Supabase local sempre que possível | não público |
| Preview/staging | somente dados sintéticos; nunca cópia de produção | conta/configuração isolada de produção; credenciais próprias | protegido quando houver recurso gratuito adequado e sempre `noindex` |
| Produção | catálogo inicialmente vazio; dados reais somente após aprovação | projeto Supabase e segredos exclusivos de produção | domínio aprovado; conteúdo sujeito ao checklist go/no-go |

Nenhum ambiente não produtivo pode ler banco, Storage, logs ou secrets de produção. O número exato de projetos/contas hospedados será confirmado antes do provisionamento para respeitar os limites gratuitos; se o isolamento não couber no plano autorizado, o provisionamento fica bloqueado e não é feito downgrade silencioso da política.

## Classificação

| Classe | Exemplos de tipo | Onde pode existir |
|---|---|---|
| Pública | origem pública, Supabase URL, chave publicável, site key do Turnstile, IDs de configuração sem privilégio | variável deliberadamente exposta ao cliente e documentação sem valor real |
| Server-only | secret key do Supabase, secret do Turnstile, segredo de sessão/webhook, credencial de notificação | secret store da plataforma e arquivo local ignorado; nunca no bundle, Git, URL ou log |
| Configuração de conteúdo | WhatsApp, assinatura pública, CRECI, domínios allowlisted | por ambiente; produção permanece sem valor enquanto a decisão correspondente estiver pendente |
| Operacional | origem canônica, nível de log, identificador de release, flags seguras | configuração versionada quando não sensível; secret store quando revelar informação restrita |

## Regras obrigatórias

1. O repositório contém apenas `.env.example`, nomes e comentários; nunca valores reais.
2. Arquivos locais como `.dev.vars`/`.env.local` são ignorados pelo Git e não são compartilhados por chat.
3. Configuração pública precisa ser explicitamente allowlisted para o bundle. Ausência de prefixo não é a única proteção: imports cliente/server são verificados no build.
4. Segredos são injetados pelo secret store do ambiente. `wrangler.jsonc` não contém segredo.
5. Cada ambiente recebe credenciais diferentes. Preview não herda secrets de produção.
6. A chave secreta do Supabase não é usada por padrão. Cada uso exige módulo server-only, caso de uso nomeado, autorização antes da chamada e teste de não vazamento.
7. Preferir as chaves `publishable` e `secret`; não iniciar código novo com as chaves legadas `anon`/`service_role`.
8. Valores não são incluídos em exception message, telemetry, snapshot, fixture, screenshot, URL ou output de CI.
9. Produção falha de modo seguro quando falta variável obrigatória. Para conteúdo pendente, não publicar CTA/identidade fictícia.
10. Rotação ocorre em suspeita de vazamento, saída de colaborador ou mudança de fornecedor; o runbook deve registrar consumidores, ordem de troca e validação.

## Inventário inicial de nomes

Os nomes abaixo são um contrato de configuração, não valores aprovados. A implementação pode ajustar a convenção de prefixo do framework sem mudar a classificação.

| Nome lógico | Classe | Ambientes | Observação |
|---|---|---|---|
| `APP_ORIGIN` | operacional | todos | origem exata por ambiente; usada em validação de Origin/links canônicos |
| `SUPABASE_URL` | pública | todos | URL distinta por ambiente |
| `SUPABASE_PUBLISHABLE_KEY` | pública | todos | o acesso real é limitado por GRANT/RLS |
| `SUPABASE_SECRET_KEY` | server-only | somente onde houver caso aprovado | opcional; ausência é preferível ao uso amplo |
| `TURNSTILE_SITE_KEY` | pública | preview/produção quando implementado | Etapa 3 |
| `TURNSTILE_SECRET_KEY` | server-only | preview/produção quando implementado | validação exclusivamente no servidor |
| `SESSION_SECRET` | server-only | todos com valores distintos | apenas se a integração escolhida exigir segredo próprio |
| `PUBLIC_PROFESSIONAL_NAME` | conteúdo | produção após confirmação | bloqueio de publicação enquanto pendente |
| `PUBLIC_CRECI` | conteúdo | produção após confirmação | bloqueio de publicação enquanto pendente |
| `PUBLIC_WHATSAPP` | conteúdo | produção após confirmação | não usar número demonstrativo |
| `VIDEO_PROVIDER_ALLOWLIST` | configuração | todos | política versionada e restrita a YouTube/Vimeo nesta arquitetura |

Não adicionar provedor de e-mail, analytics, pixel, chat ou outro secret até a decisão funcional/LGPD correspondente.

## Verificações

- scan de secrets em cada commit e artefato;
- inspeção do bundle cliente por nomes e padrões de chave privilegiada;
- teste que preview aponta para projeto não produtivo;
- teste que variáveis obrigatórias ausentes impedem inicialização ou ocultam a função pendente sem fallback fictício;
- revisão de permissões da conta e dos secrets antes do go-live.

Referências: [Cloudflare Workers — limites de variáveis](https://developers.cloudflare.com/workers/platform/limits/), [Supabase — API keys](https://supabase.com/docs/guides/getting-started/api-keys).
