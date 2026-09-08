# ADR-0010 — Backup operacional adiado no lançamento inicial

- **Status:** aceita; substitui apenas o bloqueio de lançamento da ADR-0006
- **Data:** 8 de setembro de 2026
- **Escopo:** continuidade durante a fase inicial de produção

## Contexto

O cliente terá poucos imóveis no lançamento e decidiu cadastrá-los manualmente, um a um, depois do go-live. As informações e mídias de origem permanecerão sob guarda do cliente. Migrations e código continuam versionados, mas isso não constitui backup dos dados, usuários, auditoria ou objetos do Storage.

A rotina completa definida na ADR-0006 ainda é a solução desejada no longo prazo, porém seu custo operacional não foi aceito para o lançamento inicial.

## Decisão

Adiar a implementação e a operação do backup próprio de banco e mídia. A ausência desse backup deixa de ser um bloqueio de go-live somente durante a fase inicial de baixo volume.

O cliente aceita explicitamente que, diante de perda total ou corrupção do projeto Supabase, os anúncios poderão precisar ser recadastrados manualmente a partir das fontes sob sua guarda. Não há RPO ou RTO garantido nesta fase. O sistema não deve afirmar que oferece backup ou recuperação próprios.

A decisão não autoriza armazenar exportações sem criptografia, copiar credenciais, reduzir controles de acesso ou tratar as mídias de origem do cliente como um backup verificável da aplicação.

## Controles compensatórios

- schema, migrations, policies e testes permanecem versionados e protegidos no GitHub;
- nenhuma listagem real será importada em lote antes do go-live;
- placeholders serão arquivados antes da abertura pública;
- segredos continuam fora do repositório;
- qualquer futura mudança para volume ou criticidade maiores reabre a decisão de backup;
- a ADR-0006 permanece como desenho da rotina futura e não deve ser marcada como executada.

## Risco residual aceito

Podem ser perdidos anúncios, mídias tratadas, contas administrativas, fatores de autenticação e registros de auditoria criados após o go-live. A recomposição será manual e poderá ficar indisponível por prazo indeterminado.

## Gatilhos de revisão

Reavaliar antes do primeiro dos seguintes eventos:

1. crescimento que torne o recadastro manual impraticável;
2. entrada de outro operador administrativo;
3. contratação de plano com recursos adequados de recuperação;
4. exigência contratual, regulatória ou de continuidade;
5. incidente com perda ou corrupção de dados.
