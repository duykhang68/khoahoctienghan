export const validReceipt=r=>r&&typeof r.title==='string'&&/^[a-f0-9]{64}$/.test(r.id||'')&&/^[a-f0-9]{40}$/.test(r.source||'');
export function makeReceipt(result,title){return {id:result.id,source:result.sha,title:String(title).slice(0,180)};}
export function readReceiptRows(rows){return Array.isArray(rows)?rows.filter(validReceipt).map(x=>({id:x.id,source:x.source,title:x.title.slice(0,180)})):[];}
export function putReceipt(rows,r){const all=new Map(rows.map(x=>[x.id,x]));all.set(r.id,r);return [...all.values()].slice(-50);}
