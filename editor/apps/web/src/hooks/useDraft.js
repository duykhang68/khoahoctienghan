import {useEffect,useState,useRef} from 'react';
import {createDraft,updateDraft} from '../../../../../editor-github/core/local-draft.mjs';
import {readDrafts,saveDraft} from '../adapters/draft-storage.mjs';
export function useDraft(category,setStatus){
 const blank=()=>createDraft(crypto.randomUUID(),category,new Date().toISOString());
 const [drafts,setDrafts]=useState(()=>readDrafts(localStorage)),[draft,setDraft]=useState(()=>readDrafts(localStorage)[0]||blank());
 const draftRef=useRef(draft);draftRef.current=draft;
 const save=(d=draftRef.current)=>{try{const next=saveDraft(localStorage,d);setDrafts(next);setStatus('Đã lưu local');return true}catch{setStatus('Bộ nhớ đầy. Hãy giữ tab mở và tải bản sao lưu.');return false}};
 useEffect(()=>{const timer=setTimeout(()=>save(draft),600);return()=>clearTimeout(timer)},[draft]);
 const edit=(key,value)=>setDraft(d=>updateDraft(d,key,value,new Date().toISOString()));
 return {drafts,draft,setDraft,draftRef,blank,save,edit};
}
