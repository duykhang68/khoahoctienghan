import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateMenu,routesFromPaths} from '../src/lib/knowledge-menu.mjs';
import {validateVisual} from '../src/lib/tech-visual-validation.mjs';
import {MEDIA_INDEX,mediaPath,validateMedia,validateMediaIndex} from '../src/lib/editor-media.mjs';
export const MENU='src/data/knowledge-menu.json';
export const POSTS='src/data/techblog/posts.json';
export const VISUALS='src/data/knowledge-visuals.json';
export const allowed=p=>typeof p==='string'&&([MENU,POSTS,VISUALS,MEDIA_INDEX].includes(p)||mediaPath(p)||/^src\/content\/docs\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)*[a-z0-9]+(?:-[a-z0-9]+)*\.mdx?$/.test(p));
export const digest=s=>s===null?null:createHash('sha256').update(s).digest('hex');
export function applyChanges(files,changes){
 assert(Array.isArray(changes)&&changes.length>0&&changes.length<=100,'Không có thay đổi hoặc quá 100 tệp');
 const next=new Map(files),seen=new Set();
 for(const c of changes){
  assert(c&&allowed(c.path)&&!seen.has(c.path),'Đường dẫn không được phép hoặc bị trùng');
  seen.add(c.path);
  const old=files.get(c.path)??null;
  assert(digest(old)===c.before,'Xung đột nội dung tại '+c.path+'; Pull và đối chiếu trước khi đồng bộ');
  assert(typeof c.content==='string'&&c.content.length>0&&Buffer.byteLength(c.content)<=2_000_000,'Nội dung trống hoặc vượt giới hạn');
  if(mediaPath(c.path)){validateMedia(c.path,c.content);assert(old===null||old===c.content,'Cannot overwrite immutable WebP');}
  next.set(c.path,c.content);
 }
 const posts=JSON.parse(next.get(POSTS));
 assert(Array.isArray(posts),'Tech Blog phải là danh sách bài viết');
 const slugs=new Set();
 for(const p of posts){
  assert(p&&typeof p.slug==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)&&!slugs.has(p.slug),'Slug Tech Blog không hợp lệ hoặc trùng');
  slugs.add(p.slug);
  assert(typeof p.title==='string'&&p.title.trim()&&typeof p.summary==='string'&&p.summary.trim()&&typeof p.date==='string'&&Number.isFinite(Date.parse(p.date))&&Array.isArray(p.sections)&&Array.isArray(p.issues),'Thiếu metadata bài Tech Blog');
  for(const section of p.sections){
   assert(typeof section.heading==='string'&&Array.isArray(section.paragraphs)&&section.paragraphs.every(x=>typeof x==='string'),'Section không hợp lệ');
   if(section.visuals!==undefined){assert(Array.isArray(section.visuals),'Visuals không hợp lệ');section.visuals.forEach(validateVisual);}
  }
 }
 if(next.has(VISUALS)){const v=JSON.parse(next.get(VISUALS));assert(v&&typeof v==='object'&&!Array.isArray(v),'Visual catalogue không hợp lệ');Object.values(v).forEach(validateVisual);}
 const docs=new Set();
 for(const [p,v] of next)if(p.startsWith('src/content/docs/')){
  const slug=p.replace(/\.mdx?$/,'');assert(!docs.has(slug),'Trùng tên Markdown/MDX: '+p);docs.add(slug);
  assert(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(v)&&/^title:\s*\S.+/m.test(v)&&/^description:\s*\S.+/m.test(v),'Thiếu title/description: '+p);
 }
 const routes=routesFromPaths(next.keys(),posts);
 validateMenu(JSON.parse(next.get(MENU)),routes);
 const knowledgeRoutes=routesFromPaths(next.keys(),[]);knowledgeRoutes.delete('/techblog/');
 const used=validateMediaIndex(JSON.parse(next.get(MEDIA_INDEX)||'{}'),posts,knowledgeRoutes,p=>next.has(p)?validateMedia(p,next.get(p)):null);
 for(const c of changes)if(mediaPath(c.path))assert(used.has(c.path),'Ảnh chưa được chèn vào bài viết');
 return next;
}
export function reconcile(local,remote,drafts){
 const result={...drafts},conflicts=[];
 for(const [path,d] of Object.entries(drafts)){
  if(remote[path]?.content===d.content){delete result[path];continue;}
  const incoming=remote[path]?.hash??null;
  if(incoming!==d.before)conflicts.push(path);
 }
 return {drafts:result,conflicts};
}
