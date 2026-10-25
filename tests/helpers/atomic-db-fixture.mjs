import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const migration=fs.readFileSync('supabase/migrations/202610080001_agenda_atomic_snapshot.sql','utf8');
const activate=fs.readFileSync('supabase/rollout/activate_atomic_snapshot.sql','utf8');
const actor='11111111-1111-4111-8111-111111111111';
export async function databaseFixture() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;`);
  // Cast explícito mantém a simulação de auth.uid fiel ao tipo UUID.
  await db.exec(`CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $$ SELECT (NULLIF(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS
    $$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb) $$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
    CREATE TABLE public.agenda_dinamica_storage(key text PRIMARY KEY,value jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now());
    CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS
    $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
    CREATE TRIGGER set_agenda_dinamica_storage_updated_at BEFORE UPDATE
      ON public.agenda_dinamica_storage FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    ALTER TABLE public.agenda_dinamica_storage ENABLE ROW LEVEL SECURITY;
    CREATE POLICY fixture_authenticated ON public.agenda_dinamica_storage
      TO authenticated USING(true) WITH CHECK(true);
    GRANT ALL ON public.agenda_dinamica_storage TO anon,authenticated,service_role;
    INSERT INTO public.agenda_dinamica_storage(key,value) VALUES
      ('secta_clientes','[{"id":1,"nome":"Original"}]'),
      ('secta_controle_vendas','[{"id":2,"valor":1000}]');`);
  await db.exec(migration);
  const asUser = (callback, { role = 'authenticated', uid = actor } = {}) => db.transaction(async tx => {
    await tx.exec(`SET LOCAL ROLE ${role};`);
    await tx.query(`SELECT set_config('request.jwt.claims',$1,true)`, [JSON.stringify({ role, sub: uid })]);
    return callback(tx);
  });
  const load = options => asUser(async tx => (await tx.query('SELECT public.agenda_snapshot_load() AS data')).rows[0].data, options);
  const commit = (revision, changes, commandId, options, context = {}) => asUser(async tx =>
    (await tx.query('SELECT public.agenda_snapshot_commit($1,$2::jsonb,$3::jsonb) AS data',
      [String(revision), JSON.stringify(changes), JSON.stringify({ commandId, ...context })])).rows[0].data, options);
  return { db, load, commit, asUser, activate: () => db.exec(activate) };
}
