const repo='duykhang68/khoahoctienghan',api='https://api.github.com/repos/'+repo;
const sha=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x),digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x),positive=x=>Number.isSafeInteger(x)&&x>0;
export const stages=['Gửi commit','Issue FIFO','CI / Build','Merge','Deploy','Xác minh'];
export function parseQueueIssue(issue){
 if(issue?.pull_request||issue?.user?.login!=='github-actions[bot]'||!positive(issue?.number))return null;
 const prefix='<!-- editor-v2-fifo:',line=String(issue.body||'').split('\n')[0];
 if(!line.startsWith(prefix)||!line.endsWith(' -->'))return null;
 let s;try{s=JSON.parse(line.slice(prefix.length,-4))}catch{return null}
 if(!s||!digest(s.id)||!sha(s.source)||!['QUEUED','WAITING_CI','MERGED','VERIFIED'].includes(s.phase))return null;
 const detail=String(issue.body||'').split('\n').find(l=>l.startsWith('**Trạng thái:** '))?.slice('**Trạng thái:** '.length).trim()||'';
 return {id:s.id,source:s.source,phase:s.phase,number:issue.number,title:String(issue.title||'').replace(/^\[Editor V2\]\s*/,''),closed:issue.state==='closed',detail,head:sha(s.head)?s.head:null,base:sha(s.base)?s.base:null,merge:sha(s.merge)?s.merge:null,verified:sha(s.verified)?s.verified:null,pr:positive(s.pr)?s.pr:null,route:typeof s.route==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(s.route)?s.route:null};
}
export function progressFor(item,evidence={}){
 if(!item.number)return {done:1,status:'Chờ GitHub tiếp nhận Issue',tone:'waiting'};
 if(item.phase==='VERIFIED'&&item.closed&&item.merge&&item.verified&&item.route&&item.pr)return {done:6,status:'Đã xác minh production',tone:'success'};
 const {ci,cd,deploy}=evidence;
 let done=2,status='Đang chờ đến lượt',tone='waiting';
 if(item.phase==='WAITING_CI'){
  status='Chờ CI / Build';
  if(ci?.status==='in_progress'){status='CI / Build đang chạy';tone='running'}
  else if(ci?.status==='completed'&&ci.conclusion==='success'){done=3;status='CI thành công · Chờ merge';tone='running'}
  else if(ci?.status==='completed'&&['failure','timed_out','action_required'].includes(ci.conclusion)){status='CI chưa đạt';tone='blocked'}
 }
 if(item.phase==='MERGED'||item.phase==='VERIFIED'){
  if(item.merge){done=4;status='Đã merge · Chờ deploy'
   if(deploy?.status==='in_progress'){status='Đang deploy';tone='running'}
   else if(deploy?.status==='completed'&&deploy.conclusion==='success'){done=5;status='Đã deploy · Chờ xác minh production';tone='running'}
   else if(cd?.status==='in_progress'){status='CD đang xử lý';tone='running'}
   if(cd?.status==='completed'&&['failure','timed_out','action_required'].includes(cd.conclusion)){status='CD chưa đạt';tone='blocked'}
  }else{status='Chưa đủ bằng chứng merge';tone='blocked'}
  if(item.phase==='VERIFIED'){status='Marker chưa đủ bằng chứng xác minh';tone='blocked'}
 }
 if(item.closed||item.detail?.startsWith('BLOCKED')){status=item.closed?'Issue đã đóng nhưng chưa xác minh':'Bị chặn · Kiểm tra Issue';tone='blocked'}
 return {done,status,tone};
}
export function queueClient(fetcher=fetch){
 const get=async path=>{
  const response=await fetcher(api+path,{headers:{Accept:'application/vnd.github+json'},credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('GitHub HTTP '+response.status);
  return response.json();
 };
 async function list(){
  const all=[];
  for(let p=1;p<=20;p++){
   const items=await get('/issues?state=all&per_page=100&sort=created&direction=asc&page='+p);
   if(!Array.isArray(items))throw Error('Dữ liệu Issue không hợp lệ');
   all.push(...items);
   if(items.length<100)return all.map(parseQueueIssue).filter(Boolean).sort((a,b)=>a.number-b.number);
  }
  throw Error('Danh sách Issue vượt giới hạn tải an toàn');
 }
 async function evidence(item){
  const latest=(runs,hash,events,branch)=>runs.filter(r=>r.head_sha===hash&&r.head_repository?.full_name===repo&&r.head_branch===branch&&events.includes(r.event)).sort((a,b)=>b.id-a.id)[0];
  if(item.phase==='WAITING_CI'&&item.head&&item.base&&item.pr){
   const x=await get('/actions/workflows/ci.yml/runs?head_sha='+item.head+'&per_page=30');
   return {ci:latest(x.workflow_runs||[],item.head,['pull_request'],'content/editor-fifo-'+item.number+'-'+item.base.slice(0,12))};
  }
  if(item.phase==='MERGED'&&item.merge){
   const x=await get('/actions/workflows/release.yml/runs?head_sha='+item.merge+'&per_page=30');
   const cd=latest(x.workflow_runs||[],item.merge,['workflow_run','workflow_dispatch'],'main');
   if(positive(cd?.id)){const jobs=await get('/actions/runs/'+cd.id+'/jobs?per_page=100');return {cd,deploy:(jobs.jobs||[]).find(j=>j.name==='deploy')}}
   return {cd};
  }
  return {};
 }
 return {list,evidence};
}
