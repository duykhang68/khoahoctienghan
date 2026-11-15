import {readFile,readdir,access,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const slug=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export async function releaseCatalog(root,sha){
 if(typeof sha!=='string'||!/^[a-f0-9]{40}$/.test(sha))throw Error('Invalid release SHA');
 const read=p=>readFile(join(root,p),'utf8'),exists=p=>access(join(root,p));
 const postPath='src/data/techblog/posts.json',posts=JSON.parse(await read(postPath));
 if(!Array.isArray(posts))throw Error('Invalid posts array');
 const rows=posts.map(p=>{if(typeof p.slug!=='string'||!slug.test(p.slug)||typeof p.title!=='string'||!p.title.trim())throw Error('Invalid post');return {kind:'tech',category:'techblog',slug:p.slug,title:p.title,summary:typeof p.summary==='string'?p.summary:'',date:typeof p.date==='string'?p.date:'',path:postPath};});
 const prefix='src/content/docs';
 for(const category of (await readdir(join(root,prefix),{withFileTypes:true})).filter(e=>e.isDirectory()&&slug.test(e.name)).map(e=>e.name).sort()){
  const files=(await readdir(join(root,prefix,category),{withFileTypes:true})).filter(e=>e.isFile()&&/^[a-z0-9]+(?:-[a-z0-9]+)*\.mdx?$/.test(e.name)&&!/^index\.mdx?$/.test(e.name)).map(e=>e.name).sort();
  if(!files.length)continue;
  let index='';for(const ext of ['md','mdx']){try{index=await read(prefix+'/'+category+'/index.'+ext);break}catch(e){if(e.code!=='ENOENT')throw e}}
  const titles=new Map();
  for(const m of index.matchAll(/^\s*-\s+\[([^\n]+?)\]\(\/khoahoctienghan\/([a-z0-9-]+)\/([a-z0-9-]+)\/\)\s*$/gm)){if(m[2]===category)titles.set(m[3],m[1]);}
  for(const file of files){const id=file.replace(/\.mdx?$/,'');rows.push({kind:'knowledge',category,slug:id,title:titles.get(id)||id,titleFromIndex:titles.has(id),summary:'',date:'',path:prefix+'/'+category+'/'+file});}
 }
 const keys=new Set();
 for(const row of rows){const key=row.category+'/'+row.slug;if(keys.has(key))throw Error('Duplicate release route: '+key);keys.add(key);await exists('dist/'+key+'/index.html');}
 return {sha,libraryVersion:1,library:rows};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const data=await releaseCatalog(process.cwd(),process.env.GITHUB_SHA);
 await writeFile('dist/release-sha.json',JSON.stringify(data));
 console.log('Release catalog: '+data.library.length+' public articles');
}
