import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseIssue,queueHead,submissionId,validateSubmission,prepareQueued,marker,shaPattern,topicIds,authorizedSubmissionEvent} from './editor-v2-queue-policy.mjs';
import {nativePolicyReady,latestRun,ciName} from './engineering-policy.mjs';
import {ciJobsPassed} from './release-recovery.mjs';
import {syncSheetReceipt} from './sheet-writeback.mjs';
const repo='duykhang68/khoahoctienghan',site='https://duykhang68.github.io/khoahoctienghan/';
assert(process.env.GITHUB_REPOSITORY===repo,'Wrong repository');
const {BRANCH_APP_TOKEN,GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON,...env}=process.env;
const cli=(args,token=env.GH_TOKEN,input)=>execFileSync('gh',args,{encoding:'utf8',env:{...env,GH_TOKEN:token},input,stdio:['pipe','pipe','pipe'],maxBuffer:40*1024*1024});
function api(path='',method='GET',data,token=env.GH_TOKEN){const raw=cli(['api','-X',method,'repos/'+repo+(path?'/'+path:''),...(data?['--input','-']:[])],token,data?JSON.stringify(data):undefined);return raw?JSON.parse(raw):null}
function optional(path){try{return api(path)}catch(e){if(String(e.stderr||'').includes('HTTP 404'))return null;throw e}}
const all=path=>JSON.parse(cli(['api','--paginate','--slurp','repos/'+repo+'/'+path])).flat();
const app=(path,method,data)=>{assert(BRANCH_APP_TOKEN,'APP_SETUP_REQUIRED');return api(path,method,data,BRANCH_APP_TOKEN)};
const mainSHA=()=>api('git/ref/heads/main').object.sha;
const blob=sha=>{const file=api('git/blobs/'+sha);assert(file.encoding==='base64','Invalid blob');return Buffer.from(file.content,'base64')};
function body(state,detail){
 const {number,closed,...saved}=state;
 return marker+JSON.stringify(saved)+' -->\n\n**Trạng thái:** '+detail+'\n\nCommit gửi bài: '+saved.source+'\n'+(saved.pr?'Pull request: #'+saved.pr+'\n':'')+(saved.route?'URL: '+site+saved.route+'\n':'')+(saved.merge?'Merge SHA: '+saved.merge+'\n':'')+(saved.verified?'Production SHA: '+saved.verified+'\n':'')+(saved.sheetSync?'Google Sheet content id_vn: '+saved.sheetSync.status+(saved.sheetSync.row?' · VN!A'+saved.sheetSync.row:'')+(saved.sheetSync.code?' · '+saved.sheetSync.code:'')+'\n':'')+'\nFIFO theo số Issue. Không tự đóng Issue chưa xác minh.';
}
function save(state,detail,close=false){const current=api('issues/'+state.number),next=body(state,detail);if(current.body!==next||close&&current.state!=='closed')api('issues/'+state.number,'PATCH',{body:next,...(close?{state:'closed',state_reason:'completed'}:{})});console.log('#'+state.number+' '+detail)}
async function readDraft(source,id){
 assert(shaPattern.test(source),'Invalid SHA');
 const c=api('commits/'+source),f=c.files;
 assert(c.parents?.length===1&&c.commit.message==='content(editor-v2): enqueue '+id&&f?.length===1&&f[0].status==='added'&&f[0].filename==='editor-submissions/'+id+'.json'&&shaPattern.test(f[0].sha),'Submission must contain exactly one immutable draft file');
 return validateSubmission(id,blob(f[0].sha).toString('utf8'));
}
async function enqueue(){
 const event=JSON.parse(readFileSync(env.GITHUB_EVENT_PATH,'utf8')),dispatch=env.GITHUB_EVENT_NAME==='repository_dispatch';
 const ref=dispatch?event.client_payload?.ref:event.ref,source=dispatch?event.client_payload?.sha:event.after,id=submissionId(ref||'');
 assert(authorizedSubmissionEvent(env.GITHUB_ACTOR,env.GITHUB_ACTOR_ID,env.GITHUB_EVENT_NAME,event,env.SCHEDULER_APP_BOT_LOGIN,env.SCHEDULER_APP_BOT_ID)&&id&&shaPattern.test(source),'Not an authorized submission');
 assert(api('git/ref/heads/'+ref.slice('refs/heads/'.length)).object.sha===source,'Submission ref mismatch');
 const prior=all('issues?state=all&per_page=100').map(parseIssue).filter(Boolean).find(s=>s.id===id);
 if(prior){console.log('Already accepted #'+prior.number);return}
 // Fail closed on malformed content, but record an Issue that blocks the queue.
 let title='Bản gửi '+id.slice(0,12),sheetSync;try{const draft=await readDraft(source,id);title=draft.title.trim().replace(/[\r\n]/g,' ').slice(0,150);if(draft.sheetSource)sheetSync={status:'PENDING',attempts:0}}catch{console.log('Submission validation pending/blocked')}
 const state={id,source,phase:'QUEUED'};
 if(sheetSync)state.sheetSync=sheetSync;
 const issue=api('issues','POST',{title:'[Editor V2] '+title,body:body(state,'QUEUED — Chờ đến lượt')});
 console.log('Accepted #'+issue.number);
}
async function firstParentContains(ancestor,tip){
 for(let i=0;i<150&&shaPattern.test(tip);i++){if(tip===ancestor)return true;tip=api('git/commits/'+tip).parents?.[0]?.sha}
 return false;
}
async function productionVerified(s){
 const resp=await fetch(site+'release-sha.json?v='+Date.now(),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!resp.ok)return null;const tip=(await resp.json()).sha;
 if(!shaPattern.test(tip)||!await firstParentContains(s.merge,tip))return null;
 const runs=api('actions/workflows/release.yml/runs?branch=main&head_sha='+tip+'&per_page=30').workflow_runs;
 const releases=runs.filter(x=>x.head_sha===tip&&x.conclusion==='success'&&x.head_repository?.full_name===repo);
 let released=false;
 for(const release of releases){const jobs=api('actions/runs/'+release.id+'/jobs?per_page=100').jobs;if(['prepare','deploy','verify'].every(name=>jobs.some(j=>j.name===name&&j.conclusion==='success'))){released=true;break}}
 if(!released)return null;
 const url=await fetch(site+s.route+'?v='+tip,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!url.ok)return null;
 // The marker must still identify the same deployed artifact after the route request.
 const again=await fetch(site+'release-sha.json?v='+Date.now(),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
 return again.ok&&(await again.json()).sha===tip?tip:null;
}
const branchOf=s=>'content/editor-fifo-'+s.number+'-'+s.base.slice(0,12);
function findPR(s){if(s.pr)return api('pulls/'+s.pr);if(!s.head)return null;return api('pulls?state=all&head=duykhang68:'+encodeURIComponent(branchOf(s))+'&base=main&per_page=100')[0]||null}
function validatePR(p,s){assert(p.head?.repo?.full_name===repo&&p.head.ref===branchOf(s)&&p.head.sha===s.head&&p.base.ref==='main'&&p.body==='<!-- editor-fifo-issue:'+s.number+' -->','Queue PR was altered; manual review required')}
async function syncVerified(s){
 if(s.phase!=='VERIFIED'||!s.closed||!s.sheetSync||!['PENDING','WAITING_CONFIG'].includes(s.sheetSync.status))return;
 // Recheck live deployment evidence, and reload the immutable source from its verified digest.
 if(!await productionVerified(s))return;
 const draft=await readDraft(s.source,s.id);
 const next=await syncSheetReceipt(s,draft,GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON);
 if(next){s.sheetSync=next;save(s,'VERIFIED — Bài đã lên production',true)}
}
async function reconcile(){
 const receipts=all('issues?state=all&per_page=100').map(parseIssue).filter(Boolean);
 for(const s of receipts.filter(s=>s.phase==='VERIFIED'&&s.closed&&['PENDING','WAITING_CONFIG'].includes(s.sheetSync?.status)).slice(0,8)){
  try{await syncVerified(s)}catch{console.error('Sheet synchronization deferred #'+s.number)}
 }
 for(let count=0;count<8;count++){
  const head=queueHead(all('issues?state=all&per_page=100'));if(!head)return console.log('Queue empty');
  if(head.closed)return save(head,'BLOCKED — Issue đóng trước khi xác minh; mở lại để tiếp tục');
  try{await advance(head)}catch(e){console.error('Queue stopped at #'+head.number+' ('+(String(e.message).includes('APP_SETUP_REQUIRED')?'APP_SETUP_REQUIRED':'validation, GitHub, CI or production check')+')');return save(head,'BLOCKED — Kiểm tra log workflow; không bỏ qua bài đầu')}
  const fresh=parseIssue(api('issues/'+head.number));if(fresh.phase!=='VERIFIED')return;
  try{await syncVerified(fresh)}catch{console.error('Sheet synchronization deferred #'+fresh.number)}
 }
}
async function advance(s){
 if(s.phase==='MERGED'){
  const verified=await productionVerified(s);
  if(verified){s.phase='VERIFIED';s.verified=verified;return save(s,'VERIFIED — Bài đã lên production',true)}
  return save(s,'MERGED — Chờ production xác minh');
 }
 const draft=await readDraft(s.source,s.id),main=mainSHA();
 let pr=findPR(s);
 if(pr){validatePR(pr,s);s.pr=pr.number;if(pr.merged){assert(shaPattern.test(pr.merge_commit_sha),'Missing merge sha');s.phase='MERGED';s.merge=pr.merge_commit_sha;return save(s,'MERGED — Chờ production xác minh')}}
 // Regenerate an unmodified, queue-owned PR if an unrelated main change races it.
 if(s.head&&s.base!==main){
  if(pr?.state==='closed'&&!s.rebuild)return save(s,'BLOCKED — PR bị đóng thủ công');
  s.rebuild=true;save(s,'QUEUED — Chuẩn bị lại theo main mới');
  if(pr?.state==='open'){assert(BRANCH_APP_TOKEN,'APP_SETUP_REQUIRED');app('pulls/'+pr.number,'PATCH',{state:'closed'})}
  for(const k of ['head','base','pr','rebuild','route'])delete s[k];s.phase='QUEUED';save(s,'QUEUED — Tạo lại từ nội dung gốc');pr=null;
 }
 if(!s.head){
  assert(BRANCH_APP_TOKEN,'APP_SETUP_REQUIRED');
  const commit=api('git/commits/'+main),tree=api('git/trees/'+commit.tree.sha+'?recursive=1');
  assert(!tree.truncated,'Incomplete tree');
  const paths=tree.tree.filter(f=>f.type==='blob').map(f=>f.path);
  const content=path=>{const item=tree.tree.find(x=>x.path===path&&x.type==='blob');assert(item,'Missing '+path);return blob(item.sha).toString('utf8')};
  const snapshot={paths,posts:JSON.parse(content('src/data/techblog/posts.json')),documents:JSON.parse(content('src/data/studio-documents.json')),metadata:JSON.parse(content('src/data/studio-metadata.json')),categorySource:draft.kind==='knowledge'?content('src/content/docs/'+draft.category+'/index.md'):null};
  const issue=api('issues/'+s.number),prepared=await prepareQueued(draft,snapshot,issue.created_at),entries=[];
  for(const [path,value] of prepared.changes){if(value.binary){const b=app('git/blobs','POST',{content:value.binary,encoding:'base64'});entries.push({path,mode:'100644',type:'blob',sha:b.sha})}else entries.push({path,mode:'100644',type:'blob',content:value.text})}
  const nextTree=app('git/trees','POST',{base_tree:commit.tree.sha,tree:entries}),next=app('git/commits','POST',{message:'content: publish Editor V2 issue #'+s.number,tree:nextTree.sha,parents:[main]});
  s.base=main;s.head=next.sha;s.route=prepared.route;s.phase='WAITING_CI';save(s,'WAITING_CI — Chuẩn bị PR');
 }
 if(!pr){
  assert(BRANCH_APP_TOKEN,'APP_SETUP_REQUIRED');
  if(mainSHA()!==s.base)return save(s,'QUEUED — Main đổi, chờ reconcile');
  const branch=branchOf(s),existing=optional('git/ref/heads/'+branch);
  if(existing)assert(existing.object.sha===s.head,'Queue branch was changed');
  else app('git/refs','POST',{ref:'refs/heads/'+branch,sha:s.head});
  pr=app('pulls','POST',{title:'content: '+draft.title.trim(),base:'main',head:branch,draft:false,body:'<!-- editor-fifo-issue:'+s.number+' -->'});
  validatePR(pr,s);s.pr=pr.number;return save(s,'WAITING_CI — Chờ native PR CI');
 }
 if(pr.state!=='open'||pr.draft)return save(s,'BLOCKED — PR không mở hoặc đang Draft');
 if(pr.mergeable!==true||mainSHA()!==s.base)return save(s,'WAITING_CI — Chờ GitHub xác định khả năng merge');
 const runs=api('actions/workflows/ci.yml/runs?head_sha='+s.head+'&per_page=30').workflow_runs;
 const run=latestRun(runs,s.head,repo,['pull_request'],pr.head.ref);
 if(!run||run.status!=='completed')return save(s,'WAITING_CI — Chờ native PR CI');
 if(run.conclusion!=='success')return save(s,'BLOCKED — Native CI '+run.conclusion);
 if(!ciJobsPassed(api('actions/runs/'+run.id+'/jobs?per_page=100').jobs,run.event))return save(s,'BLOCKED — Chưa đủ CI gates');
 if(!nativePolicyReady(api(),api('rules/branches/main')))return save(s,'BLOCKED — Repository rules chưa sẵn sàng');
 const fresh=api('pulls/'+s.pr);validatePR(fresh,s);
 if(fresh.state!=='open'||fresh.draft||fresh.mergeable!==true||mainSHA()!==s.base)return save(s,'WAITING_CI — HEAD/base thay đổi');
 const merged=api('pulls/'+s.pr+'/merge','PUT',{sha:s.head,merge_method:'squash',commit_title:'content: publish Editor V2 issue #'+s.number});
 assert(merged.merged&&shaPattern.test(merged.sha),'Merge not confirmed');
 s.phase='MERGED';s.merge=merged.sha;save(s,'MERGED — Chờ production xác minh');
 // Repository GITHUB_TOKEN pushes do not trigger CI. Existing release automation also recovers missing runs.
 const current=mainSHA();api('actions/workflows/ci.yml/dispatches','POST',{ref:'main'});console.log('Requested main CI '+current);
}
const mode=process.argv[2];if(mode==='enqueue')await enqueue();else if(mode==='reconcile')await reconcile();else throw Error('Unknown queue command');
