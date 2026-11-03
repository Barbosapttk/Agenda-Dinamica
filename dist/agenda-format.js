/* Helpers conservadores compartilhados pelo legado e pelos testes. */
(function (scope) {
  function isoDate(value) {
    const text = String(value || '').trim();
    const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
    const iso = br ? `${br[3]}-${br[2]}-${br[1]}` : text;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(0); date.setFullYear(y, m - 1, d); date.setHours(0, 0, 0, 0);
    return y >= 1000 && date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? iso : '';
  }
  function date(value) {
    const iso = isoDate(String(value || '').slice(0, 10));
    return iso ? `${iso.slice(8,10)}/${iso.slice(5,7)}/${iso.slice(0,4)}` : '—';
  }
  function dateTime(value) {
    if (!value) return '—';
    if (!String(value).includes('T')) return date(value);
    const instant = new Date(value);
    if (!Number.isFinite(instant.getTime())) return '—';
    return `${date(`${instant.getFullYear()}-${String(instant.getMonth()+1).padStart(2,'0')}-${String(instant.getDate()).padStart(2,'0')}`)} ${String(instant.getHours()).padStart(2,'0')}:${String(instant.getMinutes()).padStart(2,'0')}`;
  }
  function spaces(value) {
    return String(value || '').replace(/\r\n/g,'\n').split('\n').map(line => line.replace(/[ \t]+/g,' ').trim()).join('\n').replace(/\n{3,}/g,'\n\n').trim();
  }
  function text(value) {
    // Nunca converter a caixa do restante da frase: nomes, unidades e códigos são opacos.
    let result = spaces(value);
    const protectedParts = [];
    result = result.replace(/https?:\/\/\S+|www\.\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b\S*\d\S*\b/gim, part => {
      protectedParts.push(part); return `\uE000${protectedParts.length-1}\uE001`;
    });
    result = result.replace(/(^|[.!?]\s+|\n+)([a-záàâãéèêíóôõúç])/g, (_, prefix, letter) => prefix + letter.toLocaleUpperCase('pt-BR'));
    // Correção ortográfica inequívoca e limite de oração explícito; sem inferência livre.
    result = result.replace(/\b(bomba|Bomba) centrifuga\b/g,'$1 centrífuga').replace(/([^.!?\n])\s+favor\s+(?=verificar\b)/g,'$1. Favor ');
    result = result.replace(/\uE000(\d+)\uE001/g, (_, index) => protectedParts[Number(index)]);
    if (/\. Favor verificar\b/.test(result) && /[a-záàâãéèêíóôõúç]$/u.test(result)) result += '.';
    return result;
  }
  function name(value) { return spaces(value).replace(/^[a-záàâãéèêíóôõúç]/u, c => c.toLocaleUpperCase('pt-BR')); }
  function validPhone(value) {
    const phone = String(value || '').trim();
    const digits = phone.replace(/\D/g,'');
    return /^[+\d\s().-]+$/.test(phone) && /^\d{10,15}$/.test(digits) && !/^(\d)\1+$/.test(digits);
  }
  scope.AgendaFormat = Object.freeze({ isoDate, date, dateTime, text, name, validPhone });
})(globalThis);
