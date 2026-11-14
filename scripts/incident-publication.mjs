// Only verified engineering incidents may queue one standalone retrospective.
export function incidentPublication(issue,repo){
 const body=String(issue.body||'');
 if(issue.pull_request||issue.state!=='closed'||issue.state_reason!=='completed'||!['duykhang68','github-actions[bot]'].includes(issue.user?.login)||!body.includes('<!-- engineering-incident:v1 -->'))return null;
 if(!Number.isSafeInteger(issue.number)||issue.number<1)return null;
 const markers=[...body.matchAll(/<!-- verified-sha: ([a-f0-9]{40}) -->/g)];
 if(markers.length!==1||/<!-- (?:superseded|duplicate|not-a-bug|unverified) -->/i.test(body))return null;
 const links=[...body.matchAll(/https:\/\/github\.com\/duykhang68\/khoahoctienghan\/actions\/runs\/(\d+)(?=\/|\s|[.)\]]|$)/g)].map(m=>Number(m[1])).filter(Number.isSafeInteger);
 if(repo!=='duykhang68/khoahoctienghan'||!links.length)return null;
 return {number:issue.number,sha:markers[0][1],runIds:[...new Set(links)],slug:'bugfix-issue-'+issue.number};
}
export function hasVerifiedRun(record,runs,repo){
 return runs.some(r=>record.runIds.includes(r.id)&&r.head_sha===record.sha&&r.head_repository?.full_name===repo&&r.status==='completed'&&r.conclusion==='success'&&['P0 · Knowledge Base CI','CD · Public Knowledge Base'].includes(r.name));
}
export function alreadyPublished(record,posts,prs){
 return posts.some(p=>p.slug===record.slug)||prs.some(p=>p.head?.ref==='techblog/'+record.slug||p.head?.ref==='docs/'+record.slug);
}
