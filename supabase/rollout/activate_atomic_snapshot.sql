-- NÃO é migration automática. Executar SOMENTE após todos os writers e sessões
-- authenticated estarem validados, teste A/B real e regressão aprovados.
-- Preserve o caminho legado durante staging; este é o último passo do cutover.
BEGIN;
LOCK TABLE public.agenda_dinamica_storage IN ACCESS EXCLUSIVE MODE;
UPDATE public.agenda_dinamica_metadata SET enforced = true, updated_at = now() WHERE id = 1;
-- O guard também bloqueia grants herdados/de coluna e service_role direto.
-- Mantém policies/SELECT existentes e não reescreve dados comerciais.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.agenda_dinamica_storage
  FROM PUBLIC, anon, authenticated, service_role;
COMMIT;
