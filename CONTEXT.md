# Catálogo imobiliário

Este contexto define a linguagem usada para preparar, publicar e acompanhar os imóveis administrados por Cris Chaves.

## Imóveis e publicação

**Imóvel**:
Bem imobiliário cadastrado no catálogo, ainda que não esteja visível ao público.
_Evitar_: anúncio, produto

**Publicação**:
Representação pública aprovada de um imóvel, com uma lista explícita de informações que podem ser divulgadas.
_Evitar_: imóvel publicado, página

**Situação de publicação**:
Estado editorial de uma publicação: rascunho, publicada ou arquivada. Não informa se o imóvel ainda está disponível comercialmente.
_Evitar_: status, situação do imóvel

**Situação comercial**:
Estado da negociação de um imóvel: disponível, reservado ou vendido. Não determina, por si só, a visibilidade pública.
_Evitar_: status, situação de publicação

**Código público**:
Identificador curto e estável usado em consultas e contatos públicos sem revelar o identificador interno do imóvel.
_Evitar_: ID, UUID

## Localização e conteúdo

**Localização pública**:
Cidade e bairro que podem aparecer na publicação sem identificar o endereço preciso do imóvel.
_Evitar_: endereço

**Localização privada**:
Endereço e coordenadas precisos, mantidos fora de qualquer resposta ou material público.
_Evitar_: localização pública

**Mídia aprovada**:
Foto ou referência de vídeo que passou pelas verificações de formato, tratamento, autorização e vínculo com o imóvel.
_Evitar_: upload, arquivo

## Administração

**Membro administrativo**:
Pessoa convidada e ativa que pode operar a área administrativa como proprietário ou editor.
_Evitar_: usuário, conta

**Proprietário administrativo**:
Membro administrativo responsável por gestão de membros e operações reservadas de maior impacto.
_Evitar_: dono do imóvel, cliente

**Editor**:
Membro administrativo autorizado a operar conteúdo e publicação, sem gerir membros ou executar exclusão definitiva.
_Evitar_: administrador

**Evento de auditoria**:
Registro imutável e minimizado de uma operação administrativa relevante, sem segredos ou dados pessoais integrais.
_Evitar_: log
