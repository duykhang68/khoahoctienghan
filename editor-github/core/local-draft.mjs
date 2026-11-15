// Browser-safe pure local draft rules. IDs and timestamps are explicit.
export function slugify(value){return String(value).normalize('NFD').replace(/\p{M}/gu,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80).replace(/-+$/,'')||'bai-viet'}

/** @typedef {Readonly<{id:string,kind:string,category:string,title:string,summary:string,body:object,updatedAt:string}>} LocalDraft */
export function createDraft(id,category,updatedAt){return {id,kind:'knowledge',category,title:'',summary:'',body:{type:'doc',content:[{type:'paragraph'}]},updatedAt};}
export function updateDraft(d,key,value,updatedAt){return {...d,[key]:value,updatedAt};}
export function draftRoute(d){return (d.kind==='tech'?'techblog':d.category)+'/'+slugify(d.title)+'/';}
export function readDraftList(raw){const x=JSON.parse(raw||'[]');return Array.isArray(x)?x:[];}
export function putDraft(stored,d){return [d,...stored.filter(x=>x.id!==d.id)].slice(0,30);}
export function libraryMatches(library,space,filter){return library.filter(p=>(space==='all'||p.kind===space)&&p.title.toLocaleLowerCase('vi').includes(filter.toLocaleLowerCase('vi')));}
export function duplicateRoute(library,draft){return library.some(p=>p.route===draftRoute(draft));}
export function wordCount(text){return text.trim().split(/\s+/).filter(Boolean).length;}
export function imageFigure(asset,alt,caption){
 return {type:'articleFigure',content:[{type:'image',attrs:{src:asset.src,alt:alt.trim(),width:asset.width,height:asset.height}},...(caption.trim()?[{type:'articleCaption',content:[{type:'text',text:caption.trim()}]}]:[])]};
}
export function checkedLink(value){const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error();return u.href;}
export function originalDraftKey(blogId){return 'dn-korean-editor-local-v1-'+(blogId||'new');}
export function restorableOriginalDraft(raw){const d=JSON.parse(raw||'null');return d?.dirty&&(d.title||d.html)?d:null;}
export function originalDraftSnapshot({post,title,labels,html,series,driveSchedule,dirty},savedAt){return {post,title,labels,html,series,driveSchedule,dirty,savedAt};}
export function githubDraft({kind,category,title,summary,labels,series,body}){
 return {kind,category,title,summary,labels,series:series.enabled?{...series,part:Number(series.part),total_parts:Number(series.total_parts)}:null,body};
}
