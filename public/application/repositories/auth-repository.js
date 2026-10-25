// Reutiliza o cliente existente; tracking explícito/idempotente, sem criar sessão.
export function createAuthRepository({ getClient, getCurrentUser }) {
  let trackedSession;
  let epoch = 0;
  let stopTracking = null;
  const currentUser = () => trackedSession === undefined ? getCurrentUser() : trackedSession?.user;
  return Object.freeze({
    getActorId: () => currentUser()?.id || null,
    async inspectAccess() {
      // Diagnóstico somente de leitura: não retorna JWT, refresh token, email ou senha.
      try {
        const client = getClient();
        if (!client?.auth?.getSession) throw new Error('Cliente Auth indisponível.');
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        const session = data?.session;
        if (!session?.user) return { ok:true, role:'anon', actorId:null, authenticated:false, hasSession:false };
        const verified = await client.auth.getUser();
        if (verified.error || verified.data?.user?.id !== session.user.id) throw new Error('Sessão não verificada.');
        let claims = {};
        try {
          const encoded = session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
          claims = JSON.parse(globalThis.atob(encoded));
        } catch { /* Não inferir role de token indisponível. */ }
        return { ok:true, role:claims.role === 'authenticated' ? 'authenticated' : 'UNKNOWN',
          actorId:verified.data.user.id, authenticated:claims.role === 'authenticated', hasSession:true,
          anonymousUser:verified.data.user.is_anonymous === true };
      } catch { return { ok:false, role:'UNKNOWN', actorId:null, authenticated:false, hasSession:null }; }
    },
    startSessionTracking() {
      if (stopTracking) return stopTracking;
      const client = getClient();
      if (!client?.auth?.onAuthStateChange) return () => {};
      const { data } = client.auth.onAuthStateChange((_event, session) => { trackedSession = session; epoch++; });
      const unsubscribe = () => {
        if (stopTracking !== unsubscribe) return false;
        data?.subscription?.unsubscribe(); stopTracking = null;
        return true;
      };
      stopTracking = unsubscribe;
      return stopTracking;
    },
    async getExecutionIdentity() {
      const candidate = currentUser();
      if (!candidate?.id) return { ok: true, actorId: null, authenticated: false };
      const capturedEpoch = epoch;
      try {
        const client = getClient();
        if (!client?.auth?.getUser) throw new Error('Verificação da sessão indisponível.');
        const { data, error } = await client.auth.getUser();
        if (error) throw error;
        if (!data?.user?.id || data.user.id !== candidate.id || capturedEpoch !== epoch) throw new Error('Sessão mudou durante a verificação.');
        return { ok: true, actorId: data.user.id, authenticated: true };
      } catch (error) { return { ok: false, actorId: null, error }; }
    },
    async getSession() {
      try {
        const client = getClient();
        if (!client) throw new Error('Supabase não configurado.');
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        return { ok: true, session: data?.session || null };
      } catch (error) { return { ok: false, error }; }
    }
  });
}
