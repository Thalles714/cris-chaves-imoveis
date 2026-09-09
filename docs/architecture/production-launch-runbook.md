# Runbook de lançamento, rollback e incidente

**Estado:** preparado; execução de produção ainda não autorizada.

## Papéis mínimos

Antes da janela, registrar uma pessoa responsável por decisão go/no-go, contas e recuperação, resposta a alertas e comunicação com o cliente. Confirmar MFA e códigos de recuperação de Registro.br, Cloudflare, GitHub e Supabase sem registrar códigos neste repositório.

## Pré-condições obrigatórias

- chave privilegiada exposta rotacionada e a anterior aposentada;
- branch protegida e todos os checks remotos verdes;
- textos legais aprovados e placeholders arquivados;
- migration 16 testada localmente e artefato de produção aprovado por dry-run;
- Site URL e redirects de autenticação prontos para o domínio final;
- responsável operacional disponível durante a janela.

## Sequência controlada

1. Abrir uma janela curta de manutenção e suspender uploads administrativos.
2. Criar uma nova chave secreta do Supabase, atualizar os consumidores, validar e só então aposentar a anterior.
3. Aplicar a migration 16 no Supabase remoto e registrar o identificador aplicado.
4. Cadastrar no Worker de produção `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY` como secrets.
5. Gerar o artefato e executar o dry-run. Conferir ambiente, domínio, bindings gratuitos e ausência de segredo no bundle.
6. Publicar o Worker sem habilitar o domínio e testar uma rota privada quando disponível.
7. Configurar no Supabase Auth a Site URL HTTPS e somente os redirects exatos usados por convite e recuperação.
8. Remover o DS/DNSSEC do provedor anterior, confirmar a remoção na origem, respeitar qualquer janela de transição do registro, trocar os nameservers somente quando a zona Cloudflare responder autoritativamente e aguardar sua ativação.
9. Ativar os Custom Domains `crischaves.com.br` e `www.crischaves.com.br`; redirecionar permanentemente `www` para a raiz.
10. Confirmar certificado TLS, HTTPS, HSTS, CSP, `nosniff`, noindex administrativo e cache privado.
11. Executar o checklist pós-publicação e, apenas depois, remover o bloqueio de indexação pública.

## Checklist pós-publicação

- home, catálogo, imóvel, mídia, sitemap e robots respondem no domínio canônico;
- nenhuma URL local, de staging ou `workers.dev` aparece no HTML;
- login, convite/recuperação e MFA AAL2 funcionam;
- publicar um placeholder seguro, conferir marca-d'água e ausência de endereço privado, arquivar e restaurar;
- repetir controles remotos em transação com rollback e executar baseline ZAP;
- conferir logs redigidos, rate limits, erros e alertas sem persistir dados pessoais desnecessários;
- arquivar o placeholder do smoke test e confirmar o catálogo final.

## Rollback seguro

- falha visual ou de aplicação: desativar a rota pública ou exibir manutenção e reimplantar a última versão **compatível com a migration 16**;
- falha após migration 16: não reabrir leitura AAL1, UPDATE de Storage ou RPC antigo; corrigir o Worker ou manter uploads suspensos;
- falha de DNS/TLS: remover o custom domain/registro recém-adicionado e manter o Worker sem rota pública;
- falha de autenticação: suspender o painel, restaurar apenas URLs exatas conhecidas e invalidar sessões quando necessário;
- suspeita de segredo: colocar o painel em manutenção, criar nova chave, substituir consumidores, validar e aposentar a comprometida.

Rollback de banco que reduza segurança é proibido. Toda decisão deve registrar horário, responsável, versão, sintomas e resultado.

## Incidente e fornecedor indisponível

1. Conter: desligar a superfície afetada e preservar o site público quando seguro.
2. Classificar: indisponibilidade, conta, segredo, dado privado, publicação incorreta ou abuso.
3. Rotacionar credenciais somente depois de mapear consumidores; nunca colar segredo em ticket ou chat.
4. Comunicar o responsável e registrar fatos sem dados pessoais desnecessários.
5. Recuperar com a última versão segura e executar o smoke test completo.
6. Revisar causa raiz, impacto, ações preventivas e necessidade de comunicação legal.

Sem backup próprio, uma perda de banco/mídia poderá exigir recadastro manual conforme ADR-0010. Esse risco deve ser reavaliado ao aumentar volume, frequência de alterações ou dependência operacional.
