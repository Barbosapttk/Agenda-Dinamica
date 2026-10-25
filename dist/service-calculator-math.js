export function parseServiceNumber(value) {
  let text = String(value ?? '').trim().replace(/R\$|\s/g, '');
  if (!text) return 0;
  if (text.includes(',')) text = text.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(text)) text = text.replace(/\./g, '');
  return /^\d+(\.\d+)?$/.test(text) ? Number(text) : NaN;
}

export const CHEMICALS = [
  { id: 'hypochlorite', name: 'Hipoclorito de sódio', price: 9, unit: 'galão de 5 L' },
  { id: 'hydroxide', name: 'Hidróxido de sódio', price: 8, unit: 'kg' },
  { id: 'peracetic', name: 'Ácido peracético', price: 60, unit: 'galão de 5 L' },
];

export function calculateService({ salary, hours, distance = 0, toll = 0, food = false, chemicals = {} }) {
  if (![salary, hours, distance, toll].every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0) || salary <= 0 || hours <= 0) {
    throw new RangeError('Informe salário e horas maiores que zero e custos não negativos.');
  }
  const hourlyTechnician = salary / 22 * 1.8 / 8;
  const technician = hourlyTechnician * hours;
  const fuel = distance * 2 * 7.5 / 12;
  const meal = food ? 38 : 0;
  const vehicle = 100 / 8 * hours;
  const chemicalCosts = {};
  for (const product of CHEMICALS) {
    const item = chemicals[product.id];
    const quantity = item?.selected ? item.quantity : 0;
    if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity < 0) throw new RangeError('Quantidade de produto químico inválida.');
    chemicalCosts[product.id] = product.price * quantity;
  }
  const chemicalTotal = Object.values(chemicalCosts).reduce((sum, value) => sum + value, 0);
  const total = technician + fuel + toll + meal + vehicle + chemicalTotal;
  const tax = total * 0.22;
  const margin = total * 0.30;
  const final = total * 1.52;
  if (![hourlyTechnician, technician, fuel, total, tax, margin, final].every(Number.isFinite)) throw new RangeError('Valores acima do limite de cálculo.');
  return { hourlyTechnician, technician, fuel, toll, meal, vehicle, chemicalCosts, chemicalTotal, total, tax, margin, final };
}
