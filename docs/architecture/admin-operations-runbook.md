# Manual operacional da área administrativa

**Estado:** projeto provisionado; primeiro owner ativo e ciclo autenticado AAL2 de publicação concluído

**Última revisão:** 9 de setembro de 2026

Este manual descreve o uso previsto da área privada. Ele não autoriza publicação nem substitui o ensaio em ambiente isolado antes do lançamento.

## Primeiro acesso

1. O responsável operacional cria o projeto Supabase Free na região aprovada e aplica todas as migrations versionadas.
2. Define `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` como configurações de baixa permissão e `SUPABASE_SECRET_KEY` somente como segredo do Worker.
3. No Supabase Auth, mantém cadastro público desativado e cadastra a origem canônica e os redirects exatos.
4. Quando houver SMTP próprio, o template **Invite user** deve preferir um link SSR com token hash:

   ```html
   <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite">Aceitar convite</a>
   ```

   Enquanto o projeto usa o template hospedado padrão, a rota de convite também aceita a sessão retornada no fragmento, remove os tokens da barra de endereço e os converte imediatamente em cookies SSR `HttpOnly`.
5. O primeiro usuário é criado pelo responsável operacional e associado uma única vez como `owner` convidado. O bootstrap fica restrito ao ambiente operacional; não se usa chave privilegiada no navegador nem se cria rota pública de bootstrap.
6. Ao aceitar o convite, a pessoa cria uma senha de pelo menos 12 caracteres, repete exatamente a mesma senha e configura TOTP em um aplicativo autenticador. O painel somente é liberado após AAL2. Uma senha longa e exclusiva continua sendo a recomendação.

Referências atuais: [templates de e-mail do Supabase](https://supabase.com/docs/guides/auth/auth-email-templates) e [URLs de redirecionamento](https://supabase.com/docs/guides/auth/redirect-urls).

## Operação diária

### Entrar

- Abrir `/admin/entrar`, informar e-mail e senha e confirmar o código TOTP.
- Nunca compartilhar conta, senha, QR code ou chave manual do autenticador.
- Ao terminar, usar **Sair**. Não operar o painel em computador público.

### Cadastrar um imóvel

- Em **Cadastrar imóvel**, seguir três passos: **Informações**, **Fotos** e **Revisar e publicar**.
- Todo novo imóvel começa como rascunho e não aparece no site.
- Completar os dados públicos e as fotos. Localização e informações internas são opcionais.
- A URL amigável é gerada automaticamente a partir do título e pode ser ajustada se necessário. O código interno do imóvel continua sendo informado pelo operador para respeitar a identificação usada pela imobiliária.
- Conflitos de versão exigem atualizar a página e reaplicar conscientemente a alteração; o sistema não sobrescreve silenciosamente.

### Fotos e vídeos

- Na aba **Fotos e vídeos**, selecionar uma ou várias imagens PNG, JPEG ou WebP e descrever objetivamente cada foto.
- O navegador valida os arquivos e os reencoda para JPEG/WebP, remove metadados e cria uma cópia pública com a marca central `Cris Chaves` sobre uma faixa translúcida.
- O lote é enviado em sequência para reduzir uso de memória. Se uma foto falhar, ela e as seguintes permanecem na fila para correção ou nova tentativa; as anteriores confirmadas não são reenviadas.
- O original vai para bucket privado; somente a cópia tratada pode ser aprovada para o catálogo.
- É possível ordenar fotos e escolher uma única capa.
- Depois do envio, revisar a prévia autenticada. Uma foto inadequada pode ser ocultada sem exclusão definitiva.
- Vídeo é somente link HTTPS allowlisted do YouTube ou Vimeo. Não existe upload ou busca automática do vídeo.
- Se o envio falhar, nenhuma cópia incompleta é publicada. Atualize a tela antes de tentar novamente.

### Publicar e alterar situação

- Publicar exige descrição, ao menos uma foto tratada e uma capa aprovada. Na confirmação final, o operador marca que possui a autorização escrita do proprietário; não há uma etapa separada nem referência obrigatória no cadastro. O banco revalida a confirmação e os requisitos editoriais em uma única operação.
- Arquivar e mover para excluídos exigem confirmação e removem o anúncio do catálogo.
- Soft delete pode ser restaurado como rascunho.
- Exclusão definitiva não é oferecida: o cliente aprovou somente o fluxo recuperável, inclusive para `owner`.
- **Reservado** permanece visível com selo e CTA para imóveis semelhantes e pode voltar a disponível. **Vendido** sai imediatamente do catálogo e não reverte pelo fluxo comum.

### Equipe e auditoria

- Somente `owner` vê **Equipe** e **Auditoria**.
- O `owner` pode convidar `editor` ou outro `owner`, mudar papel e desativar terceiros.
- Ninguém pode promover ou desativar a própria conta pelo fluxo comum nem remover o último owner.
- A auditoria é somente leitura e apresenta referências redigidas.

## Recuperação e incidentes

- Recuperação de senha usa somente o e-mail configurado no Supabase e resposta genérica, sem confirmar se uma conta existe.
- Perda do autenticador, suspeita de comprometimento, troca do último owner ou necessidade de acesso emergencial exigem atuação do responsável operacional; não criar bypass temporário.
- Se uma foto ou dado privado aparecer publicamente, arquivar o imóvel, preservar a auditoria e interromper a publicação até a investigação.

## Checklist antes do primeiro uso real

- [x] Projeto Supabase real criado em São Paulo e sem cobrança adicional habilitada.
- [x] Dezesseis migrations aplicadas no projeto real, incluindo a simplificação segura do contrato de publicação e o hardening de mídia/Storage.
- [x] Matriz ampliada de 58 controles de autorização/RLS repetida no projeto real dentro de transação com `ROLLBACK`, sem dados sintéticos residuais; os 4 controles de busca pública também passaram com rollback.
- [x] Site URL HTTPS e redirects exatos de produção, staging e desenvolvimento configurados no Auth.
- [ ] Templates definitivos de convite e recuperação com SMTP próprio devem ser ensaiados na Etapa 5; o convite real e as rotas locais já foram validados.
- [x] Primeiro owner ativo e associado como `owner`, com senha e MFA/TOTP confirmados.
- [x] Primeiro owner ativado com senha e TOTP.
- [x] CRUD, quatro fotos seguras, publicação, auditoria, arquivamento e restauração concluídos ponta a ponta com o placeholder autorizado `DEMO-001`; vídeo não foi necessário para o gate.
- [x] RLS negativa ensaiada como anônimo, sem papel, AAL1, editor e owner nos 58 controles remotos com rollback, incluindo leitura de original por chave exata em contexto de download.
- [x] Política de reservado/vendido aprovada e aplicada.
- [x] Exclusão definitiva rejeitada; somente soft delete recuperável.
- [x] UAT sem assistência concluído e registrado em 7 de setembro de 2026; MFA, cadastro, mídia, revisão, publicação, privacidade, arquivamento e restauração foram aprovados sem dificuldade remanescente.
- [x] Ausência de backup próprio registrada como risco temporário aceito na ADR-0010; a rotina continua não operacional e deve ser reavaliada nos gatilhos definidos.
