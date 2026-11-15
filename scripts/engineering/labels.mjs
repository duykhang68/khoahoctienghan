import {labelDefinitions,labelEligible,inferPRLabels} from '../pr-labels.mjs';
export function reconcileLabels({prs,event,repo,api,all,changed}){
// Labels are metadata only. Recover missed close events without scanning old history.
try{
 const candidates=new Map(prs.filter(p=>labelEligible(p,repo)).map(p=>[p.number,p]));
 const e=event.pull_request;
 if(e&&labelEligible(e,repo))candidates.set(e.number,e);
 const recent=api('pulls?state=closed&base=main&sort=updated&direction=desc&per_page=20');
 for(const p of recent){
  if(p.merged_at&&Date.now()-Date.parse(p.merged_at)<86400000&&labelEligible(p,repo)&&!p.labels?.length)candidates.set(p.number,p);
 }
 const definitions=new Map(all('labels?per_page=100').map(l=>[l.name,l]));
 for(const p of candidates.values()){
  try{
   const current=api('pulls/'+p.number);
   if(!labelEligible(current,repo)||current.state==='closed'&&!current.merged_at)continue;
   const wanted=inferPRLabels(current,changed(current));
   const existing=new Set((current.labels||[]).map(l=>l.name));
   const missing=wanted.filter(name=>!existing.has(name));
   for(const name of wanted){
    const def=labelDefinitions[name];
    const old=definitions.get(name);
    if(!old){
     const created=api('labels','POST',{name,...def});definitions.set(name,created);
    }else if(['techblog','engineering','automation'].includes(name)&&old.color==='ededed'&&!old.description){
     // Upgrade only the default gray labels just bootstrapped by the metadata API.
     const updated=api('labels/'+encodeURIComponent(name),'PATCH',def);definitions.set(name,updated);
    }
   }
   if(missing.length){api('issues/'+p.number+'/labels','POST',{labels:missing});console.log('LABELLED PR #'+p.number+' · '+missing.join(', '));}
  }catch{console.log('LABEL_DEFERRED PR #'+p.number);}
 }
}catch{console.log('LABEL_RECONCILIATION_DEFERRED');}
}
