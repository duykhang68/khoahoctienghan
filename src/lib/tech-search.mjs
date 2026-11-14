// Exact Unicode phrase matching, weighted by field.
export const normalizeSearch=value=>String(value??'').normalize('NFC').replace(/\s+/gu,' ').trim();
export function matchPost(entries,query,scope='all'){
 const q=normalizeSearch(query);
 if(!q)return null;
 const escaped=Array.from(q,c=>'\\^$.*+?()[]{}|'.includes(c)?'\\'+c:c).join('');
 const word=/[\p{L}\p{N}\p{M}]/u;
 const pattern=new RegExp((word.test(q[0])?'(?<![\\p{L}\\p{N}\\p{M}])':'')+escaped+(word.test(q.at(-1))?'(?![\\p{L}\\p{N}\\p{M}])':''),'iu');
 const weights={title:100,summary:60,heading:40,body:20,reference:5};
 let best=null,count=0;
 for(const entry of entries){
  if(scope==='title'&&entry.kind!=='title')continue;
  const value=normalizeSearch(entry.text),match=pattern.exec(value);
  if(!match)continue;
  count++;
  const weight=weights[entry.kind]||0;
  if(!best||weight>best.weight){
   const start=Math.max(0,match.index-76),end=Math.min(value.length,match.index+match[0].length+105);
   best={kind:entry.kind,heading:entry.heading||'',weight,before:(start?'…':'')+value.slice(start,match.index),highlight:match[0],after:value.slice(match.index+match[0].length,end)+(end<value.length?'…':'')};
  }
 }
 return best?{...best,score:best.weight+Math.min(count,9)}:null;
}
