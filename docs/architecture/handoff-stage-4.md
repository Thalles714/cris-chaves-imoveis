# Handoff da Etapa 4 — área administrativa

**Estado do gate:** APROVADO — Etapa 4 concluída e Etapa 5 autorizada

**Data:** 7 de setembro de 2026

## Precedência confirmada

- [`design_system.html`](../../design_system.html) é a base visual canônica usada pelo site e pelo painel.
- [Resider](https://resider.ca/home) é somente referência secundária de composição e acabamento; nenhum ativo, fonte, texto ou código foi copiado.
- CRECI `89448`, WhatsApp `+55 51 99999-6129` e o pacote de logotipo web estão confirmados pelo cliente.

## Implementado

- Login por e-mail/senha, recuperação, reset, logout e convite fechado.
- O bridge do convite hospedado aceita tokens opacos não vazios e delega sua autenticidade ao Supabase; isso cobre também o refresh token curto emitido pelo GoTrue local sem relaxar tipo, tamanho máximo, origem ou rate limit.
- Enrollment e desafio TOTP; AAL1 fica restrito ao bootstrap de MFA e recuperação.
- Respostas administrativas `private, no-store` e `noindex, nofollow`, reforçadas também na fronteira global do Worker para erros.
- Limites independentes para autenticação e mutações por IP, por usuário/identidade e pela combinação dos dois, sem registrar os valores brutos.
- Dashboard, lista com busca por código/título, filtros de publicação/negociação/excluídos, paginação funcional, vazios reais, tabela responsiva, estados semânticos e criação rápida em drawer.
- Criação e edição por seções, navegação por abas, rascunho, publicação, destaque, reserva, venda, arquivamento, restauração e soft delete.
- A URL amigável é gerada automaticamente a partir do título e permanece visível e editável tanto na criação rápida quanto no formulário completo.
- O cadastro possui três etapas reais — informações, fotos e vídeos, revisar e publicar — e, após salvar, abre diretamente a mídia; a terceira etapa concentra checklist, prévia e ações editoriais sem exigir retorno à primeira tela.
- Após cada ação, o fluxo retorna ao contexto útil: criação segue para mídia, operações de mídia permanecem na mídia, ações editoriais permanecem na revisão e mover para excluídos retorna à lista de imóveis.
- Erros de validação do cadastro são apresentados em português junto ao campo correto, e todos os valores informados permanecem no formulário para correção sem retrabalho.
- O checklist editorial impede publicar sem descrição, foto tratada e capa aprovada. A autorização escrita deixou de ser uma etapa cadastral e passou a uma única confirmação obrigatória na ação final de publicar; a função versionada e o gatilho transacional também impedem contornar essa confirmação.
- Controle otimista de versão e confirmação nas transições destrutivas expostas; hard delete foi removido da matriz de operações e bloqueado no banco.
- Máquina de estados atômica no PostgreSQL que rejeita transições reversas ou atalhos não aprovados.
- Dados privados separados; endereço, contato do proprietário e observações internas são opcionais e não entram na projeção pública.
- Entrada de fotos PNG/JPEG/WebP validada e reencodada no navegador para JPEG/WebP, com remoção de EXIF/XMP, limites, checksum, original tratado privado, derivado público com a marca d’água central `Cris Chaves` sobre faixa translúcida, upload direto assinado e nova inspeção/hash dos bytes baixados pelo servidor antes da aprovação.
- O painel permite selecionar várias fotos de uma vez, exige descrição individual e revisão de privacidade do lote e as envia sequencialmente com progresso, ordem e escolha da primeira foto como capa.
- Mídias confirmadas têm prévia autenticada e podem ser ocultadas de forma recuperável; o painel não realiza exclusão física.
- As operações programáticas de planejar e confirmar imagens usam uma rota de dados dedicada, preservando respostas estruturadas e mensagens de erro úteis sem renderizar HTML no meio do envio.
- O envio de fotos exibe uma prévia e exige confirmação explícita de revisão de pessoas reconhecíveis, placas, documentos e outros dados privados.
- Vídeos somente por URL allowlisted de YouTube/Vimeo e com confirmação explícita de tratamento/autorização.
- Ator da aprovação de mídia derivado no banco; o formulário não pode informar esse usuário.
- Gestão owner-only de membros por convite, alteração de papel e desativação, com proteção contra automodificação e último owner.
- Auditoria owner-only, paginada, somente leitura e redigida.
- Scan do bundle para fronteira cliente/servidor e valores secretos; a chave privilegiada fica isolada no servidor.
- [Manual operacional](admin-operations-runbook.md) redigido.
- Aparência do painel alinhada ao `design_system.html`: fundo levemente cinza no modo Claro, cards brancos, botões compartilhados com o site, navegação mais clara e diálogos acessíveis. O esquema Escuro preserva as variações próprias dos seis temas; o novo esquema Black usa superfícies pretas, texto e detalhes brancos e CTAs azuis; Sistema alterna somente entre Claro e Escuro. As referências visuais mobile foram atualizadas e inspecionadas.

## Evidência local concluída

- formatação, ESLint e TypeScript;
- 241 testes unitários e arquiteturais locais;
- build de produção;
- inspeção do bundle do navegador e scan de dados sensíveis;
- deploy simulado do Wrangler, sem publicar;
- 32 cenários E2E aprovados em desktop e mobile, com 6 duplicações de matriz puladas intencionalmente;
- banco local reconstruído novamente do zero com as 15 migrations em 7 de setembro de 2026; lint SQL sem erros e 52 testes pgTAP aprovados (48 de segurança e 4 de busca pública);
- teste de integração transacional executa o contrato antigo real da migration 14, aplica a migration 15, confirma a remoção da assinatura antiga, a assinatura nova e as permissões `authenticated`/`anon`, e termina em `ROLLBACK`;
- ensaio administrativo local ponta a ponta aprovado com identidades sintéticas: convite, criação de senha, bloqueio AAL1, enrollment TOTP, sessão AAL2, criação de rascunho, bloqueio de publicação sem mídia, convite de editor, auditoria e negações owner-only (`403`); o banco foi reconstruído depois do ensaio e nenhum dado sintético permaneceu;
- tela de login validada localmente em 320, 375, 768, 1024 e 1440 px, sem overflow horizontal;
- pacote do Worker dentro do limite de tamanho observado no plano Free.

Os avisos locais de escrita do log do Wrangler decorrem da restrição do sandbox e não invalidaram o build. O dry-run fora dessa restrição terminou com sucesso.

## Evidência no Supabase real

- projeto Free `bstrlrdcebvdqpvnepfu` criado em `sa-east-1` (São Paulo), sem cobrança adicional;
- quinze migrations aplicadas, incluindo o contrato simplificado e os gates atômicos de publicação no banco; o histórico remoto, que estava vazio apesar do esquema existente, foi reparado após 15 verificações de pré-condição e ficou alinhado em 15/15 com o repositório;
- buckets privados de originais e derivados confirmados, limitados a JPEG/WebP e 8 MB;
- signup público fechado, TOTP habilitado e AAL1 limitado a 15 minutos;
- Site URL e redirects locais allowlisted; chave publicável dedicada e segredo server-only armazenados apenas no `.dev.vars` ignorado;
- a matriz corrigida de 48 controles foi repetida no projeto real após a migration 15, chegou a `ok 48`, terminou em `ROLLBACK` e uma consulta independente confirmou zero identidades e zero imóveis sintéticos residuais;
- a assinatura antiga `publish_property(uuid, bigint)` foi removida; existe somente `publish_property(uuid, bigint, boolean)`, com `SECURITY INVOKER`, execução concedida a `authenticated` e negada a `anon`;
- a função e a política corrigidas de upload foram aplicadas no projeto real e verificadas por consulta direta (`function_exists = true` e `policy_active = true`); a confirmação final continua revalidando bytes, tipo, tamanho, dimensões e SHA-256.
- senha, enrollment e desafio TOTP e sessão AAL2 foram validados com identidade sintética sem envio de e-mail; ela foi removida e nenhum usuário de teste permaneceu.
- a identidade real autorizada do primeiro proprietário aceitou o acesso, definiu a senha e concluiu o enrollment TOTP; o e-mail administrativo permanece fora da documentação pública;
- a primeira entrada real no painel foi confirmada com papel `owner`, estado `active` e sessão AAL2, exibindo `MFA confirmado`. Depois, o placeholder autorizado `DEMO-001` foi criado e publicado para o ensaio operacional, sem dados pessoais ou endereço exato.

Detalhes sem segredos: [provisionamento do Supabase](supabase-project-stage-4.md).

## UAT final e fechamento do gate

Em 7 de setembro de 2026, o responsável confirmou por escrito a conclusão do UAT integral: entrada com MFA, criação de imóvel placeholder, envio de imagem segura, revisão, publicação, conferência de catálogo, página, mídia e marca-d’água, ausência de endereço privado, arquivamento e restauração. O resultado informado foi “tudo ok”, sem dúvida, erro ou dificuldade remanescente. Na mesma confirmação, foi autorizado o fechamento da Etapa 4 e o início da Etapa 5.

Em 7 de setembro de 2026, o responsável realizou um teste operacional sem dúvidas, criou dois novos anúncios e confirmou cadastro, catálogo, arquivamento, reserva e restauração. O ensaio revelou oportunidades de usabilidade, já corrigidas: URL amigável consistente nos dois pontos de entrada, terceira etapa real de revisão/publicação, ações principais no contexto correto e retornos coerentes após cada operação. No `DEMO-004`, a inspeção comprovou que “Sob consulta” estava correto, mas os atributos opcionais haviam sido salvos vazios; dados demonstrativos foram inseridos pela interface e catálogo e detalhe passaram a exibir dormitórios, suíte, banheiros, vagas e áreas, mantendo somente o preço numérico oculto. Uma regressão cobre agora esse contrato. A validação posterior aprovou 241 testes unitários/arquiteturais, o contrato transacional das migrations 14/15, build, dry-run do Worker e 32 cenários E2E. Esse ensaio reduz o risco, mas não é registrado como o UAT da Cris.

Em 7 de setembro de 2026, a reconstrução e os testes locais foram repetidos com sucesso. Após restaurar o login da Supabase CLI, foram validados marcadores independentes das migrations 1–14, aplicada a migration 15 pela API oficial de gerenciamento, confirmadas assinatura e permissões, reparado em transação o histórico remoto vazio e executado um `db push --dry-run` que informou o banco atualizado, sem migrations pendentes.

O primeiro imóvel real foi recebido e salvo como rascunho `CC-001`. A única mídia ativa exibia o número da fachada e foi ocultada de forma recuperável pela aplicação em sessão AAL2. A auditoria registrou o ator autenticado, e consultas independentes confirmaram zero mídias ativas, zero linhas no catálogo público e zero linhas de mídia pública para o CC-001. O anúncio permanece bloqueado até o fornecimento de fotos seguras.

Com autorização do responsável, foi criado o `DEMO-001` com informações declaradamente demonstrativas e quatro imagens geradas sem pessoas, placas, documentos ou endereço identificável. As quatro imagens passaram pelo fluxo real de tratamento e receberam a marca d’água central `Cris Chaves`. Em sessão AAL2, o anúncio percorreu `draft → published → archived → draft → published`, encerrando na versão 6. A auditoria registrou cada transição; quando arquivado, catálogo, página, mídia e sitemap deixaram de expô-lo; após a republicação, os quatro derivados WebP, o catálogo, a página e o sitemap voltaram a responder corretamente, sem endereço privado. Os ativos encontrados em `assets/templates/resider.ca` foram usados somente como referência local e não foram publicados por não haver licença de redistribuição confirmada.

## Decisões de segurança mantidas

- Nenhuma chave privilegiada é aceita na configuração pública nem enviada ao navegador.
- Reservados permanecem públicos com selo e CTA para semelhantes e podem voltar a disponíveis; vendidos são retirados da projeção e do Storage públicos e não revertem no fluxo comum.
- O Worker não processa pixels; o trabalho pesado permanece no navegador para respeitar o orçamento de CPU do Workers Free. O servidor revalida plano, identidade, papel, AAL2 e metadados exatos registrados no Storage antes de aprovar.
- O cliente decidiu não oferecer hard delete. A permissão foi removida da aplicação e os `DELETE` físicos de imóveis, detalhes, registros de mídia e objetos do Storage foram revogados para usuários autenticados.
- O único conteúdo demonstrativo no projeto real é o anúncio explicitamente rotulado `DEMO-001`, autorizado para avaliação do cliente e sem PII; nenhuma tabela de leads foi criada.
- SMTP próprio e domínio passam para a preparação da Etapa 5, antes de configurar a origem canônica HTTPS, os templates definitivos e o lançamento.

## Resultado

O Supabase real e sua integração local estão provisionados. O primeiro owner está ativo, com senha e TOTP configurados, a sessão administrativa AAL2 foi comprovada e as 15 migrations estão ativas e alinhadas no ambiente remoto. Localmente, lint, tipagem, 241 testes unitários/arquiteturais, build, limites Cloudflare em dry-run, 32 cenários E2E, 52 testes pgTAP e o teste de integração dos contratos de publicação estão verdes; remotamente, a assinatura antiga foi removida, a nova está restrita corretamente e os 48 controles passaram com rollback comprovado. O ciclo autenticado de publicação, arquivamento, restauração e republicação foi aprovado, seguido do UAT final sem assistência e sem dificuldade remanescente. **A Etapa 4 está formalmente concluída e a Etapa 5 está autorizada.** SMTP próprio, domínio, origem canônica, backup/restore, ASVS final, observabilidade, remoção dos placeholders e go-live pertencem ao novo gate de produção.
