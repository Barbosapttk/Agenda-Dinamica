// ES modules também enxergam os bindings lexicais globais dos scripts clássicos.
// Não usar window.controleVendas: é diferente do let controleVendas persistido.
export function createLegacyUiAdapter() {
  const bindings = {
    clientes: [() => clientes, value => { clientes = value; }],
    contatos: [() => contatos, value => { contatos = value; }],
    agendamentos: [() => agendamentos, value => { agendamentos = value; }],
    solicitacoesOrcamento: [() => solicitacoesOrcamento, value => { solicitacoesOrcamento = value; }],
    orcamentos: [() => orcamentos, value => { orcamentos = value; }],
    concluidos: [() => concluidos, value => { concluidos = value; }],
    historicoClientes: [() => historicoClientes, value => { historicoClientes = value; }],
    controleVendas: [() => controleVendas, value => { controleVendas = value; }],
    cotacoesCompras: [() => cotacoesCompras, value => { cotacoesCompras = value; }],
    alarmedIds: [() => alarmedIds, value => { alarmedIds = value; }],
    produtosSolicitacoes: [() => produtosSolicitacoes, value => { produtosSolicitacoes = value; }],
    appTheme: [() => appTheme, value => { appTheme = value; }]
  };
  const originalLoad = carregarDadosSupabase;
  const originalPersist = persistirDadosSupabase;
  let connected = false;
  let startPromise;
  const getState = () => Object.fromEntries(Object.entries(bindings).map(([name, [read]]) => [name, read()]));

  return Object.freeze({
    getState,
    setState(patch) {
      for (const name of Object.keys(patch)) if (!Object.hasOwn(bindings, name)) throw new TypeError(`Binding desconhecido: ${name}`);
      for (const [name, value] of Object.entries(patch)) bindings[name][1](value);
    },
    getClient: () => supabaseClient,
    getCurrentUser: () => usuarioLogado,
    isConfigured: () => Boolean(supabaseClient),
    async loadSnapshot() { await originalLoad(); return getState(); },
    writeSnapshot: (snapshot, options) => originalPersist(snapshot, options),
    today: () => today(),
    renderPurchases: () => renderCotacoesComprasPainel(),
    prepareAttachments: (attachments, context) => prepararAnexosParaSalvar(attachments, context),
    getAttachmentUrl: attachment => obterUrlAnexo(attachment),
    connectRepository(repository) {
      if (connected) return;
      connected = true;
      // Um único caminho de leitura, incluindo Realtime/polling. Não emite eventos.
      carregarDadosSupabase = async function carregarDadosSupabaseAdapter() {
        const result = await repository.load();
        if (!result.ok) throw result.error;
      };
      // Os comandos não migrados conservam save(), mas compartilham fila e trava de carga.
      persistirDadosSupabase = snapshot => repository.saveLegacy(snapshot ?? null);
    },
    start() {
      if (!startPromise) startPromise = Promise.resolve().then(() => iniciarComLogin());
      return startPromise;
    }
  });
}
