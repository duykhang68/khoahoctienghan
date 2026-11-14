import {normalizeKnowledgeMetadata} from './studio-metadata.mjs';
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
