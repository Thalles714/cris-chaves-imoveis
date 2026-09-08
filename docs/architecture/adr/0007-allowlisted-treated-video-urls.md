# ADR-0007 — Vídeo somente por URL allowlisted e já tratada

- **Status:** aceita
- **Data:** 3 de setembro de 2026
- **Escopo:** mídia de vídeo no lançamento

## Contexto

Upload, armazenamento, transcodificação e marca d'água automática de vídeo não cabem no orçamento gratuito nem no limite de CPU do Workers Free. URLs arbitrárias introduzem XSS, URL confusion, conteúdo não autorizado e SSRF se o servidor tentar buscá-las.

## Decisão

Não receber, armazenar, baixar, inspecionar nem transformar arquivo de vídeo. O imóvel pode registrar somente referência de **YouTube ou Vimeo**, em HTTPS, previamente tratada com a marca d'água e autorizada pelo responsável do anúncio.

A entrada é analisada por parser de URL e allowlist exata de hosts/formas aceitas. O sistema armazena `provider` e `video_id` normalizados, não HTML/iframe fornecido pelo usuário. A URL de embed/link é gerada pelo aplicativo a partir desses dois campos.

Rejeitar:

- outro protocolo, host, subdomínio, porta ou credenciais na URL;
- encurtador ou redirect como forma de validação;
- HTML de embed, `javascript:`, `data:` e parâmetros desconhecidos que mudem o recurso;
- ID fora do formato do provedor.

O servidor não faz `fetch` da URL fornecida; assim, validação não vira SSRF. Adicionar provedor, upload ou processamento exige novo ADR e aprovação de custo.

## Privacidade pendente

Carregar player de terceiro pode transferir dados e criar cookies. Até a decisão LGPD/cookies, o site não deve carregar automaticamente um iframe externo; pode apresentar placeholder/ação explícita ou link conforme o fluxo que vier a ser aprovado. A URL nunca implica endosso ou autorização de publicação por si só.

## Consequências

- A integridade e disponibilidade do vídeo dependem do provedor e do proprietário da conta.
- Não há garantia técnica de marca d'água; a publicação exige confirmação operacional de que o vídeo já está tratado.
- CSP `frame-src` permanece restrita aos hosts de embed efetivamente aprovados.
- Thumbnails externas não são importadas automaticamente.

## Validação

- tabela de casos válidos e inválidos para cada provedor;
- teste de host parecido, Unicode/punycode, porta, userinfo, fragmento e URL codificada;
- teste prova ausência de request de rede durante validação;
- output de iframe/link é gerado, escapado e contém somente o ID validado;
- publicação sem confirmação de tratamento/autorização falha.

## Referências

- [OWASP ASVS 5.0.0 — `v5.0.0-V1.3.6`](https://github.com/OWASP/ASVS/blob/v5.0.0_release/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.flat.json)
- [Checklist de bloqueios](../decisions-and-blockers.md)
