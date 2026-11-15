// Private device-only IndexedDB. No token, credential or public draft data is persisted.
export const draftKey=kind=>'khoahoctienghan.editor-v2.draft.v2.'+kind;
const kinds=['tech','knowledge'],limit=50;
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
export function dueRows(rows,now=Date.now()){
 return rows.filter(r=>r.dueAt!=null&&['scheduled','sending','retry'].includes(r.state)&&r.dueAt<=now).sort((a,b)=>a.dueAt-b.dueAt||a.createdAt-b.createdAt||a.id.localeCompare(b.id));
}
let opening;
function db(){if(!opening)opening=new Promise((resolve,reject)=>{const req=indexedDB.open('korean-backoffice-private-drafts-v1',1);req.onupgradeneeded=()=>req.result.createObjectStore('copies',{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(Error('Đóng tab đang giữ kho bản nháp.'));}).catch(e=>{opening=null;throw e});return opening;}
async function transaction(mode,fn){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('copies',mode),store=tx.objectStore('copies');let req;try{req=fn(store)}catch(e){tx.abort();reject(e);return}tx.oncomplete=()=>resolve(req?.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Không lưu được bản nháp.'));});}
export const listCopies=()=>transaction('readonly',s=>s.getAll());
export const getCopy=id=>transaction('readonly',s=>s.get(id));
export const putCopy=record=>transaction('readwrite',s=>s.put(record));
export const deleteCopy=id=>transaction('readwrite',s=>s.delete(id));
export async function saveCopy(draft,now=Date.now()){
 const clean=validateCopy(draft);
 if((await listCopies()).length>=limit)throw Error('Tối đa 50 bản sao trên thiết bị.');
 const row={id:crypto.randomUUID(),createdAt:now,draft:clean,state:'draft',dueAt:null,attempted:false,receipt:null};await putCopy(row);return row;
}
export async function withDraftLock(fn){
 if(!navigator.locks?.request)throw Error('Trình duyệt không hỗ trợ khóa nhiều tab; không tự gửi lịch.');
 return navigator.locks.request('korean-backoffice-draft-schedule-v1',{mode:'exclusive'},fn);
}
