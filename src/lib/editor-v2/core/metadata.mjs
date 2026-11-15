import {requireValue,validText} from './contracts.mjs';
/** @typedef {Readonly<{labels?:string,series?:Readonly<{enabled:boolean,name:string,part:number|string,total_parts:number|string,target_date?:string}>}>} EditorialMetadataInput */
export const slugify=value=>String(value).normalize('NFD').replace(/\p{M}/gu,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80).replace(/-+$/,'');
export function metadata(draft){
 const labels=String(draft.labels||'').split(',').map(s=>s.trim().normalize('NFC')).filter(Boolean);
 requireValue(labels.length<=40&&labels.every(v=>validText(v,120)),'Tối đa 40 nhãn, 120 ký tự mỗi nhãn.');
 const value={labels:[...new Set(labels)]};
 if(draft.series?.enabled){
  const {name,target_date=''}=draft.series,part=Number(draft.series.part),total_parts=Number(draft.series.total_parts);
  requireValue(validText(name,180)&&Number.isInteger(part)&&Number.isInteger(total_parts)&&part>=1&&part<=total_parts&&total_parts<=9999,'Kiểm tra tên và số tập Series.');
  requireValue(!target_date||(/^\d{4}-\d{2}-\d{2}$/.test(target_date)&&Number.isFinite(Date.parse(target_date+'T00:00:00Z'))&&new Date(target_date+'T00:00:00Z').toISOString().slice(0,10)===target_date),'Ngày Series không hợp lệ.');
  value.series={name:name.trim().normalize('NFC'),part,total_parts,target_date,status:part===total_parts?'completed':'in_progress'};
 }
 return value;
}
