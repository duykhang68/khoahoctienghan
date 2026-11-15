import assert from 'node:assert/strict';
export const shaPattern=/^[a-f0-9]{40}$/;
export const idPattern=/^[a-f0-9]{64}$/;
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
