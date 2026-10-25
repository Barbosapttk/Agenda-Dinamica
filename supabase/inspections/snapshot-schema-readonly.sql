-- Inspeção somente de metadados. Não é migration e não lê registros comerciais.
-- Executar com acesso administrativo SOMENTE DE LEITURA e fornecer o resultado.
-- Nenhum CREATE/ALTER/DROP/INSERT/UPDATE/DELETE ou alteração de policy.
BEGIN TRANSACTION READ ONLY;

SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relkind, pg_catalog.pg_get_userbyid(c.relowner) AS owner,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced, c.relacl AS grants
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'agenda_dinamica_storage';

SELECT a.attname AS column_name,
       pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
       a.attnotnull AS not_null,
       pg_catalog.pg_get_expr(d.adbin, d.adrelid) AS default_expression
FROM pg_catalog.pg_attribute AS a
JOIN pg_catalog.pg_class AS c ON c.oid = a.attrelid
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
LEFT JOIN pg_catalog.pg_attrdef AS d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
WHERE n.nspname = 'public' AND c.relname = 'agenda_dinamica_storage'
  AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY a.attnum;

SELECT con.conname, con.contype,
       pg_catalog.pg_get_constraintdef(con.oid, true) AS definition
FROM pg_catalog.pg_constraint AS con
JOIN pg_catalog.pg_class AS c ON c.oid = con.conrelid
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'agenda_dinamica_storage';

SELECT schemaname, tablename, indexname, indexdef
FROM pg_catalog.pg_indexes
WHERE schemaname = 'public' AND tablename = 'agenda_dinamica_storage';

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_catalog.pg_policies
WHERE (schemaname = 'public' AND tablename = 'agenda_dinamica_storage')
   OR (schemaname = 'storage' AND tablename = 'objects');

SELECT t.tgname, t.tgenabled,
       pg_catalog.pg_get_triggerdef(t.oid, true) AS definition,
       pn.nspname AS function_schema, p.proname AS function_name,
       p.prosecdef AS security_definer, p.proconfig AS function_settings,
       pg_catalog.pg_get_functiondef(p.oid) AS function_definition
FROM pg_catalog.pg_trigger AS t
JOIN pg_catalog.pg_class AS c ON c.oid = t.tgrelid
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_proc AS p ON p.oid = t.tgfoid
JOIN pg_catalog.pg_namespace AS pn ON pn.oid = p.pronamespace
WHERE n.nspname = 'public' AND c.relname = 'agenda_dinamica_storage'
  AND NOT t.tgisinternal;

SELECT n.nspname AS schema_name, p.proname AS function_name,
       pg_catalog.pg_get_function_identity_arguments(p.oid) AS arguments,
       pg_catalog.pg_get_function_result(p.oid) AS result_type,
       p.prosecdef AS security_definer, p.proconfig AS function_settings,
       p.proacl AS grants
FROM pg_catalog.pg_proc AS p
JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind = 'f'
ORDER BY p.proname;

SELECT r.rolname, r.rolcanlogin, r.rolsuper, r.rolbypassrls
FROM pg_catalog.pg_roles AS r
WHERE r.rolname IN ('anon', 'authenticated', 'service_role');

SELECT pubname, schemaname, tablename
FROM pg_catalog.pg_publication_tables
WHERE schemaname = 'public' AND tablename = 'agenda_dinamica_storage';

COMMIT;
