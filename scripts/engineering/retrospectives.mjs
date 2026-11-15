import {readFileSync} from 'node:fs';
import {incidentPublication,hasVerifiedRun,alreadyPublished,editorPublicationPending} from '../incident-publication.mjs';
export function reconcileRetrospectives({repo,issues,prs,api,hasMarker}){
// One incident, one retrospective. The scheduled Researcher authors the content PR.
try{
 const posts=JSON.parse(readFileSync('src/data/techblog/posts.json','utf8'));
 const pending=editorPublicationPending(issues);
 if(pending)console.log('RETROSPECTIVES_DEFERRED: Editor V2 publication FIFO has an unverified request');
 for(const issue of pending?[]:issues){
  const record=incidentPublication(issue,repo);
  if(!record||alreadyPublished(record,posts,prs))continue;
  const marker='<!-- techblog-incident:'+record.number+' -->';
  if(issues.some(x=>hasMarker(x,marker)))continue;
  let evidence=[];
  for(const id of record.runIds.slice(0,20)){try{evidence.push(api('actions/runs/'+id))}catch{}}
  if(!hasVerifiedRun(record,evidence,repo)){console.log('BLOG_BLOCKED #'+record.number+' · no exact successful run');continue}
  // Only trusted source facts, no issue body or raw logs copied into a public candidate.
  issues.push(api('issues','POST',{title:'[Tech Blog] Bugfix retrospective #'+record.number,body:marker+'\n\nSource: https://github.com/'+repo+'/issues/'+record.number+'\nVerified SHA: '+record.sha+'\n\nResearcher: verify root cause, fix, regression, official sources and deployment if applicable; write one Vietnamese article at slug '+record.slug+' via content PR. Confirm lesson record, do not publish sensitive material or invent evidence.'}));
  console.log('BLOG_QUEUED #'+record.number);
 }
}catch{console.log('BLOG_RECONCILIATION_DEFERRED');}
}
