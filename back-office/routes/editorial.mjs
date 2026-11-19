import {reply,page,htmlHeaders} from '../http.mjs';
import {random} from '../auth/session.mjs';
import {dashboardSnapshot,librarySnapshot,categorySnapshot} from '../adapters/published-catalog.mjs';
import {editorBundle} from '../generated/editor-assets.mjs';
import {sheetsBundle} from '../generated/sheets-assets.mjs';
import {findPrivateAsset} from '../adapters/asset-loader.mjs';
import {studioMarkup,studioScript,pipelineMarkup} from '../views/studio.mjs';
import {engineeringMarkup,engineeringScript,engineeringStyle} from '../views/engineering.mjs';
import {libraryMarkup,libraryScript} from '../views/library.mjs';
import {categoryMarkup,categoryScript} from '../views/categories.mjs';
import {publicationSnapshot} from '../adapters/publication-progress.mjs';

// Only reachable after the Worker authorization and GET/HEAD gates.
export async function routeEditorial(req,env,url){
 if(url.pathname==='/admin/schedules/')return reply(req.method==='HEAD'?null:page(editorBundle.schedulesHtml+'<script type="module" src="/admin/assets/editor-v2/server-schedule-browser.mjs"></script>'),200,{...htmlHeaders,'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});
 if(url.pathname==='/admin/api/publication-progress/'){
  if(req.method!=='GET')return reply('Method not allowed',405);
  if(url.search)return reply('Invalid request',400);
  try{return reply(JSON.stringify(await publicationSnapshot(env)),200,{'Content-Type':'application/json; charset=utf-8'});}
  catch(error){console.warn('Publication progress: '+(error?.message==='GITHUB_RATE_LIMITED'?'RATE_LIMITED':'UNAVAILABLE'));return reply(JSON.stringify({error:'PUBLICATION_PROGRESS_UNAVAILABLE'}),503,{'Content-Type':'application/json; charset=utf-8'});}
 }
 if(url.pathname==='/admin/api/library/'){
  if(req.method!=='GET')return reply('Method not allowed',405);
  if(url.search)return reply('Invalid request',400);
  try{return reply(JSON.stringify(await librarySnapshot()),200,{'Content-Type':'application/json; charset=utf-8'});}catch(e){const code=/^(?:RELEASE_HTTP_[1-5][0-9]{2}|RELEASE_CATALOG_INVALID|RELEASE_ROW_INVALID|RELEASE_ROW_DUPLICATE)$/.test(e?.message||'')?e.message:'RELEASE_NETWORK_OR_PARSE';console.warn('Content Library snapshot: '+code);return reply(JSON.stringify({error:'LIBRARY_UNAVAILABLE'}),502,{'Content-Type':'application/json; charset=utf-8'});}
 }
 if(url.pathname==='/admin/library/'){const nonce=random();return reply(req.method==='HEAD'?null:page(libraryMarkup+'<script nonce="'+nonce+'">'+libraryScript+'</script>'),200,{...htmlHeaders,'Content-Security-Policy':"default-src 'none'; script-src 'nonce-"+nonce+"'; style-src 'unsafe-inline'; connect-src 'self' https://api.github.com https://raw.githubusercontent.com; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});}
 if(url.pathname==='/admin/api/dashboard/'){
  if(req.method!=='GET')return reply('Method not allowed',405);
  if(url.search)return reply('Invalid request',400);
  try{return reply(JSON.stringify(await dashboardSnapshot()),200,{'Content-Type':'application/json; charset=utf-8'});}catch{return reply(JSON.stringify({error:'SNAPSHOT_UNAVAILABLE'}),502,{'Content-Type':'application/json; charset=utf-8'});}
 }
 if(url.pathname==='/admin/api/categories/'){if(req.method!=='GET')return reply('Method not allowed',405);if(url.search)return reply('Invalid request',400);try{return reply(JSON.stringify(await categorySnapshot()),200,{'Content-Type':'application/json; charset=utf-8'});}catch{return reply(JSON.stringify({error:'CATEGORY_ORDER_UNAVAILABLE'}),502,{'Content-Type':'application/json; charset=utf-8'});}}
 if(url.pathname==='/admin/categories/'){const nonce=random();return reply(req.method==='HEAD'?null:page(categoryMarkup+'<script nonce="'+nonce+'">'+categoryScript+'</script>'),200,{...htmlHeaders,'Content-Security-Policy':"default-src 'none'; script-src 'nonce-"+nonce+"'; style-src 'unsafe-inline'; connect-src 'self' https://api.github.com; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});}
 if(url.pathname==='/admin/drafts/')return reply(req.method==='HEAD'?null:page(editorBundle.draftsHtml+'<script type="module" src="/admin/assets/editor-v2/drafts-browser.mjs"></script>'),200,{...htmlHeaders,'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self' https://api.github.com; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});
 if(url.pathname==='/admin/pipeline/')return reply(req.method==='HEAD'?null:page('<link rel="stylesheet" href="/admin/assets/sheet-blog.css">'+pipelineMarkup+'<script type="module" src="/admin/assets/sheet-blog/pipeline-entry.mjs"></script>'),200,{...htmlHeaders,'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});
 if(url.pathname==='/admin/sheets/')return reply(req.method==='HEAD'?null:page('<link rel="stylesheet" href="/admin/assets/sheet-blog.css"><nav aria-label="Back Office"><a href="/admin/">← Trung tâm quản trị</a></nav>'+sheetsBundle.html.replace('__CLIENT_ID__',env.GOOGLE_CLIENT_ID)+'<script type="module" src="/admin/assets/sheet-blog/entry.mjs"></script>'),200,{...htmlHeaders,'Cross-Origin-Opener-Policy':'same-origin-allow-popups','Content-Security-Policy':"default-src 'none'; script-src 'self' https://accounts.google.com/gsi/client; style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style; frame-src https://accounts.google.com; connect-src 'self' https://accounts.google.com https://sheets.googleapis.com https://api.github.com; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});
 if(url.pathname==='/admin/editor/')return reply(req.method==='HEAD'?null:page('<link rel="stylesheet" href="/admin/assets/editor-v2.css"><nav aria-label="Back Office"><a href="/admin/">← Trung tâm quản trị</a> · <a href="/admin/library/">Thư viện bài viết</a> · <a href="/admin/drafts/">Bản nháp và lịch xuất bản</a> · <a href="/admin/schedules/">Lịch máy chủ</a> · <a href="/admin/sheets/">Import Google Sheets VN</a> · <a href="/admin/pipeline/">Publication Pipeline</a></nav>'+editorBundle.html+'<script type="module" src="/admin/assets/editor-v2/entry.mjs"></script>'),200,{...htmlHeaders,'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-src https://embed.diagrams.net; connect-src 'self' https://api.github.com https://raw.githubusercontent.com; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});
 if(url.pathname.startsWith('/admin/assets/')){const name=url.pathname.slice('/admin/assets/'.length);const asset=findPrivateAsset(name);if(asset===null)return reply('Not found',404);return reply(req.method==='HEAD'?null:asset,200,{'Content-Type':name.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8'});}
 if(url.pathname.startsWith('/admin/article-check/')){
  const match=url.pathname.match(/^\/admin\/article-check\/([a-z0-9-]+)\/([a-z0-9]+(?:-[a-z0-9]+)*)\/$/);
  if(!match||url.search||match[2].length>200||!['techblog',...sheetsBundle.topics].includes(match[1]))return reply('Invalid route',400);
  try{const upstream=await fetch('https://duykhang68.github.io/khoahoctienghan/'+match[1]+'/'+match[2]+'/',{method:'HEAD',redirect:'manual',headers:{'Cache-Control':'no-cache'}});return reply(null,upstream.status===200?200:upstream.status===404?404:502);}catch{return reply(null,502);}
 }
 if(url.pathname==='/admin/engineering/'){const nonce=random();return reply(req.method==='HEAD'?null:page('<style>'+engineeringStyle+'</style>'+engineeringMarkup+'<script nonce="'+nonce+'">'+engineeringScript+'</script>'),200,{...htmlHeaders,'Content-Security-Policy':"default-src 'none'; script-src 'nonce-"+nonce+"'; style-src 'unsafe-inline'; connect-src https://api.github.com; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});}
 if(url.pathname!=='/'&&url.pathname!=='/admin/')return reply('Not found',404);
 const nonce=random();return reply(req.method==='HEAD'?null:page(studioMarkup+'<nav aria-label="Các công cụ Editorial Studio"><a href="/admin/categories/">Quản lý chuyên mục</a> · <a href="/admin/drafts/">Bản nháp và lịch xuất bản</a> · <a href="/admin/schedules/">Lịch máy chủ</a> · <a href="/admin/pipeline/">Publication Pipeline</a></nav>'+'<script type="module" nonce="'+nonce+'">'+studioScript+'</script>'),200,{...htmlHeaders,'Content-Security-Policy':"default-src 'none'; script-src 'self' 'nonce-"+nonce+"'; style-src 'unsafe-inline'; connect-src 'self' https://api.github.com; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});
}
