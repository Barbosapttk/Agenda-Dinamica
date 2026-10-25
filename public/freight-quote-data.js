export const SENDER = {
  company: 'Secta System', cnpj: '21.707.512/0001-62',
  address: 'R. Hiroshi Okada, 49 - Jardim Nina (Fazendinha)',
  cep: '06529-350', city: 'Santana de Parnaíba – SP',
};
export const RECIPIENT_FIELDS = [
  ['company', 'Razão Social'], ['cnpj', 'CNPJ'], ['address', 'Endereço'],
  ['district', 'Bairro'], ['cep', 'CEP'], ['city', 'Cidade'],
];
export const CARGO_FIELDS = [
  ['goods', 'Mercadoria'], ['invoice', 'Valor da NF'], ['weight', 'Peso Total'], ['dimensions', 'Dimensões por volume'],
];

// Extrai somente valores explicitamente presentes no texto, sem consultar serviços.
export function identifyRecipient(text) {
  const result = Object.fromEntries(RECIPIENT_FIELDS.map(([key]) => [key, '']));
  const labels = '(?:Raz[aã]o\\s+Social|CNPJ|Endere[cç]o|Bairro|Cidade|CEP)';
  const matcher = new RegExp('(?:^|\\n|[ \\t]+)(' + labels + ')\\s*[:–-]\\s*', 'gim');
  const matches = [...String(text).replaceAll('\r\n', '\n').matchAll(matcher)];
  const keys = { 'razao social': 'company', cnpj: 'cnpj', endereco: 'address', bairro: 'district', cidade: 'city', cep: 'cep' };
  for (let index = 0; index < matches.length; index++) {
    const match = matches[index];
    const key = keys[match[1].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ')];
    const end = matches[index + 1]?.index ?? String(text).length;
    const value = String(text).replaceAll('\r\n', '\n').slice(match.index + match[0].length, end).trim().split('\n')[0].trim();
    if (!result[key]) result[key] = value;
  }
  if (!result.company && matches.length && matches[0][1].toLowerCase() === 'cnpj') {
    const preceding = String(text).slice(0, matches[0].index).trim().split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (preceding.length === 1 && !/[:]|^(proposta|orçamento|orcamento|dados\b)/i.test(preceding[0])) result.company = preceding[0];
  }
  return result;
}

export function validCnpj(value) {
  const digits = String(value).replace(/[.\/\-\s]/g, '');
  if (!/^\d{14}$/.test(digits) || /^(\d)\1+$/.test(digits)) return false;
  const digit = base => {
    let weight = base.length - 7;
    const sum = [...base].reduce((total, number) => { const next = total + Number(number) * weight; weight = weight === 2 ? 9 : weight - 1; return next; }, 0);
    return sum % 11 < 2 ? 0 : 11 - sum % 11;
  };
  return digit(digits.slice(0,12)) === Number(digits[12]) && digit(digits.slice(0,13)) === Number(digits[13]);
}
export const validCep = value => /^\d{5}-?\d{3}$/.test(String(value).trim());

export function buildFreightQuote(recipient, cargo) {
  const lines = (fields, data) => fields.map(([key, label]) => `${label}: ${key==='weight' ? Number.isFinite(data[key]) ? data[key].toLocaleString('pt-BR',{maximumFractionDigits:20})+' KG' : '' : data[key] || ''}`).join('\n');
  return 'COTAÇÃO DE FRETE\n\nDADOS DA COLETA\n' + lines(RECIPIENT_FIELDS.filter(([key]) => key !== 'district'), SENDER)
    + '\n\nDADOS DA ENTREGA\n' + lines(RECIPIENT_FIELDS, recipient)
    + '\n\nDADOS DA CARGA\n' + lines(CARGO_FIELDS, cargo);
}
