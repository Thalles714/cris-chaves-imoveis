# Matriz inicial OWASP ASVS 5.0.0 — nível 2

**Estado:** escopo inicial, ainda sem evidência de implementação  
**Baseline fixa:** OWASP ASVS **v5.0.0**, nível 2

Esta matriz define aplicabilidade e evidência esperada. `Planejado` não significa atendido. Na Etapa 5, cada requisito L2 aplicável deverá ser desdobrado pelo identificador completo `v5.0.0-Vx.y.z`, com evidência reproduzível, resultado e justificativa individual para `N/A`.

Fonte canônica: [release ASVS 5.0.0](https://github.com/OWASP/ASVS/releases/tag/v5.0.0_release) e [requisitos estruturados oficiais](https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.flat.json).

## Estados

- **Planejado:** aplicável, controle e prova ainda serão implementados.
- **Condicional:** depende de uma função ainda pendente, mas passa a aplicável se ela entrar no escopo.
- **N/A proposto:** tecnologia/fluxo ausente na arquitetura; precisa confirmação na revisão final.
- **Pendente:** falta decisão funcional para fechar a aplicabilidade.

## Matriz

| ASVS | Aplicabilidade inicial | Controles deste projeto | Evidência esperada | Estado |
|---|---|---|---|---|
| `v5.0.0-V1` Encoding and Sanitization | aplicável | escaping contextual do React; texto puro por padrão; queries parametrizadas; URL de vídeo normalizada por allowlist; sem HTML arbitrário | testes XSS, SQL injection, URL/protocolo e snapshots seguros | Planejado |
| `v5.0.0-V2` Validation and Business Logic | aplicável | Zod no servidor; rejeição de campos extras; limites; transições editoriais; autorização escrita/registro quando aplicável; controle de concorrência | unitários e integração para entradas, transições, repetição e corrida | Planejado |
| `v5.0.0-V3` Web Frontend Security | aplicável | cookies seguros conforme integração; CSP; HSTS; `nosniff`; proteção de framing; links externos seguros; conteúdo como texto | teste de headers, CSP Report-Only/enforced e payloads no navegador | Planejado |
| `v5.0.0-V4` API and Web Service | aplicável a loaders/actions/resource routes | contratos de request/response, métodos e content types restritos; erros genéricos; CORS fechado | chamadas HTTP diretas e negativas a toda action/endpoint | Planejado |
| `v5.0.0-V4.3` GraphQL | GraphQL próprio ausente | não expor endpoint GraphQL do app; revisar eventual superfície do fornecedor | inventário de endpoints e configuração Supabase | N/A proposto para código próprio |
| `v5.0.0-V4.4` WebSocket | fluxo de negócio WebSocket ausente | não adicionar Realtime sem ADR | inventário de dependências/runtime | N/A proposto |
| `v5.0.0-V5` File Handling | aplicável às fotos | entrada PNG/JPEG/WebP estática, saída armazenada JPEG/WebP, assinatura real, limites, nome interno, reencode, remoção EXIF/GPS, bucket privado/original e derivado aprovado; formatos animados e SVG rejeitados | testes de MIME falso, polyglot, tamanho, animação, EXIF, path e acesso ao original | Planejado |
| `v5.0.0-V6` Authentication | aplicável ao admin | signup fechado, convite nominal, MFA TOTP/AAL2, anti-enumeração, recuperação controlada | E2E de login/enrollment/recovery e mutações negadas em `aal1` | Planejado |
| `v5.0.0-V7` Session Management | aplicável ao admin | sessão por requisição, cookies seguros, timeout/revogação, logout e reautenticação sensível | testes de expiração, rotação, logout, desativação e cache | Planejado |
| `v5.0.0-V8` Authorization | crítico e aplicável | autorização por operação/objeto/campo no servidor; DTO público; GRANT mínimo; RLS default-deny | matriz anônimo/sem papel/editor/owner/`aal1`; IDOR/BOLA/BOPLA | Planejado |
| `v5.0.0-V9` Self-contained Tokens | aplicável aos JWTs do Supabase | validar assinatura, emissor, audiência, expiração e AAL pelo fluxo oficial; não confiar em claim do cliente sem verificação | testes de token ausente, expirado, adulterado, tipo/audiência errados | Planejado |
| `v5.0.0-V10` OAuth and OIDC | Supabase Auth é fornecedor; login social não aprovado | usar apenas fluxos oficiais necessários; não adicionar provedores sociais nesta fase | configuração exportada, inventário de redirect URLs e teste do fluxo escolhido | Condicional/fornecedor |
| `v5.0.0-V11` Cryptography | aplicável sem criptografia própria | TLS e primitives da plataforma; CSPRNG Web Crypto quando necessário; backup cifrado com ferramenta aprovada posteriormente | inventário de uso criptográfico e configuração do backup | Planejado |
| `v5.0.0-V12` Secure Communication | aplicável | HTTPS obrigatório em cliente, Worker, Supabase e backup; sem fallback inseguro | teste TLS/redirect/headers e inspeção de endpoints configurados | Planejado |
| `v5.0.0-V13` Configuration | aplicável | ambientes isolados, secrets fora do Git, debug/source maps privados, dependências fixadas, mínimo de bindings, headers seguros | CI, scan de artefato, revisão Wrangler e checklist por ambiente | Planejado |
| `v5.0.0-V14` Data Protection | crítico e aplicável | minimização; endereço e dados internos privados; logs redigidos; retenção; backup separado; dados sintéticos fora de produção | testes de DTO/HTML/JSON-LD/logs/cache e inventário LGPD | Planejado; retenção de leads pendente |
| `v5.0.0-V15` Secure Coding and Architecture | aplicável | monólito modular, fronteiras server-only, tratamento consistente de erros, tipagem estrita, controle de concorrência | lint/typecheck, testes arquiteturais, revisão de dependências e threat model | Planejado |
| `v5.0.0-V16` Security Logging and Error Handling | aplicável | inventário de eventos, auditoria append-only, correlation ID, log injection/PII tratados e erros genéricos | testes de eventos/redação, acesso a logs e falhas inesperadas | Planejado |
| `v5.0.0-V17` WebRTC | WebRTC ausente | não adicionar captura/chamada/streaming; vídeo é somente link allowlisted | inventário de código e dependências | N/A proposto |

## Requisitos destacados para o primeiro desdobramento

Estes IDs oficiais são especialmente ligados às fronteiras já decididas; a lista não substitui todos os requisitos L2 aplicáveis.

| ID | Aplicação no projeto | Prova prevista |
|---|---|---|
| `v5.0.0-V1.2.4` | consultas SQL parametrizadas | teste de injeção e revisão da DAL |
| `v5.0.0-V1.3.6` | URL de vídeo e qualquer chamada externa restritas por allowlist | casos de protocolo, host, porta, redirect e IP privado |
| `v5.0.0-V2.2.1` | validar toda entrada em runtime | testes de schemas e rejeição de campos extras |
| `v5.0.0-V2.2.2` | validação de segurança no servidor | requisição direta contornando a UI deve falhar |
| `v5.0.0-V2.4.1` | proteger formulário, login, busca e mutações contra abuso/cota | testes 429 e observação de falsos positivos |
| `v5.0.0-V3.3.2` | `SameSite` conforme propósito do cookie | inspeção de `Set-Cookie` |
| `v5.0.0-V3.3.4` | token de sessão inacessível a script quando a integração permitir | inspeção de `HttpOnly` e ausência no JS |
| `v5.0.0-V3.4.3` | CSP com `object-src 'none'`, `base-uri 'none'` e fontes/scripts restritos | relatório CSP e teste de headers |
| `v5.0.0-V8.2.3` | acesso de campo impede endereço/nota/PII no DTO público | snapshots de todas as superfícies públicas |
| `v5.0.0-V12.2.1` | TLS em todo serviço HTTP externo | teste de endpoints e ausência de fallback |
| `v5.0.0-V12.3.1` | TLS em conexões internas/externas, inclusive Supabase | inspeção de configuração |
| `v5.0.0-V13.2.4` | allowlist de recursos externos | teste da política de vídeo e CSP/connect-src |
| `v5.0.0-V13.4.2` | debug desativado em produção | scan do artefato/configuração |
| `v5.0.0-V16.3.3` | logar tentativas de contornar controles | teste de negação sem PII/segredo |
| `v5.0.0-V16.3.4` | logar erros inesperados e falhas de controle | teste de falha externa controlada |
| `v5.0.0-V16.4.1` | codificar dados antes de logar | payload de log injection não altera estrutura |

## Gates da matriz

1. Nenhum item é marcado “atendido” sem link para teste, configuração, revisão ou evidência reproduzível.
2. `N/A` precisa de justificativa por requisito, não somente por capítulo.
3. Falha alta/crítica ou controle L2 essencial sem evidência bloqueia lançamento.
4. Automação não é apresentada como pentest profissional.
5. A matriz final deve cobrir o arquivo oficial completo da versão 5.0.0, preservando IDs versionados.
