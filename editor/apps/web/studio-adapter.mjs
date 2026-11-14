import assert from 'node:assert/strict';
import {normalizeMetadata} from '../../../src/lib/studio-metadata.mjs';
import {normalizeDocument,documentText,slugPattern} from '../../../src/lib/studio-document.mjs';
const topics=new Set(['ngon-ngu','lich-su','van-hoa','am-thuc','dia-ly-du-lich','kinh-te-cong-nghe','giao-duc-du-hoc','hallyu','doi-song','the-che']);
export function slugify(value){return String(value).normalize('NFD').replace(/\p{M}/gu,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80).replace(/-+$/,'')||'bai-viet'}
export function prepareArticle(draft,snapshot){
 assert(draft&&['knowledge','tech'].includes(draft.kind)&&typeof draft.title==='string'&&draft.title.trim()&&draft.title.length<=180,'Thiếu tiêu đề');
 assert(typeof draft.summary==='string'&&draft.summary.length<=500,'Mô tả quá dài');
 const title=draft.title.trim(),summary=draft.summary.trim()||title,slug=slugify(title),assets=new Map(),body=normalizeDocument(draft.body,{assets});
 assert(documentText(body).trim()||assets.size,'Bài viết chưa có nội dung');
 const metadata=normalizeMetadata(draft);
 const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date()).replace(' ','T')+'+07:00';
 const paths=new Set(snapshot.paths),changes=new Map();
 for(const [path,bytes] of assets)if(!paths.has(path))changes.set(path,{binary:bytes});
 let route;
 if(draft.kind==='tech'){
  assert(!snapshot.posts.some(p=>p.slug===slug),'URL đã tồn tại');
  const post={slug,title,summary,date,sections:[{heading:'Nội dung',paragraphs:[documentText(body)]}],issues:[],studioBody:body,...metadata};changes.set('src/data/techblog/posts.json',{text:JSON.stringify([...snapshot.posts,post],null,2)+'\n'});route='techblog/'+slug+'/';
 }else{
  assert(topics.has(draft.category)&&slug!=='index','Chuyên mục hoặc URL không hợp lệ');const stem='src/content/docs/'+draft.category+'/'+slug;
  assert(!paths.has(stem+'.md')&&!paths.has(stem+'.mdx'),'URL đã tồn tại');
  const id=draft.category+'--'+slug;assert(!Object.hasOwn(snapshot.documents,id),'Document already exists');
  const index='src/content/docs/'+draft.category+'/index.md';const source=snapshot.categorySource;assert(typeof source==='string'&&paths.has(index),'Chuyên mục chưa hỗ trợ');
  const label=title.replace(/[\\[\]<>*_\x60{}&]/g,c=>'&#'+c.charCodeAt(0)+';');
  route=draft.category+'/'+slug+'/';
  changes.set(stem+'.mdx',{text:'---\ntitle: '+JSON.stringify(title)+'\ndescription: '+JSON.stringify(summary)+'\n---\n\nimport KnowledgeStudioDocument from "../../../components/KnowledgeStudioDocument.astro";\n\n<KnowledgeStudioDocument id="'+id+'" />\n'});
  changes.set('src/data/studio-documents.json',{text:JSON.stringify({...snapshot.documents,[id]:body},null,2)+'\n'});
  const existing=snapshot.metadata??{};assert(!Object.hasOwn(existing,id),'Metadata đã tồn tại');changes.set('src/data/studio-metadata.json',{text:JSON.stringify({...existing,[id]:{...metadata,date}},null,2)+'\n'});
  changes.set(index,{text:source.trimEnd()+'\n\n- ['+label+'](/khoahoctienghan/'+route+')\n'});
 }
 return {route,changes};
}
