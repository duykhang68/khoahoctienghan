// Private device-only IndexedDB. No token, credential or public draft data is persisted.
import {validateCopy,dueRows as selectDueRows,draftCopyLimit,createDraftCopy} from './core/draft-policy.mjs';
export {draftKey,vietnamTime,validateCopy} from './core/draft-policy.mjs';
export const dueRows=(rows,now=Date.now())=>selectDueRows(rows,now);
let opening;
function db(){if(!opening)opening=new Promise((resolve,reject)=>{const req=indexedDB.open('korean-backoffice-private-drafts-v1',1);req.onupgradeneeded=()=>req.result.createObjectStore('copies',{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(Error('Đóng tab đang giữ kho bản nháp.'));}).catch(e=>{opening=null;throw e});return opening;}
async function transaction(mode,fn){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('copies',mode),store=tx.objectStore('copies');let req;try{req=fn(store)}catch(e){tx.abort();reject(e);return}tx.oncomplete=()=>resolve(req?.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Không lưu được bản nháp.'));});}
export const listCopies=()=>transaction('readonly',s=>s.getAll());
export const getCopy=id=>transaction('readonly',s=>s.get(id));
export const putCopy=record=>transaction('readwrite',s=>s.put(record));
export const deleteCopy=id=>transaction('readwrite',s=>s.delete(id));
export async function saveCopy(draft,now=Date.now()){
 const clean=validateCopy(draft);
 if((await listCopies()).length>=draftCopyLimit)throw Error('Tối đa 50 bản sao trên thiết bị.');
 const row=createDraftCopy(clean,crypto.randomUUID(),now);await putCopy(row);return row;
}
export async function withDraftLock(fn){
 if(!navigator.locks?.request)throw Error('Trình duyệt không hỗ trợ khóa nhiều tab; không tự gửi lịch.');
 return navigator.locks.request('korean-backoffice-draft-schedule-v1',{mode:'exclusive'},fn);
}
