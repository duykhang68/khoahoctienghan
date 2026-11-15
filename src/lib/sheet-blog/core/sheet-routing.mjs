import {equal} from './contracts.mjs';
import {slugify} from '../../editor-v2/core/metadata.mjs';
export function recommendDestination(row,topics){
 const topic=topics.find(t=>equal(t.title,row.topic)||equal(t.id,row.topic));
 if(equal(row.group,'Tri thức Hàn Quốc')&&topic)return {kind:'knowledge',category:topic.id};
 if(['Tech Blog','Engineering Blog','Engineering'].some(s=>equal(row.group,s)))return {kind:'tech',category:''};
 return {kind:'',category:topic?.id||''};
}

export function publisherRoute(base,kind,category,title){return base+'/'+(kind==='tech'?'techblog':category)+'/'+slugify(title)+'/';}
export function canPreviewRoute(selected,kind,category){return Boolean(selected&&kind&&(kind!=='knowledge'||category));}
