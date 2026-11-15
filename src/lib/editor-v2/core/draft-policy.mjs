export const draftKey=kind=>'khoahoctienghan.editor-v2.draft.v2.'+kind;
const kinds=Object.freeze(['tech','knowledge']);
export const draftCopyLimit=50;
export function vietnamTime(value){
 if(typeof value!=='string'||! /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value))throw Error('Nhập thời điểm theo GMT+7, có giây.');
 const ms=Date.parse(value+'+07:00');
 if(!Number.isFinite(ms)||new Date(ms+7*3600000).toISOString().slice(0,19)!==value)throw Error('Ngày giờ không hợp lệ.');
 return ms;
}
export function validateCopy(draft){
 if(!draft||!kinds.includes(draft.kind)||typeof draft.title!=='string'||draft.title.length>180||!draft.title.trim()||!Array.isArray(draft.blocks)||draft.blocks.length>250)throw Error('Hãy lưu bài có tiêu đề trong Editor trước.');
 // Persist only the allowlisted Editor draft fields.
 const value=structuredClone({kind:draft.kind,title:draft.title,summary:String(draft.summary||''),category:String(draft.category||'ngon-ngu'),labels:String(draft.labels||''),series:draft.series||{enabled:false},blocks:draft.blocks});
 if(new TextEncoder().encode(JSON.stringify({version:1,draft:value})).length>8_000_000)throw Error('Bản nháp tối đa 8 MB.');
 return value;
}
export function dueRows(rows,now){
 return rows.filter(r=>r.dueAt!=null&&['scheduled','sending','retry'].includes(r.state)&&r.dueAt<=now).sort((a,b)=>a.dueAt-b.dueAt||a.createdAt-b.createdAt||a.id.localeCompare(b.id));
}

export function createDraftCopy(clean,id,now){
 return {id,createdAt:now,draft:clean,state:'draft',dueAt:null,attempted:false,receipt:null};
}
