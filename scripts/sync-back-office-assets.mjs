// Keep Worker deployable as one exact-SHA module without bundling credentials.
import {readFile,writeFile} from 'node:fs/promises';
import {topics as allTopics} from '../src/lib/knowledge-topics.ts';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const topics=allTopics.map(({id,title})=>({id,title}));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const template=await read('back-office/sheets.html');
const html=template.replace('__TOPICS_JSON__',esc(JSON.stringify(topics))).replace('__TOPIC_OPTIONS__',topics.map(t=>'<option value="'+esc(t.id)+'">'+esc(t.title)+'</option>').join(''));
const paths=["sheet-blog/browser.mjs","sheet-blog/model.mjs","sheet-blog/progress-browser.mjs","sheet-blog/progress.mjs","sheet-blog/source.mjs","editor-v2/github.mjs","editor-v2/model.mjs","editor-v2/drawio-source.mjs"];
const assets={};
for(const p of paths)assets[p]=await read('src/lib/'+p);
assets['sheet-blog/entry.mjs']="import {mountSheetBlog} from './browser.mjs';\nmountSheetBlog(document.querySelector('[data-sheet-blog]'));\n";
assets['sheet-blog.css']=await read('src/styles/sheet-blog.css');
const block='// BEGIN GENERATED SHEETS ASSETS\nconst sheetsBundle='+JSON.stringify({html,assets,topics:topics.map(t=>t.id)})+';\n// END GENERATED SHEETS ASSETS';
const url=new URL('../back-office/worker.mjs',import.meta.url),old=await readFile(url,'utf8');
const start=old.indexOf('// BEGIN GENERATED SHEETS ASSETS'),end=old.indexOf('// END GENERATED SHEETS ASSETS');
if(start<0||end<start)throw Error('Missing generated Sheets asset marker');
const next=old.slice(0,start)+block+old.slice(end+'// END GENERATED SHEETS ASSETS'.length);
if(process.argv.includes('--check')){if(next!==old)throw Error('Private Sheets assets stale; run npm run sync:back-office');console.log('Private Sheets assets match source');}else await writeFile(url,next);
