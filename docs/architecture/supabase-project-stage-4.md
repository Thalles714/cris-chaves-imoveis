# Projeto Supabase da Etapa 4

**Provisionado em:** 3 de setembro de 2026  
**Plano:** Free, sem cobrança adicional habilitada  
**Região:** South America (São Paulo), `sa-east-1`  
**Project ref:** `bstrlrdcebvdqpvnepfu`  
**URL de baixa sensibilidade:** `https://bstrlrdcebvdqpvnepfu.supabase.co`

## Configuração concluída

- quinze migrations aplicadas na ordem versionada, incluindo a simplificação segura do contrato de publicação;
- RLS, AAL2, auditoria append-only, projeções públicas e Storage privado ativos;
- buckets privados `property-originals` e `property-public`, com limite de 8 MB e apenas JPEG/WebP;
- cadastro público desativado; acesso somente por convite administrativo;
- TOTP habilitado e sessões AAL1 limitadas a 15 minutos;
- Site URL local `http://localhost:5173`;
- redirects locais allowlisted para `/admin/auth/callback` e `/admin/convite`;
- chave publicável dedicada `web_app` e segredo server-only gravados somente em `.dev.vars`, ignorado pelo Git;
- matriz atual de 48 controles verificada integralmente no projeto remoto dentro de transação com `ROLLBACK`; uma consulta independente confirmou zero identidades e zero imóveis sintéticos residuais.
- Auth real ensaiado sem PII: uma identidade `@example.invalid` temporária entrou com senha, cadastrou e verificou TOTP, alcançou AAL2 e foi removida imediatamente; uma consulta posterior confirmou que nenhum usuário sintético permaneceu.

Nenhuma chave é registrada neste documento. A chave privilegiada nunca deve ser
copiada para código, navegador, arquivo versionado ou variável `PUBLIC_*`.

## Pendências deliberadas

- substituir Site URL e redirects locais pelo domínio HTTPS antes do lançamento;
- manter a matriz de 48 controles como gate obrigatório em futuras alterações de schema ou RLS;
- configurar SMTP próprio antes de depender de entrega de e-mail em produção; no plano atual o painel usa templates padrão e não permite editá-los sem SMTP customizado;
- UAT sem assistência concluído e aprovado em 7 de setembro de 2026; o ciclo AAL2, o placeholder seguro `DEMO-001` e o teste operacional com dois novos anúncios também foram concluídos;
- testar restore de backup e aprovar RPO/RTO antes da publicação.
