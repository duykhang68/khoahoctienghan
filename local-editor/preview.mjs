import assert from 'node:assert/strict';
import http from 'node:http';
import {execFile,execFileSync} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,mkdir,writeFile,rm,symlink,readFile,stat,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,extname,sep} from 'node:path';
import {applyChanges} from './core.mjs';
import {mediaPath} from '../src/lib/editor-media.mjs';
const run=promisify(execFile);
const BASE='/khoahoctienghan/';
export const validPreviewRoute=route=>typeof route==='string'&&/^(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)*$/.test(route);
function parts(text){return /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/.exec(text||'')}
function metadataRest(front){return front.split(/\r?\n/).filter(line=>!/^(?:title|description):[ \t]*[^\r\n]*$/.test(line)).join('\n').trim()}
export function assertPreviewSource(path,content,old){
 const doc=parts(content),previous=parts(old);assert(doc,'Invalid preview document');
 // Preview executes only trusted checkout code. Authored Markdown/MDX subset is deliberately strict.
 assert(metadataRest(doc[1])===metadataRest(previous?.[1]||''),'Preview cannot change advanced metadata');
 for(const line of doc[1].split(/\r?\n/).filter(l=>/^(title|description):/.test(l))){
  const value=line.slice(line.indexOf(':')+1).trim();assert(value&&!/^[>|&*!{[\]]/.test(value)&&!/[\r\n]/.test(value),'Unsafe preview metadata');
 }
 const depth=path.slice('src/content/docs/'.length).split('/').length;
 const prefix='../'.repeat(depth+1)+'components/';
 const validImports=new Set(['KnowledgeVisual','KnowledgeImage'].flatMap(name=>["import "+name+" from '"+prefix+name+".astro';",'import '+name+' from "'+prefix+name+'.astro";']));
 const blocks=doc[2].split(/(?:\r?\n){2,}/);
 for(const block of blocks){
  const text=block.trim();if(!text)continue;
  if(path.endsWith('.mdx')&&(validImports.has(text)||/^<(?:KnowledgeVisual|KnowledgeImage) id="[a-z0-9-]+"\s*\/>$/.test(text)))continue;
  assert(!/[<>{}]/.test(text)&&!/(?:^|\n)[ \t]*(?:import|export)\b/.test(text),'Preview does not compile arbitrary MDX/HTML; use supported visual blocks');
 }
}
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2','.ico':'image/x-icon','.wasm':'application/wasm'};
let active=null,building=false;
async function stopPreview(){
 if(!active)return;const current=active;active=null;await new Promise(resolve=>{current.server.close(resolve);current.server.closeAllConnections()});await rm(current.dir,{recursive:true,force:true});
}
export async function createPreview(root,snapshot,changes,route){
 assert(validPreviewRoute(route),'Invalid preview route');assert(!building,'Preview build already running');building=true;
 let temp,server;
 try{
  const base=new Map(Object.entries(snapshot.files).map(([path,value])=>[path,value.content]));
  if(changes.length)applyChanges(base,changes);
  for(const change of changes)if(change.path.startsWith('src/content/docs/')&&change.content!==null&&change.content!==base.get(change.path))assertPreviewSource(change.path,change.content,base.get(change.path)??(change.path.endsWith('.mdx')?base.get(change.path.slice(0,-1)):undefined));
  temp=await mkdtemp(join(tmpdir(),'editor-astro-preview-'));
  const archive=execFileSync('git',['archive','--format=tar',snapshot.sha],{cwd:root,maxBuffer:64*1024*1024});
  execFileSync('tar',['-xf','-','-C',temp],{input:archive,maxBuffer:2*1024*1024});
  await symlink(join(root,'node_modules'),join(temp,'node_modules'),'dir');
  for(const change of changes){const path=join(temp,change.path);if(change.content===null)await rm(path,{force:true});else{await mkdir(dirname(path),{recursive:true});await writeFile(path,mediaPath(change.path)?Buffer.from(change.content,'base64'):change.content)}}
  const env={PATH:process.env.PATH||'/usr/bin:/bin',HOME:temp,TMPDIR:temp,LANG:'C.UTF-8',ASTRO_TELEMETRY_DISABLED:'1',NODE_ENV:'production',SITE_BASE:BASE.slice(0,-1),SITE_URL:'https://duykhang68.github.io'};
  // This is a temporary trusted local build, not an OS sandbox. Never pass GitHub credentials.
  await run(process.execPath,[join(root,'node_modules/astro/bin/astro.mjs'),'build'],{cwd:temp,env,timeout:150000,maxBuffer:8*1024*1024});
  const dist=await realpath(join(temp,'dist'));await stat(join(dist,route,'index.html'));
  server=http.createServer(async(req,res)=>{
   res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
   res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'");
   try{
    const address=server.address();if(req.headers.host!=='127.0.0.1:'+address.port||!['GET','HEAD'].includes(req.method)){res.writeHead(403);return res.end()}
    const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);if(!pathname.startsWith(BASE))throw Error('Invalid path');
    const relative=pathname.slice(BASE.length),file=await realpath(resolve(dist,relative+(pathname.endsWith('/')?'index.html':'')));
    if(!file.startsWith(dist+sep)||!(await stat(file)).isFile())throw Error('Invalid file');
    const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:bytes);
   }catch{res.writeHead(404);res.end('Not found')}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  await stopPreview();active={server,dir:temp};const port=server.address().port;temp=null;server=null;
  return {url:'http://127.0.0.1:'+port+BASE+route,base:snapshot.sha,generatedAt:new Date().toISOString()};
 }finally{building=false;if(server)server.close();if(temp)await rm(temp,{recursive:true,force:true})}
}
export async function disposePreview(){await stopPreview()}
