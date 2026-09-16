# Consistência do reenvio de convites

**Estado:** fluxo local implementado; ainda não implantado
**Data:** 13 de setembro de 2026

Supabase Auth e PostgreSQL são sistemas distintos e não oferecem uma transação
única para excluir uma identidade, enviar outro convite e trocar o vínculo em
`admin_members`. Além disso, a chave estrangeira `admin_members.user_id` exige
remover o vínculo pendente antes de excluir a identidade antiga, e a exclusão
administrativa no Auth não é reversível. O fluxo não apresenta essas etapas como
atômicas.

O reenvio funciona como uma saga recuperável:

1. valida no servidor o identificador, a versão otimista, o estado pendente, o
   cooldown de 30 minutos e o e-mail obtido do diretório;
2. remove o vínculo e tenta excluir a identidade antiga;
3. se a exclusão falhar, recompõe o vínculo antigo antes de devolver erro;
4. cria o novo convite e só então cria o novo vínculo;
5. se o convite reportar falha, consulta o diretório para reconciliar uma
   identidade pendente que possa ter sido criada antes da resposta de erro;
6. se não for possível recompor um par válido de identidade e vínculo, devolve
   `INVITATION_RECOVERY_REQUIRED` e tenta registrar auditoria técnica redigida,
   contendo somente identificador interno e motivo allowlisted — nunca e-mail.

Uma falha nunca é apresentada como sucesso. Repetições com a versão antiga são
rejeitadas e uma recomposição bem-sucedida volta a produzir um vínculo pendente
com nova versão, mantendo o controle otimista.

Referências atuais do provedor: [convites](https://supabase.com/docs/guides/auth/users#inviting-users)
e [exclusão de usuários](https://supabase.com/docs/guides/auth/managing-user-data#deleting-users).
