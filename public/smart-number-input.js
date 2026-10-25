import { parseServiceNumber } from './service-calculator-math.js';
export function formatToolNumber(raw,kind='number') {
  const text=String(raw).trim();if(!text)return text;
  const value=parseServiceNumber(kind==='percent'?text.replace(/%/g,''):text);
  if(!Number.isFinite(value))return text;
  const options={minimumFractionDigits:kind==='number'?0:2,maximumFractionDigits:20};
  if(kind==='money')Object.assign(options,{style:'currency',currency:'BRL'});
  return value.toLocaleString('pt-BR',options)+(kind==='percent'?'%':'');
}
export function attachSmartNumberInput(input,kind='number') {
  if(input.readOnly || input.dataset.smartNumber)return;
  input.dataset.smartNumber=kind;
  let firstClick=false;
  input.addEventListener('pointerdown',()=>{firstClick=document.activeElement!==input;});
  input.addEventListener('focus',()=>input.select());
  input.addEventListener('click',()=>{if(firstClick){input.select();firstClick=false;}});
  input.addEventListener('blur',()=>{
    firstClick=false;input.value=formatToolNumber(input.value,kind);
    input.dispatchEvent(new Event('input',{bubbles:true}));
  });
}
