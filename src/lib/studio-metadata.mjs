import assert from 'node:assert/strict';
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=max&&!/[\u0000-\u001f\u007f]/u.test(v);
export function normalizeMetadata(input={}){
 assert(input&&typeof input==='object'&&!Array.isArray(input),'Metadata không hợp lệ');
 const labels=input.labels??[];
 assert(Array.isArray(labels)&&labels.length<=40&&labels.every(v=>text(v,120)),'Nhãn phải là văn bản, tối đa 40 nhãn, 120 ký tự mỗi nhãn');
 const result={labels:[...new Set(labels.map(v=>v.trim().normalize('NFC')))]};
 const s=input.series;
 if(s==null)return result;
 assert(s&&typeof s==='object'&&!Array.isArray(s),'Series không hợp lệ');
 if(s.enabled===false)return result;
 assert(s.enabled===undefined||s.enabled===true,'Trạng thái Series không hợp lệ');
 assert(text(s.name,180),'Nhập tên Series (tối đa 180 ký tự)');
 assert(Number.isInteger(s.part)&&Number.isInteger(s.total_parts)&&s.part>=1&&s.part<=s.total_parts&&s.total_parts<=9999,'Tập Series phải từ 1 đến tổng số tập (tối đa 9999)');
 const date=s.target_date??'';
 assert(typeof date==='string'&&(date===''||(/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date+'T00:00:00Z'))&&new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date)),'Ngày kết thúc Series không hợp lệ');
 result.series={name:s.name.trim().normalize('NFC'),part:s.part,total_parts:s.total_parts,target_date:date,status:s.part===s.total_parts?'completed':'in_progress'};
 return result;
}
