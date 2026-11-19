import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { unzipSync, strFromU8 } from '../public/vendor/fflate/esm/browser.js';

export async function runComprasExcelBrowserChecks({ evaluate, call, load }) {
  await evaluate(`showView('dashboard'); abrirModalCotacaoCompras();
    window.testField = name => document.getElementById('cotacao-compras-' + name);
    testField('descricao').value = 'Compra de peça para transmissão';
    testField('referencia').value = 'João Silva';
    testField('prioridade').value = 'critica';
    testField('observacoes').value = 'Conferir o código antes de comprar.';
    testField('adicionar-item').click();
    const values = { quantidade: '2.5', unidade: 'UN', prd: 'AB-001', descricao: 'Rolamento', aplicacao: 'Bancada' };
    for (const [name, value] of Object.entries(values)) testField('itens').querySelector('[name="' + name + '"]').value = value;
    salvarCotacaoCompras()`);
  const before = await evaluate("getCotacoesCompras().find(item => item.nomeReferencia === 'João Silva')");
  assert.equal(before.itens[0].quantidade, 2.5);
  await load();
  assert.deepEqual(await evaluate(`getCotacoesCompras().find(item => item.id === ${before.id})`), before);
  assert.equal(await evaluate(`abrirModalCotacaoCompras(${before.id}); document.querySelector('#cotacao-compras-itens [name="prd"]').value`), 'AB-001');
  await evaluate("closeModal('modalCotacaoCompras'); showView('dashboard')");

  const file = await evaluate(`(async () => {
    const click = HTMLAnchorElement.prototype.click;
    let download;
    try {
      HTMLAnchorElement.prototype.click = function () { download = { filename: this.download, href: this.href }; };
      const button = [...document.querySelectorAll('.cotacao-compras-card')]
        .find(card => card.textContent.includes('Compra de peça para transmissão')).querySelector('[data-compra-excel]');
      button.click();
      for (let i = 0; button.disabled && i < 50; i++) await new Promise(resolve => setTimeout(resolve, 100));
      if (!download) throw new Error('O botão não iniciou o download.');
      const bytes = new Uint8Array(await (await fetch(download.href)).arrayBuffer());
      return { filename: download.filename, bytes: Array.from(bytes) };
    } finally {
      HTMLAnchorElement.prototype.click = click;
    }
  })()`);
  assert.equal(before.numero, 1);
  assert.equal(file.filename, 'Rolamento - 1.xlsx');
  const parts = unzipSync(Uint8Array.from(file.bytes));
  const sheet = strFromU8(parts['xl/worksheets/sheet1.xml']);
  assert.match(sheet, /Patrick Barbosa/);
  assert.match(sheet, /<c r="J2"[^>]* t="n"><v>1<\/v>/);
  assert.match(sheet, /<c r="B11"[^>]* t="n"><v>2\.5<\/v>/);
  assert.match(sheet, /AB-001/);
  assert.match(sheet, /Conferir o código antes de comprar/);
  assert.ok(parts['xl/media/image1.png'].length);

  await evaluate(`clientes=[{id:1,nome:'Cliente FQ 09',status:'ativo'}];
    solicitacoesOrcamento=[{id:11,clienteId:1,solicitante:'Solicitante secundário',
      produto:'Rolamento',descricao:'Descrição comercial ' + 'X'.repeat(300) + '\\nÚltima linha da descrição',
      dataSolicitacao:today(),prazo:today(),etapa:'nova',prioridade:'normal',
      proximaAcao:{texto:'Confirmar medidas',data:today()}}];
    controleVendas=[{id:12,clienteId:1,cliente:'Cliente FQ 09',empresa:'Empresa de teste',
      numeroProposta:'PROP-12',data:today(),valor:150,statusPedido:'aprovado',tipoOrcamento:'pecas'}];
    renderizarDadosSincronizados();`);
  const views = {
    Dashboard: "showView('dashboard')",
    Solicitações: "showView('solicitacoes')",
    Compras: "showView('dashboard');document.getElementById('cotacoes-compras-kanban').scrollIntoView()",
    Ferramentas: "document.querySelector('.tools-central-link').click()",
    Fretes: "document.querySelector('.tools-central-link').click(); document.getElementById('open-fretes').click()",
    Tabelas: "showView('controle-vendas')"
  };
  for (const width of [1920, 1600, 1440, 1366, 1280, 1024, 936, 900, 768]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    for (const theme of ['light', 'dark']) {
      await evaluate(`applyTheme('${theme}', false)`);
      for (const [name, open] of Object.entries(views)) {
        await evaluate(open);
        const label = `${name}, ${width}px, ${theme}`;
        const layout = await evaluate(`(() => {
          const active = document.querySelector('.view.active');
          const cards = [...active.querySelectorAll('.request-mini, .cotacao-compras-card')].filter(e => e.getClientRects().length);
          const nav = document.querySelector('.topnav');
          const visible = [...document.querySelectorAll('.header-actions button, .topnav, .quick-action-grid')]
            .filter(e => e.getClientRects().length);
          return {
            page: document.documentElement.scrollWidth <= innerWidth + 2,
            header: visible.every(e => e.getBoundingClientRect().left >= -1 && e.getBoundingClientRect().right <= innerWidth + 1),
            nav: nav.scrollWidth <= nav.clientWidth + 2,
            cards: cards.every(card => card.scrollWidth <= card.clientWidth + 2 &&
              [...card.querySelectorAll('button')].every(button => button.getBoundingClientRect().right <= card.getBoundingClientRect().right + 1))
          };
        })()`);
        assert.deepEqual(layout, { page: true, header: true, nav: true, cards: true }, label);
        if (name === 'Solicitações') {
          if (width >= 768 && width <= 1024) {
            const alignment = await evaluate(`(() => {
              const filters = document.getElementById('filtro-situacao-solicitacoes').parentElement;
              const controls = [...filters.children].map(element => element.getBoundingClientRect());
              const nav = document.querySelector('.topnav').getBoundingClientRect();
              const actions = document.querySelector('.header-actions').getBoundingClientRect();
              const tools = document.querySelector('.qa-tools strong');
              const toolsButton = tools.closest('button').getBoundingClientRect();
              const toolsLabel = tools.getBoundingClientRect();
              const leftEdges = [...document.querySelectorAll('.sidebar .quick-action-icon')]
                .filter(element => element.getClientRects().length).map(element => element.getBoundingClientRect().left);
              const same = (first, second) => Math.abs(first - second) <= 2;
              return {
                alignedFilters: controls.slice(0, 3).every((rect, column) => same(rect.left, controls[column + 3].left) && same(rect.width, controls[column + 3].width)),
                alignedNavigation: nav.right <= actions.left && same(nav.top + nav.height / 2, actions.top + actions.height / 2),
                visibleTools: toolsLabel.width > 20 && toolsLabel.right <= toolsButton.right && parseFloat(getComputedStyle(tools).fontSize) >= 11,
                alignedSidebar: innerWidth <= 900 || leftEdges.every(left => same(left, leftEdges[0]))
              };
            })()`);
            assert.deepEqual(alignment, { alignedFilters: true, alignedNavigation: true, visibleTools: true, alignedSidebar: true }, label);
            if (width === 936 && theme === 'dark' && process.env.AGENDA_CAPTURE_SPLIT === '1') {
              const capture = await call('Page.captureScreenshot', { format: 'png' });
              writeFileSync('test-results/tela-dividida-solicitacoes.png', Buffer.from(capture.data, 'base64'));
            }
          }
          assert.equal(await evaluate(`(() => {
            const card = document.querySelector('#solicitacoes-kanban [data-sol-id="11"]');
            const selectors = ['.orcamento-card-title','.mini-item','.mini-request-status','.sol-proxima-acao','.mini-deadline','.mini-actions'];
            const blocks = selectors.map(selector => card.querySelector(selector));
            return card.firstElementChild.textContent.toLocaleUpperCase('pt-BR').includes('CLIENTE FQ 09') &&
              blocks[1].innerText.includes('Última linha da descrição') &&
              blocks[1].scrollHeight === blocks[1].clientHeight &&
              blocks.every((block, i) => i === 0 || blocks[i - 1].compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING) &&
              [...card.querySelectorAll('.mini-requester')].some(element => element.textContent.includes('Solicitante secundário'));
          })()`), true, label);
        }
      }
    }
  }
  console.log('FQ 09: compra persistida e exportada após recarga. Layout e cards: 108 combinações de largura, tema e tela.');
}
