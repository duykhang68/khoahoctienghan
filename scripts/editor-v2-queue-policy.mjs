import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareV2,buildDocument} from '../src/lib/editor-v2/model.mjs';
import {normalizeDocument,assertImageFiles} from '../src/lib/studio-document.mjs';
import {normalizeMetadata} from '../src/lib/studio-metadata.mjs';
import {validateSheetSource} from '../src/lib/sheet-blog/source.mjs';
export const shaPattern=/^[a-f0-9]{40}$/;
export const idPattern=/^[a-f0-9]{64}$/;
export const topicIds=['ngon-ngu','lich-su','van-hoa','am-thuc','dia-ly-du-lich','kinh-te-cong-nghe','giao-duc-du-hoc','hallyu','doi-song','the-che'];
export const marker='<!-- editor-v2-fifo:';
export function parseIssue(issue){
 if(issue.pull_request||issue.user?.login!=='github-actions[bot]')return null;
 const line=String(issue.body||'').split('\n')[0];
 if(!line.startsWith(marker)||!line.endsWith(' -->'))return null;
 const state=JSON.parse(line.slice(marker.length,-4));
 assert(idPattern.test(state.id)&&shaPattern.test(state.source)&&['QUEUED','WAITING_CI','MERGED','VERIFIED'].includes(state.phase),'Invalid queue marker');
 for(const k of ['base','head','merge','verified'])if(state[k]!==undefined)assert(shaPattern.test(state[k]),'Invalid queue SHA');
 if(state.pr!==undefined)assert(Number.isSafeInteger(state.pr)&&state.pr>0,'Invalid PR number');
 if(state.route!==undefined)assert(/^(?:techblog|ngon-ngu|lich-su|van-hoa|am-thuc|dia-ly-du-lich|kinh-te-cong-nghe|giao-duc-du-hoc|hallyu|doi-song|the-che)\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(state.route),'Invalid article route');
 if(state.sheetSync!==undefined){
  const sync=state.sheetSync;
  assert(['PENDING','WAITING_CONFIG','SYNCED','BLOCKED'].includes(sync.status)&&Number.isInteger(sync.attempts)&&sync.attempts>=0&&sync.attempts<=3,'Invalid Sheet sync state');
  if(sync.commit!==undefined)assert(shaPattern.test(sync.commit)&&sync.commit===state.merge,'Invalid Sheet commit');
  if(sync.row!==undefined)assert(Number.isInteger(sync.row)&&sync.row>=2&&sync.row<=20000,'Invalid Sheet row');
  if(sync.code!==undefined)assert(/^[A-Z_0-9]{1,50}$/.test(sync.code),'Invalid Sheet sync code');
 }
 return {...state,number:issue.number,closed:issue.state==='closed'};
}
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
