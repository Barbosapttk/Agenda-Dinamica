import test from 'node:test';
import assert from 'node:assert/strict';
import { COLLECTION_NAMES, createAppState } from '../public/application/state/app-state.js';
import { createSnapshotRepository } from '../public/application/repositories/snapshot-repository.js';
import { createComprasService } from '../public/application/services/compras-service.js';

// Caracterização, não solução: duas instâncias reais de Repository/Service
// compartilham um servidor simulado com upsert por chave, sem CAS/RLS.
async function twoClients() {
  let server = { ...Object.fromEntries(COLLECTION_NAMES.map(name => [name, []])), appTheme: 'dark',
    controleVendas: [{ id: 9, valor: 1000 }],
    cotacoesCompras: [1, 2].map(id => ({ id, descricao: `Item ${id}`, status: 'enviado', concluida: false })) };
  const writes = [];
  function client(name) {
    let local = structuredClone(server);
    const events = [];
    const state = createAppState({ readState: () => local, writeState: patch => { local = { ...local, ...patch }; } });
    const repository = createSnapshotRepository({ state, migratedCollections: ['cotacoesCompras'],
      loadSnapshot: async () => { state.setState(structuredClone(server)); return state.getSnapshot(); },
      writeSnapshot: async (candidate, { collections }) => {
        writes.push({ client: name, collections: [...collections] });
        for (const collection of collections) server[collection] = structuredClone(candidate[collection]);
        return { ok: true };
      }
    });
    const service = createComprasService({ repository, eventBus: { publish: async event => { events.push(event); return { delivered: 0, errors: [] }; } },
      today: () => '2026-10-08' });
    return { state, repository, service, events };
  }
  const a = client('A'), b = client('B');
  await a.repository.load(); await b.repository.load();
  return { a, b, writes, getServer: () => structuredClone(server) };
}

test('caracterização: snapshot legado de A pode desfazer valor salvo por B ao registrar contato', async () => {
  const f = await twoClients();
  f.b.state.setState({ controleVendas: [{ id: 9, valor: 1200 }] });
  assert.equal((await f.b.repository.saveLegacy()).ok, true);
  assert.equal(f.getServer().controleVendas[0].valor, 1200);
  f.a.state.setState({ contatos: [{ id: 5, clienteId: 1, descricao: 'Contato em A' }] });
  assert.equal((await f.a.repository.saveLegacy()).ok, true);
  assert.equal(f.getServer().controleVendas[0].valor, 1000, 'Demonstra sobrescrita atual; não há versão esperada');
  assert.equal(f.writes[1].collections.includes('controleVendas'), true);
});

test('caracterização: comandos em compras diferentes ainda disputam a mesma coleção entre navegadores', async () => {
  const f = await twoClients();
  assert.equal((await f.b.service.alterarStatus(2, 'sem_retorno')).ok, true);
  assert.equal((await f.a.service.editar(1, { descricao: 'Editado em A' })).ok, true);
  assert.equal(f.getServer().cotacoesCompras[1].status, 'enviado', 'Snapshot de A sobrescreve alteração remota do item 2');
  assert.equal(f.b.repository.getConfirmedSnapshot().cotacoesCompras[1].status, 'sem_retorno', 'Confirmação local não representa versão global atual');
  assert.equal(f.a.events.length, 1);
  assert.equal(f.b.events.length, 1);
  assert.equal(f.writes.every(write => write.collections.length === 1), true);
});

test('caracterização: legado omite compras locais inalteradas e preserva essa atualização remota', async () => {
  const f = await twoClients();
  await f.b.service.alterarStatus(1, 'sem_retorno');
  f.a.state.setState({ contatos: [{ id: 5, descricao: 'Outra coleção' }] });
  await f.a.repository.saveLegacy();
  assert.equal(f.writes[1].collections.includes('cotacoesCompras'), false);
  assert.equal(f.getServer().cotacoesCompras[0].status, 'sem_retorno');
});

test('caracterização: recarga reconcilia dados remotos sem publicar fatos locais', async () => {
  const f = await twoClients();
  await f.b.service.alterarStatus(1, 'sem_retorno');
  assert.equal(f.a.state.getCollection('cotacoesCompras')[0].status, 'enviado');
  await f.a.repository.load();
  assert.equal(f.a.state.getCollection('cotacoesCompras')[0].status, 'sem_retorno');
  assert.equal(f.a.events.length, 0);
});

test('caracterização: no-op baseado em estado local não confirma o status remoto', async () => {
  const f = await twoClients();
  await f.b.service.alterarStatus(1, 'sem_retorno');
  const writesBefore = f.writes.length;
  const result = await f.a.service.alterarStatus(1, 'enviado');
  assert.equal(result.ok, true);
  assert.equal(result.changed, false);
  assert.equal(f.writes.length, writesBefore);
  assert.equal(f.a.state.getCollection('cotacoesCompras')[0].status, 'enviado');
  assert.equal(f.getServer().cotacoesCompras[0].status, 'sem_retorno');
});
