import {requireValue,validText} from './contracts.mjs';
import {slugify,metadata} from './metadata.mjs';
import {docText} from './document.mjs';
/** Publication decisions use a caller-supplied timestamp, document and resolved assets. */
export function publicationInputs(draft,now){
 const title=String(draft.title||'').trim(),summary=String(draft.summary||'').trim()||title,slug=slugify(title);
 requireValue(validText(title,180)&&summary.length<=500&&slug&&slug!=='index'&&slug!=='editorv2','Tiêu đề, mô tả hoặc URL không hợp lệ.');
 requireValue(['tech','knowledge'].includes(draft.kind),'Nơi xuất bản không hợp lệ.');
 const date=new Date(now.getTime()+7*3600000).toISOString().slice(0,19)+'+07:00';
 const extra=metadata(draft);
 return {title,summary,slug,date,extra};
}
export function planPublication(draft,snapshot,topicIds,{title,summary,slug,date,extra},{body,assets}){
 const paths=new Set(snapshot.paths),changes=new Map();
 for(const [path,binary] of assets)if(!paths.has(path))changes.set(path,{binary});
 let route;
 if(draft.kind==='tech'){
  requireValue(!snapshot.posts.some(p=>p.slug===slug),'URL đã tồn tại.');
  route='techblog/'+slug+'/';
  const post={slug,title,summary,date,sections:[{heading:'Nội dung',paragraphs:[docText(body)]}],issues:[],studioBody:body,...extra};
  changes.set('src/data/techblog/posts.json',{text:JSON.stringify([...snapshot.posts,post],null,2)+'\n'});
 }else{
  const category=draft.category;requireValue(topicIds.includes(category),'Chuyên mục không hợp lệ.');
  const stem='src/content/docs/'+category+'/'+slug,id=category+'--'+slug,index='src/content/docs/'+category+'/index.md';
  requireValue(!paths.has(stem+'.md')&&!paths.has(stem+'.mdx')&&!Object.hasOwn(snapshot.documents,id)&&!Object.hasOwn(snapshot.metadata,id),'URL đã tồn tại.');
  requireValue(paths.has(index)&&typeof snapshot.categorySource==='string','Thiếu trang chuyên mục.');
  route=category+'/'+slug+'/';
  changes.set(stem+'.mdx',{text:'---\ntitle: '+JSON.stringify(title)+'\ndescription: '+JSON.stringify(summary)+'\n---\n\nimport KnowledgeStudioDocument from "../../../components/KnowledgeStudioDocument.astro";\n\n<KnowledgeStudioDocument id="'+id+'" />\n'});
  changes.set('src/data/studio-documents.json',{text:JSON.stringify({...snapshot.documents,[id]:body},null,2)+'\n'});
  changes.set('src/data/studio-metadata.json',{text:JSON.stringify({...snapshot.metadata,[id]:{...extra,date}},null,2)+'\n'});
  const label=title.replace(/[\\[\]<>*_\x60{}&]/g,c=>'&#'+c.charCodeAt(0)+';');
  changes.set(index,{text:snapshot.categorySource.trimEnd()+'\n\n- ['+label+'](/khoahoctienghan/'+route+')\n'});
 }
 return {route,changes};
}
