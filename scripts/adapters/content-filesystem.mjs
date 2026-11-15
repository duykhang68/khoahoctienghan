import {readdir,readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
export function createContentFilesystem(root='src/content/docs'){
 return {
  async paths(){return (await readdir(root,{recursive:true})).filter(p=>/\.mdx?$/.test(p));},
  async pages(paths){return Promise.all(paths.map(async path=>({path,content:await readFile(root+'/'+path,'utf8')})));},
  text:path=>readFile(path,'utf8'),
  async json(path){return JSON.parse(await readFile(path,'utf8'));},
  bytes:path=>readFileSync(path)
 };
}
