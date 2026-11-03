/* O texto exibido é pt-BR; o contrato .value do legado continua sendo ISO. */
(function () {
  const native = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  function enhance(input) {
    if (input.dataset.brDate) return;
    const initial = input.value;
    input.type = 'text'; input.dataset.brDate = 'true';
    input.placeholder = 'DD/MM/AAAA'; input.inputMode = 'numeric'; input.maxLength = 10;
    input.setAttribute('aria-label', input.getAttribute('aria-label') || `${input.closest('label')?.textContent || input.previousElementSibling?.textContent || 'Data'} (DD/MM/AAAA)`);
    function validity() {
      const raw = native.get.call(input);
      input.setCustomValidity(raw && !AgendaFormat.isoDate(raw) ? 'Informe uma data válida em DD/MM/AAAA.' : '');
    }
    Object.defineProperty(input, 'value', {
      configurable: true,
      get() { return AgendaFormat.isoDate(native.get.call(this)); },
      set(value) {
        const iso = AgendaFormat.isoDate(value);
        native.set.call(this, iso ? AgendaFormat.date(iso) : String(value || ''));
        this.dataset.lastLength = native.get.call(this).length;
        validity();
      }
    });
    input.value = initial;
    input.addEventListener('input', () => {
      let raw = native.get.call(input);
      if (/^[\d/]*$/.test(raw)) {
        const digits = raw.replace(/\D/g,'').slice(0,8);
        if (raw.length >= input.dataset.lastLength) native.set.call(input, digits.replace(/^(\d{2})(\d)/,'$1/$2').replace(/^(\d{2}\/\d{2})(\d)/,'$1/$2'));
      }
      input.dataset.lastLength = native.get.call(input).length;
      validity();
    });
    input.addEventListener('blur', () => { if (input.value) input.value = input.value; validity(); });
  }
  function scan(root = document) {
    if (root.matches?.('input[type="date"]')) enhance(root);
    root.querySelectorAll?.('input[type="date"]').forEach(enhance);
  }
  scan();
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => { if (node.nodeType === 1) scan(node); }))).observe(document.body, { childList:true, subtree:true });
})();
