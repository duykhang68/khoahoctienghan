import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareV2,buildDocument} from '../src/lib/editor-v2/model.mjs';
import {normalizeDocument,assertImageFiles} from '../src/lib/studio-document.mjs';
import {normalizeMetadata} from '../src/lib/studio-metadata.mjs';
import {validateSheetSource} from '../src/lib/sheet-blog/source.mjs';
import {shaPattern,idPattern,marker,parseIssue} from '../core/publication/issue-state.mjs';
export {shaPattern,idPattern,marker,parseIssue} from '../core/publication/issue-state.mjs';
export const topicIds=['ngon-ngu','lich-su','van-hoa','am-thuc','dia-ly-du-lich','kinh-te-cong-nghe','giao-duc-du-hoc','hallyu','doi-song','the-che'];
export function queueHead(issues){return issues.map(parseIssue).filter(Boolean).filter(s=>s.phase!=='VERIFIED').sort((a,b)=>a.number-b.number)[0]}
export function submissionId(ref){return /^refs\/heads\/content\/editor-v2-([a-f0-9]{64})$/.exec(ref)?.[1]||null}
export async function validateSubmission(id,raw){
 assert(idPattern.test(id)&&Buffer.byteLength(raw)<=8_000_000&&createHash('sha256').update(raw).digest('hex')===id,'Submission digest mismatch');
 const payload=JSON.parse(raw);assert(payload?.version===1&&payload.draft&&['tech','knowledge'].includes(payload.draft.kind),'Invalid submission schema');
 const draft=payload.draft;assert(typeof draft.title==='string'&&typeof draft.summary==='string','Invalid title or summary');
 if(draft.sheetSource!==undefined)validateSheetSource(draft.sheetSource);
 if(draft.kind==='knowledge')assert(topicIds.includes(draft.category),'Invalid category');
 const {body,assets}=await buildDocument(draft.blocks);
 const normalized=normalizeDocument(body);
 assertImageFiles(normalized,path=>Buffer.from(assets.get(path),'base64'));
 return draft;
}
export async function prepareQueued(draft,snapshot,acceptedAt){
 const prepared=await prepareV2(draft,snapshot,topicIds,new Date(acceptedAt));
 // The trusted Astro CI validates the full resulting files; preflight the projected body too.
 const {body}=await buildDocument(draft.blocks);normalizeDocument(body);
 for(const [path,value] of prepared.changes){
  if(path==='src/data/techblog/posts.json'){const post=JSON.parse(value.text).at(-1);normalizeMetadata(post)}
  else if(path==='src/data/studio-metadata.json')for(const item of Object.values(JSON.parse(value.text)))normalizeMetadata(item);
 }
 return prepared;
}

export function authorizedSubmissionEvent(actor,actorId,eventName,event,botLogin='',botId=''){
 if(actor==='duykhang68')return eventName==='repository_dispatch'||(eventName==='push'&&event?.created===true&&!event.deleted);
 // Only the owner-configured dedicated GitHub App may dispatch; never trust a payload-supplied actor or a bot push.
 return eventName==='repository_dispatch'&&/^[a-z0-9-]+\[bot\]$/.test(botLogin)&&/^[1-9][0-9]*$/.test(botId)&&actor===botLogin&&String(actorId)===botId&&event?.sender?.type==='Bot'&&event.sender.login===botLogin&&String(event.sender.id)===botId;
}
