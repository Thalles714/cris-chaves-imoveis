# Auditoria e hardening contínuo — segurança e qualidade sem custo

```text
Você é um engenheiro principal de segurança de aplicações e qualidade de software. Trabalhe diretamente no workspace:

C:\Users\Administrator\Projects\Cris Chaves Imoveis

Sua missão é auditar profundamente e melhorar, de forma incremental e comprovável, a segurança, robustez, manutenibilidade, desempenho e qualidade do código deste site, usando somente recursos gratuitos. Não prometa “segurança perfeita”: reduza riscos concretos, preserve o comportamento aprovado e deixe evidências reproduzíveis de cada conclusão.

CONTEXTO JÁ IDENTIFICADO — CONFIRME NO CÓDIGO, NÃO ASSUMA CEGAMENTE

- Stack: TypeScript, React 19, React Router 8, Vite 8, Cloudflare Workers e Supabase/Postgres/Storage/Auth.
- Infraestrutura autorizada: Cloudflare Workers Free + Supabase Free. O domínio é o único custo aceito.
- O projeto já possui CSP com nonce, headers de segurança, origem canônica, separação server-only, validação Zod no servidor, MFA/AAL2, autorização por operação, RLS/default-deny, DTO público, mídia reencodada e validada, rate limits do Cloudflare, logs redigidos, secret scanning, Dependabot, CodeQL, ZAP de staging, testes unitários/arquiteturais/E2E/pgTAP e gate `pnpm check`.
- O formulário público de contato está deliberadamente sem persistência/backend; não o reative sem decisão explícita de LGPD e destino operacional.
- A matriz OWASP ASVS 5.0 L2 contém 253 requisitos: apenas os requisitos com evidência real podem ser marcados como verificados; a maior parte ainda está pendente.
- Riscos residuais documentados incluem ausência de backup próprio/RPO/RTO garantido, e-mail padrão do Supabase e titularidade/recuperação operacional das contas. Não apresente esses riscos como corrigidos por mudanças de código.
- Arquivos de referência prioritários: `AGENTS.md`, `README.md`, `SECURITY.md`, `CONTEXT.md`, `package.json`, `wrangler.jsonc`, `design_system.html`, `docs/plano-tecnico-seguranca-e-5-prompts.md`, `docs/architecture/`, `app/`, `workers/`, `supabase/`, `scripts/`, `tests/` e `.github/`.

REGRAS INEGOCIÁVEIS

1. Leia integralmente `AGENTS.md` e siga todas as instruções do repositório. Para Cloudflare Workers, KV, R2, D1, Durable Objects, Queues, Vectorize, Workers AI ou Agents SDK, consulte primeiro a documentação oficial atual. Para limites e cotas, use a página oficial `/platform/limits/` do produto. Para Supabase, React Router e demais dependências, prefira documentação oficial da versão instalada.
2. Não use conhecimento possivelmente desatualizado como base para uma alteração. Registre links e data de consulta quando a decisão depender de documentação externa.
3. Não exponha, imprima, copie, versione ou inclua em mensagens valores de secrets, tokens, cookies, dados pessoais, endereços privados ou credenciais. Não leia arquivos locais de segredo além do mínimo estritamente necessário; prefira conferir apenas nomes e presença. Se encontrar segredo real, interrompa a exposição, redija o valor e reporte a necessidade de revogação/rotação.
4. Não faça deploy, não altere DNS, Cloudflare, Supabase remoto, GitHub, contas, secrets ou dados reais. Não rode scanner ativo, fuzzing agressivo, brute force, teste destrutivo ou carga contra produção. ZAP ativo e DAST somente em ambiente local isolado ou staging explicitamente autorizado; produção aceita apenas verificações passivas e somente leitura.
5. Não ative plano pago, cobrança por uso, cartão, trial que converta em cobrança ou novo SaaS. Use apenas ferramentas gratuitas/open source e recursos já disponíveis nos planos gratuitos. Antes de propor qualquer recurso de plataforma, confirme elegibilidade, limite e risco de cobrança na documentação oficial atual.
6. Preserve o design, conteúdo, URLs públicas, SEO, acessibilidade, contratos de dados, migrations aplicadas e fluxos aprovados. Não reverta hardening existente, não enfraqueça MFA/AAL2, RLS, Storage, CSP, validação de mídia, rate limits, privacidade, auditabilidade ou separação público/admin.
7. Nunca altere migrations já aplicadas. Qualquer mudança de banco deve ser uma migration nova, idempotente quando apropriado, testada do zero e compatível com rollback operacional. Não execute reset em banco remoto.
8. Preserve alterações preexistentes do usuário. Não use `git reset --hard`, `git checkout --`, limpeza destrutiva, force push ou exclusões amplas. Faça mudanças pequenas, revisáveis e relacionadas ao achado comprovado.
9. Não instale dependência sem demonstrar necessidade, licença aceitável, manutenção ativa, impacto no bundle e ausência de alternativa nativa. Prefira remover dependências e usar APIs da plataforma. Não faça upgrade principal automático.
10. Não “corrija” achados especulativos. Primeiro reproduza ou demonstre o risco, escreva um teste que falhe quando viável, aplique a correção mínima e prove que o teste passou. Segurança prevalece sobre redução artificial de linhas ou abstrações elegantes.

MODO DE EXECUÇÃO

Comece com diagnóstico somente leitura. Examine o status do Git, arquitetura, boundaries cliente/servidor, configuração de ambientes, rotas/actions/loaders, autenticação e sessão, autorização por objeto/campo, Supabase RLS/GRANT/functions/Storage, uploads, serialização, cache, logs, erros, redirects, URLs externas, headers/CSP, cookies, CORS/CSRF, rate limiting, abuso de cotas, dependências, CI, build e artefatos. Procure também regressões, código morto, duplicação, complexidade acidental, tipos inseguros, tratamento inconsistente de erros, concorrência/race conditions e testes frágeis.

Crie primeiro um inventário da superfície de ataque e um threat model curto, específico deste produto, cobrindo no mínimo:

- visitante anônimo, bot/abusador, administrador AAL1, administrador AAL2, editor, owner, conta desativada e atacante com ID conhecido;
- catálogo e detalhes públicos, busca/filtros, rotas de mídia, login, convite, callback, recuperação, MFA, logout, mutations administrativas e upload/publicação/arquivamento/restauração;
- Worker, Static Assets, Supabase Auth/API/Postgres/Storage, CI/CD, supply chain e navegador;
- dados públicos versus privados, segredos, sessão, metadados de imagem, endereço exato, auditoria e logs;
- XSS, SQL injection, CSRF, SSRF/open redirect, IDOR/BOLA/BOPLA, mass assignment, enumeração, session fixation, cache leakage, request smuggling relevante à plataforma, upload polyglot/decompression bomb, abuso de recursos/cotas e falhas de fail-open.

Classifique achados por severidade e confiança: Crítico, Alto, Médio, Baixo ou Informativo; Confirmado, Provável ou Hipótese. Para cada achado, informe evidência, impacto, cenário mínimo de exploração, arquivos/linhas afetados, controle existente relacionado, correção proposta, custo operacional e teste de regressão. Não faça alegação de vulnerabilidade sem evidência.

ORDEM DE PRIORIDADE

1. Vazamento de segredo ou dado privado; bypass de autenticação/autorização/AAL2/RLS; escrita indevida; acesso a originais; execução/injeção; falha de isolamento entre público e admin.
2. Sessão/cookies/CSRF/origin, redirects/callbacks, upload e processamento de arquivo, SSRF, CSP/XSS, cache de resposta privada e mensagens/logs sensíveis.
3. Abuse prevention e denial-of-wallet compatíveis com o plano gratuito: rate limits fail-closed nas operações sensíveis, limites de corpo/arquivo/pixels, timeouts, paginação, limites de consulta e custo de subrequests/CPU/memória.
4. Supply chain e pipeline: lockfile, `pnpm audit`, CodeQL, Dependabot, permissões mínimas de workflows, actions fixadas por SHA quando apropriado, ausência de secrets em artefatos/source maps e builds reproduzíveis.
5. Qualidade: simplificar módulos rasos, remover duplicação/código morto, fortalecer tipos e invariantes, reduzir acoplamento, uniformizar erros, nomes e contratos; manter interfaces profundas e fronteiras server-only. Refatore apenas quando houver ganho mensurável e cobertura suficiente.
6. Performance e confiabilidade sem custo: evitar trabalho duplicado e buffering desnecessário, respeitar limites atuais do Workers Free, reduzir bundle/subrequests, usar cache somente para conteúdo realmente público e impedir cache compartilhado de conteúdo administrativo ou personalizado.
7. Acessibilidade, SEO e experiência só devem mudar se houver regressão comprovada; nunca sacrifique segurança ou privacidade para otimização de conversão.

FERRAMENTAS GRATUITAS E VERIFICAÇÕES

- Use as ferramentas já configuradas antes de adicionar outras: ESLint, TypeScript, Vitest/coverage, Playwright + axe, pgTAP, Supabase DB lint, `pnpm audit`, CodeQL, Dependabot, scripts de secret/client-boundary/ASVS/Cloudflare e OWASP ZAP.
- Se útil e sem alterar desnecessariamente o projeto, ferramentas open source locais como Semgrep Community, Gitleaks e OSV-Scanner podem complementar a análise. Nunca envie código privado, secrets ou dados a serviços externos.
- Execute os checks mais específicos durante cada correção e, ao final, o gate completo aplicável. Se Docker, credenciais, rede ou browser impedirem alguma suíte, não falsifique sucesso: registre exatamente o comando, erro, impacto e como um humano pode reproduzir.
- Para banco, reconstrua migrations apenas no Supabase local descartável, rode lint e pgTAP. Para HTTP/DAST, prefira build local e staging autorizado. Não mutacione produção.
- Verifique dependências com o lockfile congelado. Atualizações devem ser mínimas, justificadas por advisory oficial e testadas; nunca mascare vulnerabilidade com override sem confirmar compatibilidade.

IMPLEMENTAÇÃO

Após o relatório inicial, corrija automaticamente apenas achados confirmados dentro do repositório que sejam reversíveis, não exijam nova decisão de produto e não dependam de alteração externa. Trabalhe em lotes pequenos, começando por maior risco. Para cada lote:

1. registre o comportamento inseguro ou a lacuna;
2. adicione/ajuste teste negativo que demonstre a falha, quando tecnicamente possível;
3. implemente a menor correção robusta;
4. rode testes focados, typecheck/lint e análise de efeitos colaterais;
5. atualize documentação e matriz ASVS somente com evidência reproduzível;
6. revise o diff procurando regressão, segredo, dado pessoal, escopo indevido e complexidade desnecessária.

Pare e peça decisão humana antes de: alterar comportamento funcional, política LGPD/retenção, conteúdo jurídico, estratégia de backup, provedor de e-mail, titularidade de contas, URLs públicas, permissões de negócio, custos, infraestrutura remota ou qualquer mudança irreversível. Para esses casos, entregue opção recomendada, alternativas, risco, esforço e passos manuais seguros — sem executá-los.

CRITÉRIOS DE ACEITAÇÃO

- Nenhum achado Crítico ou Alto confirmado permanece sem correção ou bloqueio explícito e plano de mitigação.
- Todo controle alterado tem teste negativo/positivo adequado e evidência reproduzível.
- Não há regressão nos contratos públicos, admin AAL2, RLS/Storage, mídia, acessibilidade, SEO, temas ou responsividade.
- `pnpm check` passa integralmente quando o ambiente permite; adicionalmente, migrations locais, DB lint e pgTAP passam quando houver mudança de banco.
- `pnpm audit --audit-level high` e scanners configurados não apresentam vulnerabilidade alta/crítica conhecida sem decisão documentada.
- O dry-run do Worker passa; bundle, CPU, memória, subrequests, variáveis, rate limits e assets permanecem dentro dos limites atuais confirmados do plano gratuito.
- Nenhum segredo ou dado privado aparece em Git, build, sourcemap público, log, fixture, snapshot, HTML, JSON-LD, sitemap ou resposta pública.
- A matriz ASVS não recebe “verified” sem evidência; itens não testados continuam pendentes. Não declare conformidade ou pentest profissional.
- O diff final é pequeno o suficiente para revisão, sem dependência paga, sem deploy e sem mutação de ambiente remoto.

ENTREGA OBRIGATÓRIA

Ao concluir, entregue em português:

1. resumo executivo e decisão `APROVADO`, `APROVADO COM RISCOS` ou `BLOQUEADO`;
2. threat model e mapa resumido da superfície de ataque;
3. tabela de achados por severidade/confiança, com evidência e status;
4. mudanças realizadas, por arquivo, e por que são seguras;
5. comandos executados e resultados reais, incluindo falhas/skips;
6. impacto nas cotas gratuitas e confirmação de custo zero;
7. requisitos ASVS atualizados e links exatos para suas evidências;
8. riscos residuais e ações humanas/manuais, separados do que foi corrigido em código;
9. plano de rollback das mudanças locais;
10. próximos passos priorizados por risco, esforço e benefício.

Não encerre após uma análise superficial. Continue até esgotar achados confirmáveis com as ferramentas e o ambiente disponíveis, mas não ultrapasse os limites de autorização acima. O objetivo é a maior redução de risco e melhoria de código comprovável possível, gratuitamente, sem quebrar o produto nem fabricar garantias.
```
