import {parseIssue} from './issue-state.mjs';
export function queueHead(issues){return issues.map(parseIssue).filter(Boolean).filter(s=>s.phase!=='VERIFIED').sort((a,b)=>a.number-b.number)[0]}
export function submissionId(ref){return /^refs\/heads\/content\/editor-v2-([a-f0-9]{64})$/.exec(ref)?.[1]||null}
export function authorizedSubmissionEvent(actor,actorId,eventName,event,botLogin='',botId=''){
 if(actor==='duykhang68')return eventName==='repository_dispatch'||(eventName==='push'&&event?.created===true&&!event.deleted);
 // Only the owner-configured dedicated GitHub App may dispatch; never trust a payload-supplied actor or a bot push.
 return eventName==='repository_dispatch'&&/^[a-z0-9-]+\[bot\]$/.test(botLogin)&&/^[1-9][0-9]*$/.test(botId)&&actor===botLogin&&String(actorId)===botId&&event?.sender?.type==='Bot'&&event.sender.login===botLogin&&String(event.sender.id)===botId;
}

export function receiptCandidates(receipts){return receipts.filter(s=>s.phase==='VERIFIED'&&s.closed&&['PENDING','WAITING_CONFIG'].includes(s.sheetSync?.status)).slice(0,8);}
export function maySyncReceipt(s){return s.phase==='VERIFIED'&&s.closed&&s.sheetSync&&['PENDING','WAITING_CONFIG'].includes(s.sheetSync.status);}
