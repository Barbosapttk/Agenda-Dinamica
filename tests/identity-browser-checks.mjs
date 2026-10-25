import assert from 'node:assert/strict';

async function browserConnection() {
  const version = await (await fetch('http://127.0.0.1:9222/json/version')).json();
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  let seq = 0;
  const pending = new Map();
  ws.addEventListener('message', ({ data }) => {
    const response = JSON.parse(data);
    const request = pending.get(response.id);
    if (!request) return;
    pending.delete(response.id);
    response.error ? request.reject(response.error) : request.resolve(response.result);
  });
  return { call: (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params }));
  }), close: () => ws.close() };
}

async function pageHarness(targetId, mock) {
  const target = (await (await fetch('http://127.0.0.1:9222/json')).json()).find(item => item.id === targetId);
  assert.ok(target, 'Contexto de teste criado');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  const pending = new Map(), errors = [];
  let seq = 0, closed = false;
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params }));
  });
  ws.addEventListener('message', async ({ data }) => {
    if (closed) return;
    const message = JSON.parse(data);
    if (message.id) {
      const request = pending.get(message.id); pending.delete(message.id);
      if (request) message.error ? request.reject(message.error) : request.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map(arg => arg.value || arg.description).join(' '));
    if (message.method === 'Fetch.requestPaused') {
      const { requestId, request } = message.params;
      try {
        if (request.url.includes('supabase-js')) await call('Fetch.fulfillRequest', { requestId, responseCode: 200,
          responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }], body: Buffer.from(mock).toString('base64') });
        else if (request.url.includes('.supabase.co')) await call('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' });
        else await call('Fetch.continueRequest', { requestId });
      } catch (error) { if (!closed) errors.push(String(error)); }
    }
  });
  await call('Runtime.enable');
  await call('Fetch.enable', { patterns: [{ urlPattern: '*supabase*' }] });
  async function evaluate(expression) {
    const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  return { call, evaluate, errors, close: () => { closed = true; ws.close(); } };
}

export async function runIdentityBrowserChecks({ evaluate, load, call, baseUrl, mock }) {
  const identity = await evaluate('AgendaApplication.executionContext.capture()');
  assert.equal(identity.actorId, null);
  assert.notEqual(identity.instanceId, identity.sessionId);
  assert.notEqual(identity.commandId, identity.sessionId);
  assert.equal(identity.correlationId, identity.commandId);
  assert.equal(identity.causationId, null);
  const created = await evaluate("AgendaApplication.services.compras.criar({descricao:'Identidade técnica'}, {correlationId:'corr-browser',causationId:'cause-browser'})");
  assert.equal(created.reason, 'SUCCESS');
  assert.equal(created.event.instanceId, identity.instanceId);
  assert.equal(created.event.sessionId, identity.sessionId);
  assert.notEqual(created.event.commandId, created.event.eventId);
  assert.equal(created.event.actorId, null);
  assert.equal(created.event.correlationId, 'corr-browser');
  assert.equal(created.event.causationId, 'cause-browser');
  assert.equal(await evaluate('AgendaApplication.repositories.snapshot.getStatus().concurrency.protected'), false);
  await load();
  const reloaded = await evaluate('AgendaApplication.executionContext.capture()');
  assert.equal(reloaded.instanceId, identity.instanceId);
  assert.notEqual(reloaded.sessionId, identity.sessionId);
  assert.equal(await evaluate('AgendaApplication.events.bus.getSubscriptions().length'), 5);

  const contexts = [], harnesses = [];
  const browser = await browserConnection();
  try {
    for (let i = 0; i < 2; i++) {
      const { browserContextId } = await browser.call('Target.createBrowserContext');
      contexts.push(browserContextId);
      const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
      const harness = await pageHarness(targetId, mock);
      harnesses.push(harness);
      await harness.call('Page.navigate', { url: `${baseUrl}/original-index.html` });
      for (let j = 0; j < 100; j++) {
        if (await harness.evaluate("window.AgendaApplication?.repositories.snapshot.getStatus().status==='READY'")) break;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      assert.equal(await harness.evaluate('AgendaApplication.repositories.snapshot.getStatus().status'), 'READY');
    }
    const a = await harnesses[0].evaluate('AgendaApplication.executionContext.capture()');
    const b = await harnesses[1].evaluate('AgendaApplication.executionContext.capture()');
    assert.notEqual(a.instanceId, b.instanceId);
    assert.notEqual(a.sessionId, b.sessionId);
    assert.equal(a.actorId, null);
    assert.equal(b.actorId, null);
    for (const harness of harnesses) assert.deepEqual(harness.errors, []);
    // Apenas identidade: não simula proteção de uma RPC que ainda não existe.
  } finally {
    harnesses.forEach(harness => harness.close());
    try {
      for (const browserContextId of contexts) await browser.call('Target.disposeBrowserContext', { browserContextId });
    } finally { browser.close(); }
  }
}
