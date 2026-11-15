import {categoryIndex} from './taxonomy.mjs';
import {normalizeKnowledgeMetadata} from './metadata.mjs';
/** Stable sort without mutating the supplied records. */
export const sortedPosts=posts=>posts.slice().sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
export const dateLabel=date=>new Intl.DateTimeFormat('vi-VN',{dateStyle:'long',timeStyle:'medium',timeZone:'Asia/Ho_Chi_Minh',hour12:false}).format(new Date(date));
export const yearLabel=date=>new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(date));
export const readingMinutes=post=>post.readingMinutes??Math.max(1,Math.ceil([post.title,post.summary,...post.sections.flatMap(s=>[s.heading,...s.paragraphs])].join(' ').trim().split(/\s+/).length/200));
export const archiveYears=posts=>[...new Set(posts.map(p=>yearLabel(p.date)))];
export function coverURL(path,base){
 if(!path)return undefined;
 if(!path.startsWith('/')||path.startsWith('//')||path.includes('..'))return undefined;
 return path.startsWith(base+'/')?path:base+path;
}
export function techIndex(input){const posts=sortedPosts(input);return {posts,categories:categoryIndex(posts),archiveYears:archiveYears(posts)};}
export const normalizeSearch=value=>String(value??'').normalize('NFC').toLocaleLowerCase('vi').normalize('NFD').replace(/\p{M}/gu,'').replace(/đ/g,'d').trim();
export function buildKnowledgeFeed(entries,metadata,topics){
 const catalog=new Map(topics.map(t=>[t.id,t]));
 return entries.flatMap(entry=>{
  const slug=entry.id.replace(/\/index$/,'').replace(/\/$/,'');
  const [topic,...parts]=slug.split('/');
  if(entry.data?.draft||!catalog.has(topic)||!parts.length)return [];
  const raw=metadata[topic+'--'+parts.join('--')]||{};
  const value=normalizeKnowledgeMetadata(raw);
  const title=entry.data.title,summary=entry.data.description||'';
  return [{slug,topic,topicTitle:catalog.get(topic).title,title,summary,...value,search:normalizeSearch([title,summary,catalog.get(topic).title,...value.labels,value.series?.name].join(' '))}];
 }).sort((a,b)=>(Date.parse(b.date||'')||0)-(Date.parse(a.date||'')||0)||a.title.localeCompare(b.title,'vi')||a.slug.localeCompare(b.slug));
}
export function matchesKnowledgeArticle(article,{query='',topic='',label='',series=''}={}){
 const words=normalizeSearch(query).split(/\s+/).filter(Boolean);
 return (!topic||article.topic===topic)&&(!label||article.labels.includes(label))&&(!series||article.series?.name===series)&&words.every(word=>article.search.includes(word));
}
export function orderedTopics(topics, sequence){
 const byId=new Map(topics.map(x=>[x.id,x]));
 if(byId.size!==topics.length||!Array.isArray(sequence)||sequence.length!==topics.length||new Set(sequence).size!==topics.length||!sequence.every(id=>byId.has(id)))throw Error('Knowledge navigation must contain each approved topic exactly once');
 return sequence.map(id=>byId.get(id));
}
