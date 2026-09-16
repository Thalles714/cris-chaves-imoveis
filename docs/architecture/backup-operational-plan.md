# Plano operacional pendente de backup e restauração

**Estado:** planejamento somente; nenhum backup executado
**Base:** [`backup-restore-runbook.md`](backup-restore-runbook.md), ADR-0006 e
ADR-0010

Este plano não constitui evidência de backup. A operação permanece bloqueada até
que o cliente aprove destino, credenciais e os parâmetros abaixo.

| Parâmetro | Decisão necessária |
| --- | --- |
| responsável | nomear operador com conta individual, menor privilégio e MFA |
| substituto | nomear uma segunda pessoa capaz de executar e restaurar |
| cadência | definir frequência e janela separadas para banco e Storage |
| retenção | definir quantidade de cópias, prazo e descarte compatível com LGPD |
| RPO/RTO | aprovar perda máxima de dados e tempo máximo de recuperação |
| banco | exportar papéis, schema e dados conforme o runbook, sem segredos em logs |
| Storage | copiar cada bucket separadamente e reconciliar caminhos, bytes e objetos |
| criptografia | aprovar ferramenta e custódia de chaves antes de gerar qualquer arquivo |
| checksum | gerar e verificar SHA-256 antes e depois da cópia off-site |
| destino off-site | aprovar destino sob controle do cliente, fora da conta/projeto de origem |
| restauração isolada | usar projeto vazio e não produtivo, sem sobrescrever produção |
| evidência do exercício | registrar versão, horários, contagens, checksums, falhas e RPO/RTO observado |

Até o primeiro restore isolado ser concluído e revisado, permanecem verdadeiras a
ausência de backup próprio e a ausência de RPO/RTO garantidos.
