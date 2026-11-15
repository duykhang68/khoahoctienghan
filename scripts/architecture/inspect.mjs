import {parse} from '@babel/parser';
import {posix} from 'node:path';

const roots=['core/','src/lib/editor-v2/core/','src/lib/sheet-blog/core/','editor-github/core/'];
const transitionalLeaf='src/lib/editor-v2/media-validation.mjs';
const sourceExtension=/\.(?:[mc]?js|jsx|[mc]?ts|tsx)$/;
export const isCorePath=path=>path===transitionalLeaf||(roots.some(root=>path.startsWith(root))&&sourceExtension.test(path));
const forbidden=new Set(['fetch','XMLHttpRequest','WebSocket','EventSource','Request','Response','process','global','globalThis','window','document','navigator','localStorage','sessionStorage','indexedDB','caches','crypto','performance','Deno','Bun','self','console','setTimeout','setInterval','clearTimeout','clearInterval','queueMicrotask','requestAnimationFrame','Worker','SharedWorker','BroadcastChannel','FileReader','createImageBitmap','require','eval','Function','module','exports']);
const safeBuiltins=new Set(['node:assert/strict','node:util']);
const loc=node=>node.loc?.start?.line||1;
const key=node=>node?.type==='Identifier'?node.name:node?.type==='StringLiteral'?node.value:null;
const memberName=node=>node?.computed?(node.property?.type==='StringLiteral'?node.property.value:null):key(node?.property);
function propertyOnly(node,parent,role){
 return parent&&((['MemberExpression','OptionalMemberExpression'].includes(parent.type)&&role==='property'&&!parent.computed)||
 (['ObjectProperty','ObjectMethod','ClassMethod','ClassProperty','ClassPrivateProperty'].includes(parent.type)&&role==='key'&&!parent.computed&&!parent.shorthand)||
 (parent.type==='ImportSpecifier'&&role==='imported')||(parent.type==='ExportSpecifier'&&role==='exported')||
 (['LabeledStatement','BreakStatement','ContinueStatement'].includes(parent.type)&&role==='label'));
}
function walk(node,visit,parent=null,role=''){
 if(!node||typeof node!=='object')return;
 if(typeof node.type==='string')visit(node,parent,role);
 for(const [name,value] of Object.entries(node)){
  if(['loc','start','end','extra','leadingComments','trailingComments','innerComments','comments','tokens','errors'].includes(name))continue;
  if(Array.isArray(value)){for(const child of value)if(child&&typeof child.type==='string')walk(child,visit,node,name);}
  else if(value&&typeof value.type==='string')walk(value,visit,node,name);
 }
}
export function inspectArchitecture(sources){
 const violations=[],graph=new Map();
 const report=(path,node,message)=>violations.push({path,line:loc(node),message});
 for(const [path,source] of sources){
  if(!isCorePath(path)){report(path,nullNode(),'Unexpected non-core source');continue;}
  graph.set(path,[]);
  if(Buffer.byteLength(source,'utf8')>8000)report(path,nullNode(),'Core module exceeds 8,000 UTF-8 bytes; split coherently or review budget');
  let ast;try{ast=parse(source,{sourceType:'module',createImportExpressions:true,plugins:[...( /\.[mc]?tsx?$/.test(path)?['typescript']:[]),...(/\.[jt]sx$/.test(path)?['jsx']:[])]});}catch(e){report(path,{loc:e.loc?{start:e.loc}:null},'Syntax: '+e.message);continue;}
  walk(ast,(node,parent,role)=>{
   if(['ImportDeclaration','ExportNamedDeclaration','ExportAllDeclaration'].includes(node.type)&&node.source){
    const name=node.source.value;
    if(safeBuiltins.has(name)){
     if(name==='node:util'&&(node.type!=='ImportDeclaration'||node.specifiers.some(s=>s.type!=='ImportSpecifier'||key(s.imported)!=='isDeepStrictEqual')))report(path,node,'Only named isDeepStrictEqual is allowed from node:util');
    }else if(name.startsWith('.')){
     const resolved=posix.normalize(posix.join(posix.dirname(path),name));
     if(!isCorePath(resolved)||!sources.has(resolved))report(path,node,'Core dependency missing or outside boundary: '+name);
     else graph.get(path).push(resolved);
    }else report(path,node,'Forbidden dependency: '+name);
   }
   if(node.type==='ImportExpression'||(node.type==='CallExpression'&&node.callee?.type==='Import'))report(path,node,'Dynamic import in core');
   if(node.type==='Identifier'&&forbidden.has(node.name)&&!propertyOnly(node,parent,role))report(path,node,'Reserved effect identifier: '+node.name);
   if(node.type==='MetaProperty'&&node.meta?.name==='import')report(path,node,'Runtime import.meta in core');
   if(node.type==='ThisExpression')report(path,node,'Implicit this state in core');
   if(['MemberExpression','OptionalMemberExpression'].includes(node.type)){
    const object=node.object?.name,member=memberName(node);
    if((object==='Date'&&member==='now')||(object==='Math'&&member==='random'))report(path,node,'Implicit clock/random: '+object+'.'+member);
   }
   if((node.type==='CallExpression'||node.type==='OptionalCallExpression')&&node.callee?.type==='Identifier'&&node.callee.name==='Date')report(path,node,'Date() reads runtime clock');
   if(node.type==='NewExpression'&&node.callee?.name==='Date'&&node.arguments.length===0)report(path,node,'new Date() requires explicit input');
  });
 }
 const visited=new Set(),active=new Set(),stack=[];
 function dfs(path){
  if(active.has(path)){report(path,nullNode(),'Circular core dependency: '+[...stack.slice(stack.indexOf(path)),path].join(' -> '));return;}
  if(visited.has(path))return;
  active.add(path);stack.push(path);
  for(const dependency of graph.get(path)||[])dfs(dependency);
  stack.pop();active.delete(path);visited.add(path);
 }
 for(const path of graph.keys())dfs(path);
 return {violations,graph};
}
function nullNode(){return {};}
export function coreClosure(paths,graph){
 const seen=new Set(),visit=path=>{if(seen.has(path)||!graph.has(path))return;seen.add(path);for(const next of graph.get(path))visit(next);};
 for(const path of paths)visit(path);
 return [...seen].sort();
}
