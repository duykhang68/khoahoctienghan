import {readFile,readdir} from 'node:fs/promises';
import {validateMenu,routesFromPaths} from '../src/lib/knowledge-menu.mjs';
const dir='src/content/docs';
const files=(await readdir(dir,{recursive:true})).map(p=>dir+'/'+p);
const posts=JSON.parse(await readFile('src/data/techblog/posts.json','utf8'));
validateMenu(JSON.parse(await readFile('src/data/knowledge-menu.json','utf8')),routesFromPaths(files,posts));
console.log('Knowledge menu links validated');
