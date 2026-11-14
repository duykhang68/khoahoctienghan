import assert from 'node:assert/strict';
import {readFile,access,readdir} from 'node:fs/promises';
for(const path of ['index.html','ngon-ngu/index.html','ngon-ngu/hangul/index.html','techblog/index.html','techblog/editorv2/index.html','pagefind']){
 await access('dist/'+path);
}
const home=await readFile('dist/index.html','utf8');
assert(home.includes('/khoahoctienghan/ngon-ngu/'),'Project-base topic URL missing');
assert(!/href=["']\/ngon-ngu\//.test(home),'Root-relative links would escape project base');
const tech=await readFile('dist/techblog/index.html','utf8');
assert(tech.includes('Engineering'),'Tech Blog did not render');
console.log('Static smoke checks passed (home, topic, article, search, Tech Blog).');


// Audit rendered links sitewide, not only the source config. Starlight adds BASE
// for sidebar paths; Astro templates add it explicitly via import.meta.env.BASE_URL.
const base=(process.env.SITE_BASE||'/khoahoctienghan').replace(/\/$/,'');
const origin=process.env.SITE_URL||'https://duykhang68.github.io';
const expected=base+'/techblog/';
const htmlPaths=(await readdir('dist',{recursive:true})).filter(p=>p.endsWith('.html'));
let checked=0;
for(const path of htmlPaths){
 const html=await readFile('dist/'+path,'utf8');
 const pagePath=base+'/'+path.replace(/index\.html$/,'');
 const anchors=[...html.matchAll(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi)];
 for(const match of anchors){
  const raw=(match[1]??match[2]).replace(/&amp;/g,'&');
  const label=match[3].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  let url;try{url=new URL(raw,new URL(pagePath,origin));}catch{continue;}
  if(url.origin!==new URL(origin).origin)continue;
  const navLabel=/^(?:Tech Blog|Engineering Blog|Quay lại Engineering Blog|← Quay lại Engineering Blog)$/i.test(label);
  if(!navLabel&&!/(?:^|\/)techblog(?:\/|$)/i.test(url.pathname))continue;
  assert(url.pathname.startsWith(expected),path+' incorrect Tech Blog destination: '+raw);
  if(navLabel)assert.equal(url.pathname,expected,path+' noncanonical Tech Blog navigation');
  const relative=url.pathname.slice(base.length).replace(/^\//,'');
  const target=relative.endsWith('/')?relative+'index.html':relative;
  await access('dist/'+target);
  checked++;
 }
}
assert(checked>0,'Expected rendered Tech Blog links');
console.log('Validated '+checked+' rendered Tech Blog links across '+htmlPaths.length+' HTML files');
