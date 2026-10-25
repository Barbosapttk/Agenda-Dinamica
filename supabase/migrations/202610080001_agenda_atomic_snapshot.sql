-- Fase 3B: infraestrutura aditiva. NÃO fecha o writer legado nesta migration.
-- Revisar/executar primeiro em staging. Nunca reescreve snapshots existentes.
BEGIN;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'agenda_snapshot_owner') THEN
    CREATE ROLE agenda_snapshot_owner NOLOGIN NOINHERIT NOBYPASSRLS;
  ELSE
    RAISE EXCEPTION 'agenda_snapshot_owner já existe; verificar privilégios antes da migration';
  END IF;
END $$;
CREATE SCHEMA agenda_dinamica_internal AUTHORIZATION agenda_snapshot_owner;
REVOKE ALL ON SCHEMA agenda_dinamica_internal FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public, auth TO agenda_snapshot_owner;
GRANT EXECUTE ON FUNCTION auth.uid(), auth.jwt() TO agenda_snapshot_owner;

CREATE TABLE public.agenda_dinamica_metadata (
  id smallint PRIMARY KEY CHECK (id = 1),
  revision bigint NOT NULL CHECK (revision >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  enforced boolean NOT NULL DEFAULT false,
  rpc_transaction bigint
);
INSERT INTO public.agenda_dinamica_metadata(id, revision) VALUES (1, 0);
CREATE TABLE public.agenda_dinamica_command_receipts (
  command_id text PRIMARY KEY CHECK (length(command_id) BETWEEN 1 AND 200),
  actor_id uuid NOT NULL,
  session_id text,
  instance_id text,
  correlation_id text,
  causation_id text,
  event_id text,
  status text NOT NULL CHECK (status = 'SUCCESS'),
  revision bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  request jsonb NOT NULL,
  result jsonb NOT NULL
);
ALTER TABLE public.agenda_dinamica_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_dinamica_command_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agenda_dinamica_metadata, public.agenda_dinamica_command_receipts
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, UPDATE ON public.agenda_dinamica_metadata TO agenda_snapshot_owner;
GRANT SELECT, INSERT ON public.agenda_dinamica_command_receipts TO agenda_snapshot_owner;
GRANT SELECT, INSERT, UPDATE ON public.agenda_dinamica_storage TO agenda_snapshot_owner;
CREATE POLICY agenda_metadata_owner ON public.agenda_dinamica_metadata
  TO agenda_snapshot_owner USING (true) WITH CHECK (true);
CREATE POLICY agenda_receipts_owner ON public.agenda_dinamica_command_receipts
  TO agenda_snapshot_owner USING (true) WITH CHECK (true);
CREATE POLICY agenda_snapshot_rpc_owner ON public.agenda_dinamica_storage
  TO agenda_snapshot_owner USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- O guard faz lock ANTES dos locks de rows, inclusive em upsert legado.
-- Token da transação fica em metadata inacessível ao cliente, não em GUC forjável.
CREATE FUNCTION agenda_dinamica_internal.guard_snapshot_write() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE m public.agenda_dinamica_metadata%ROWTYPE;
BEGIN
  IF auth.jwt()->>'role' IN ('anon','authenticated') AND auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão authenticated obrigatória' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO STRICT m FROM public.agenda_dinamica_metadata WHERE id = 1 FOR UPDATE;
  IF m.rpc_transaction IS NOT DISTINCT FROM pg_catalog.txid_current() THEN
    RETURN NULL;
  END IF;
  IF m.enforced THEN
    RAISE EXCEPTION 'Gravação direta desabilitada; use agenda_snapshot_commit' USING ERRCODE = '42501';
  END IF;
  UPDATE public.agenda_dinamica_metadata SET revision = revision + 1, updated_at = now() WHERE id = 1;
  RETURN NULL;
END $$;
ALTER FUNCTION agenda_dinamica_internal.guard_snapshot_write() OWNER TO agenda_snapshot_owner;
REVOKE ALL ON FUNCTION agenda_dinamica_internal.guard_snapshot_write()
  FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER agenda_snapshot_write_guard BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE
  ON public.agenda_dinamica_storage FOR EACH STATEMENT
  EXECUTE FUNCTION agenda_dinamica_internal.guard_snapshot_write();

-- Uma única consulta MVCC retorna revisão e todo o snapshot coerentemente.
CREATE FUNCTION public.agenda_snapshot_load() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
  IF auth.uid() IS NULL OR auth.jwt()->>'role' IS DISTINCT FROM 'authenticated' THEN
    RAISE EXCEPTION 'Sessão authenticated obrigatória' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object('status', 'SUCCESS', 'revision', m.revision::text,
    'protected', m.enforced, 'actorId', auth.uid(), 'rows',
    COALESCE((SELECT jsonb_agg(jsonb_build_object('key', s.key, 'value', s.value) ORDER BY s.key)
      FROM public.agenda_dinamica_storage s), '[]'::jsonb)) INTO STRICT result
  FROM public.agenda_dinamica_metadata m WHERE id = 1;
  RETURN result;
END $$;

CREATE FUNCTION public.agenda_snapshot_commit(p_expected_revision text, p_changes jsonb, p_context jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := auth.uid();
  m public.agenda_dinamica_metadata%ROWTYPE;
  receipt public.agenda_dinamica_command_receipts%ROWTYPE;
  command text;
  canonical jsonb;
  request_data jsonb;
  output jsonb;
  change jsonb;
  field text;
  next_revision bigint;
BEGIN
  IF actor IS NULL OR auth.jwt()->>'role' IS DISTINCT FROM 'authenticated' THEN
    RAISE EXCEPTION 'Sessão authenticated obrigatória' USING ERRCODE = '42501';
  END IF;
  IF p_expected_revision IS NULL OR p_expected_revision !~ '^(0|[1-9][0-9]{0,18})$'
    OR p_expected_revision::numeric > 9223372036854775806 THEN
    RAISE EXCEPTION 'Revisão inválida' USING ERRCODE = '22023';
  END IF;
  IF p_context IS NULL OR jsonb_typeof(p_context) <> 'object' THEN
    RAISE EXCEPTION 'Contexto inválido' USING ERRCODE = '22023';
  END IF;
  FOR field IN SELECT jsonb_object_keys(p_context) LOOP
    IF field NOT IN ('commandId','sessionId','instanceId','correlationId','causationId','origin','eventId') THEN
      RAISE EXCEPTION 'Campo de contexto não permitido' USING ERRCODE = '22023';
    END IF;
    IF p_context->field <> 'null'::jsonb AND
      (jsonb_typeof(p_context->field) <> 'string' OR length(btrim(p_context->>field)) NOT BETWEEN 1 AND 200) THEN
      RAISE EXCEPTION 'Metadado inválido' USING ERRCODE = '22023';
    END IF;
  END LOOP;
  command := p_context->>'commandId';
  IF command IS NULL OR length(btrim(command)) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'commandId obrigatório' USING ERRCODE = '22023';
  END IF;
  IF p_context->>'eventId' = command THEN
    RAISE EXCEPTION 'eventId deve diferir de commandId' USING ERRCODE = '22023';
  END IF;
  IF p_changes IS NULL OR jsonb_typeof(p_changes) <> 'array' THEN
    RAISE EXCEPTION 'Changes deve ser array' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_changes) NOT BETWEEN 1 AND 12 OR pg_column_size(p_changes) > 16777216 THEN
    RAISE EXCEPTION 'Quantidade/tamanho inválido' USING ERRCODE = '22023';
  END IF;
  FOR change IN SELECT value FROM jsonb_array_elements(p_changes) LOOP
    IF jsonb_typeof(change) <> 'object' OR NOT (change ? 'key' AND change ? 'value')
      OR (SELECT count(*) FROM jsonb_object_keys(change)) <> 2
      OR jsonb_typeof(change->'key') <> 'string'
      OR change->>'key' NOT IN ('secta_clientes','secta_contatos','secta_agendamentos',
        'secta_solicitacoes_orcamento','secta_orcamentos','secta_concluidos','secta_hist_clientes',
        'secta_controle_vendas','secta_cotacoes_compras','secta_alarmed','secta_produtos_solicitacoes','secta_theme') THEN
      RAISE EXCEPTION 'Key/estrutura não permitida' USING ERRCODE = '22023';
    END IF;
    IF (change->>'key' = 'secta_theme' AND jsonb_typeof(change->'value') <> 'string')
      OR (change->>'key' <> 'secta_theme' AND jsonb_typeof(change->'value') <> 'array') THEN
      RAISE EXCEPTION 'Tipo de value inválido' USING ERRCODE = '22023';
    END IF;
  END LOOP;
  IF (SELECT count(DISTINCT value->>'key') FROM jsonb_array_elements(p_changes)) <> jsonb_array_length(p_changes) THEN
    RAISE EXCEPTION 'Keys duplicadas' USING ERRCODE = '22023';
  END IF;
  SELECT jsonb_agg(value ORDER BY value->>'key') INTO canonical FROM jsonb_array_elements(p_changes);
  request_data := jsonb_build_object('expectedRevision',p_expected_revision,'changes',canonical);
  SELECT * INTO STRICT m FROM public.agenda_dinamica_metadata WHERE id = 1 FOR UPDATE;
  SELECT * INTO receipt FROM public.agenda_dinamica_command_receipts WHERE command_id = command;
  IF FOUND THEN
    IF receipt.actor_id <> actor OR receipt.request <> request_data THEN
      RAISE EXCEPTION 'commandId já utilizado por outra intenção' USING ERRCODE = '22023';
    END IF;
    RETURN receipt.result || jsonb_build_object('replayed',true);
  END IF;
  IF m.revision <> p_expected_revision::bigint THEN
    RETURN jsonb_build_object('status','CONFLICT','expectedRevision',p_expected_revision,
      'actualRevision',m.revision::text,'commandId',command,'protected',m.enforced);
  END IF;
  UPDATE public.agenda_dinamica_metadata SET rpc_transaction = pg_catalog.txid_current() WHERE id = 1;
  INSERT INTO public.agenda_dinamica_storage(key,value)
    SELECT value->>'key',value->'value' FROM jsonb_array_elements(canonical)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  next_revision := m.revision + 1;
  UPDATE public.agenda_dinamica_metadata
    SET revision = next_revision, updated_at = now(), rpc_transaction = NULL WHERE id = 1;
  SELECT jsonb_build_object('status','SUCCESS','revision',next_revision::text,
    'commandId',command,'actorId',actor,'eventId',p_context->>'eventId','protected',m.enforced,
    'replayed',false,'persistedAt',now(),'rows',COALESCE(jsonb_agg(jsonb_build_object('key',s.key,'value',s.value) ORDER BY s.key),'[]'::jsonb))
    INTO output FROM public.agenda_dinamica_storage s;
  INSERT INTO public.agenda_dinamica_command_receipts(command_id,actor_id,session_id,instance_id,
    correlation_id,causation_id,event_id,status,revision,request,result)
    VALUES(command,actor,p_context->>'sessionId',p_context->>'instanceId',p_context->>'correlationId',
      p_context->>'causationId',p_context->>'eventId','SUCCESS',next_revision,request_data,output);
  RETURN output;
END $$;
ALTER FUNCTION public.agenda_snapshot_load() OWNER TO agenda_snapshot_owner;
ALTER FUNCTION public.agenda_snapshot_commit(text,jsonb,jsonb) OWNER TO agenda_snapshot_owner;
REVOKE ALL ON FUNCTION public.agenda_snapshot_load(), public.agenda_snapshot_commit(text,jsonb,jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.agenda_snapshot_load(), public.agenda_snapshot_commit(text,jsonb,jsonb)
  TO authenticated;
COMMIT;
