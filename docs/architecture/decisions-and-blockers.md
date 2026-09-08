# Checklist de decisões e bloqueios

**Estado:** aberto  
**Regra:** campos pendentes não recebem valor fictício nem são publicados

## Bloqueios de publicação solicitados

| Tema | Evidência atual | Decisão necessária | Responsável pela resposta | Estado |
|---|---|---|---|---|
| Nome público | aparecem “Cris Chaves Imóveis” e “Cris Chaves Corretor de Imóveis” | assinatura pública exata e aplicação permitida | cliente + validação profissional quando aplicável | [ ] Pendente |
| CRECI | cliente confirmou o número `89448` em 3 de setembro de 2026, resolvendo a divergência documental | usar `CRECI 89448` nos pontos públicos previstos | cliente | [x] Confirmado |
| WhatsApp | cliente confirmou `+55 51 99999-6129` em 3 de setembro de 2026 | usar este número como contato público | cliente | [x] Confirmado |
| Leads | não está decidido se o formulário armazena ou apenas encaminha | fluxo, dados mínimos, finalidade/base legal, acesso, retenção e exclusão | cliente + validação LGPD | [ ] Pendente |
| Escopo comercial | venda/aluguel, tipos prioritários, preço e serviços ainda divergem/estão abertos | operações e filtros de lançamento; campos obrigatórios; regra de “sob consulta” | cliente/produto | [ ] Pendente |
| Reservado e vendido | cliente confirmou a recomendação em 3 de setembro de 2026 | reservado permanece no catálogo com selo e CTA para imóveis semelhantes; pode voltar a disponível. Vendido sai imediatamente do catálogo e não reverte no fluxo comum | cliente | [x] Confirmado |
| Exclusão definitiva | cliente confirmou em 3 de setembro de 2026 a recomendação de manter apenas exclusão recuperável | hard delete não será oferecido no painel; privilégios `DELETE` de imóveis, detalhes, registros de mídia e objetos do Storage foram revogados | cliente | [x] Confirmado: somente soft delete |
| Logotipo e ativos web | pacote recém-criado em [`public/brand`](../../public/brand/README.md) e aprovado pelo cliente em 3 de setembro de 2026 | usar as versões web aprovadas conforme o guia do pacote | cliente/design | [x] Confirmado |
| Domínio e origem canônica | cliente informou que o domínio será comprado quando recomendado | selecionar e comprar o domínio durante a preparação de produção, antes de configurar a origem canônica e publicar | cliente + responsável técnico | [ ] Pendente para produção; não bloqueia a Etapa 4 |
| RPO/RTO | a pesquisa contém proposta antiga, não compromisso aceito; plano Free exige backup manual | perda máxima aceitável, tempo de recuperação, frequência, retenção e local off-site | cliente + responsável operacional | [ ] Pendente |
| Responsável operacional | não há pessoa/canal definido | responsável por alertas, atualizações, backup/restore, incidentes, contas e revisão de cotas | cliente/fornecedor | [ ] Pendente |

## Decisões relacionadas que continuam abertas

- [ ] Titularidade do domínio, Cloudflare, Supabase, GitHub e meios de recuperação em nome do cliente.
- [ ] Provedor/canal de notificação do formulário, sem incluir PII desnecessária.
- [ ] Cookies, analytics, pixels e consentimento. Até decisão: não instalar.
- [ ] Política de retenção de originais de fotos e limite de quantidade/tamanho por imóvel dentro do orçamento gratuito.
- [ ] Exibição de vídeo incorporado e sua implicação de cookies/transferência de dados. Até decisão: não carregar player automaticamente.
- [ ] Validação da publicidade, autorização escrita e registros de loteamento/condomínio/incorporação aplicáveis.
- [ ] Textos finais de privacidade, termos, Sobre, serviços e áreas atendidas.

## Decisões arquiteturais já registradas

- [x] React Router v8 em modo framework no Cloudflare Workers Free.
- [x] Supabase Free para PostgreSQL, Auth e Storage; `sa-east-1` se disponível no provisionamento.
- [x] Um monólito modular com fronteiras público/admin/server-only.
- [x] DTO público allowlisted sem endereço exato, dados internos ou originais privados.
- [x] GRANT mínimo e RLS default-deny como barreira final.
- [x] Catálogo público dinâmico sem cache compartilhado manual nesta fase.
- [x] Admin e autenticação com `private, no-store`, sem indexação.
- [x] Backup manual do banco e cópia separada da mídia no plano Free.
- [x] Vídeo sem upload/processamento: apenas URL de YouTube/Vimeo allowlisted, previamente tratada e autorizada.
- [x] `design_system.html` como contrato visual; Resider como referência externa principal sem copiar ativos.
- [x] Custo recorrente autorizado: somente domínio.
- [x] Revisão humana da Etapa 3 aprovada e início da Etapa 4 autorizado pelo cliente em 3 de setembro de 2026.
- [x] UAT final da Etapa 4 aprovado sem dificuldade remanescente e início da Etapa 5 autorizado em 7 de setembro de 2026.
- [x] Repositório GitHub público e gratuito autorizado pelo responsável em 7 de setembro de 2026, sob a conta `Thalles714`, para habilitar os controles gratuitos sem expor credenciais ou dados privados.

## Critério de bloqueio

O lançamento é **no-go** enquanto nome público, domínio/origem canônica, restore testado, RPO/RTO, titularidade das contas, responsável operacional e conteúdo obrigatório não estiverem registrados como aprovados. CRECI, WhatsApp e pacote de logotipo web já estão confirmados e não bloqueiam a Etapa 4. A ausência de decisão sobre leads significa que nenhuma tabela/retenção de leads deve ser criada por conveniência.

Quando uma resposta chegar, registrar data, autor, evidência e impacto; se alterar arquitetura, segurança, custo ou tratamento de dados, criar/superseder ADR antes de implementar.
