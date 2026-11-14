// Tokenize only safe public web links. Astro renders strings as escaped text.
export function linkParts(value){
 const text=String(value??'');
 const parts=[];let end=0;
 for(const m of text.matchAll(/https?:\/\/[^\s<>"']+/gi)){
  let raw=m[0];
  const trailing=raw.match(/[.,;!?)\]]+$/)?.[0]||'';
  raw=raw.slice(0,raw.length-trailing.length);
  let url;try{url=new URL(raw)}catch{continue}
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password)continue;
  if(m.index>end)parts.push({text:text.slice(end,m.index)});
  parts.push({text:url.hostname,href:url.href});
  end=m.index+raw.length;
 }
 if(end<text.length)parts.push({text:text.slice(end)});
 return parts;
}
export function referenceEntry(value){
 const parts=linkParts(value);
 const links=parts.filter(p=>p.href);
 if(links.length!==1)return null;
 const index=parts.indexOf(links[0]);
 const label=parts.slice(0,index).map(p=>p.text).join('').trim().replace(/[:：–—-]\s*$/,'').trim();
 const ending=parts.slice(index+1).map(p=>p.text).join('').trim();
 if(ending&&!/^[.,;!?)\]]+$/.test(ending))return null;
 return {label:label||links[0].text,href:links[0].href,host:links[0].text};
}
export function isReferenceHeading(value){
 return /^(tài liệu|tham khảo|nguồn tham khảo|nguồn và tài liệu)/iu.test(String(value).trim());
}
