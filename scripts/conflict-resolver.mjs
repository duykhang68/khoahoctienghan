// Conflict Resolver 2.0: immutable Git evidence, not execution of PR code.
import {isDeepStrictEqual} from 'node:util';
import {sensitiveFile} from './engineering-policy.mjs';
export const postsPath='src/data/techblog/posts.json';
export const conflictEligible=p=>!p.draft&&!/^content\/editor-fifo-/.test(p.head?.ref||'')&&!/<!-- editor-fifo-issue:/.test(p.body||'')&&!/\bDO NOT MERGE\b/i.test(p.title||'')&&!/^\s*(?:<!--\s*)?DO NOT MERGE(?:\s*-->)?\s*$/im.test(p.body||'');
const sha=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x);
const regular=e=>e?.type==='blob'&&e.mode==='100644'&&sha(e.sha);
const equal=(a,b)=>!a&&!b||Boolean(a&&b&&a.sha===b.sha&&a.mode===b.mode&&a.type===b.type);
const protectedPath=p=>sensitiveFile(p)||/^(back-office\/|src\/lib\/(?:editor-v2|sheet-blog)\/)/.test(p);
function entries(snapshot){
 if(snapshot?.truncated!==false||!Array.isArray(snapshot.tree))return null;
 const m=new Map();
 for(const e of snapshot.tree){if(typeof e.path!=='string'||m.has(e.path)||!sha(e.sha))return null;m.set(e.path,e);}
 return m;
}
export function analyzeConflict({base,head,main,files}){
 const b=entries(base),h=entries(head),m=entries(main);
 if(!b||!h||!m||!Array.isArray(files)||!files.length||files.length>100)return {kind:'BLOCKED_INCOMPLETE'};
 const changed=[...new Set([...b.keys(),...h.keys()])].filter(p=>{
  const a=b.get(p),z=h.get(p);
  return !(a?.type==='tree'&&z?.type==='tree')&&(a?.type!=='tree'||z&&z.type!=='tree')&&(z?.type!=='tree'||a&&a.type!=='tree')&&!equal(a,z);
 });
 const expected=new Set(files.map(f=>f.filename));
 if(expected.size!==files.length||changed.length!==expected.size||changed.some(p=>!expected.has(p)))return {kind:'BLOCKED_INCOMPLETE'};
 if(files.some(f=>!['added','modified'].includes(f.status)||f.previous_filename||!regular(h.get(f.filename))||(b.has(f.filename)&&!regular(b.get(f.filename)))))return {kind:'RESEARCH_REQUIRED',count:changed.length};
 const exact=changed.filter(p=>equal(h.get(p),m.get(p))).length;
 const unresolved=changed.filter(p=>!equal(h.get(p),m.get(p))&&!equal(b.get(p),m.get(p)));
 if(exact===changed.length)return {kind:changed.some(protectedPath)?'REVIEW_DUPLICATE':'EXACT_DUPLICATE',count:changed.length,exact};
 if(changed.length===1&&changed[0]===postsPath&&regular(b.get(postsPath))&&regular(m.get(postsPath)))return {kind:'TRY_ADDITIVE_POSTS',count:1,exact,blobs:[b.get(postsPath).sha,h.get(postsPath).sha,m.get(postsPath).sha]};
 return {kind:'RESEARCH_REQUIRED',count:changed.length,exact,overlap:unresolved.length};
}
// Allow only additive, unique-slug article records; no edits, reorder or deletions of base records.
function parsePosts(raw){
 if(typeof raw!=='string'||Buffer.byteLength(raw)>5_000_000)return null;
 try{const list=JSON.parse(raw);if(!Array.isArray(list)||!list.every(x=>x&&typeof x==='object'&&!Array.isArray(x)&&typeof x.slug==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x.slug)))return null;const map=new Map(list.map(x=>[x.slug,x]));return map.size===list.length?{list,map}:null}catch{return null}
}
export function mergeAdditivePosts(base,head,main){
 const b=parsePosts(base),h=parsePosts(head),m=parsePosts(main);if(!b||!h||!m)return null;
 const keys=b.list.map(x=>x.slug);
 for(const side of [h,m]){
  if(!isDeepStrictEqual(side.list.filter(x=>b.map.has(x.slug)).map(x=>x.slug),keys)||b.list.some(x=>!isDeepStrictEqual(x,side.map.get(x.slug))))return null;
 }
 const unique=[];
 for(const x of h.list.filter(x=>!b.map.has(x.slug))){
  if(m.map.has(x.slug)){if(!isDeepStrictEqual(x,m.map.get(x.slug)))return null;}else unique.push(x);
 }
 if(!unique.length)return {kind:'REVIEW_DUPLICATE'};
 return {kind:'MERGED',content:JSON.stringify([...m.list,...unique],null,2)+'\n'};
}
export function repairMarker(head,base){if(!sha(head)||!sha(base))throw Error('invalid SHA');return '<!-- resolver-repair:'+head+':'+base+' -->';}
export function verifiedRepair(issue,head,base){return issue?.state==='open'&&issue.user?.login==='github-actions[bot]'&&String(issue.body||'').includes(repairMarker(head,base));}
