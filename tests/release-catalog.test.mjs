import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {releaseCatalog} from '../scripts/write-release-marker.mjs';
test('release catalog uses only published routes and preserves exact SHA',async()=>{
 const root=await mkdtemp(join(tmpdir(),'release-library-'));
 const put=async(p,s='')=>{const path=join(root,p);await mkdir(dirname(path),{recursive:true});await writeFile(path,s)};
 try{
 const sha='a'.repeat(40);
 await put('src/data/techblog/posts.json',JSON.stringify([{slug:'one',title:'One',summary:'Public',private:'not exported'}]));
 await put('src/content/docs/ngon-ngu/index.mdx','- [Hangul](/khoahoctienghan/ngon-ngu/hangul/)');
 await put('src/content/docs/ngon-ngu/hangul.md','---\ntitle: Hangul\n---');
 await put('dist/techblog/one/index.html');await put('dist/ngon-ngu/hangul/index.html');
 const result=await releaseCatalog(root,sha);assert.equal(result.sha,sha);assert.equal(result.libraryVersion,1);assert.deepEqual(result.library.map(r=>r.title),['One','Hangul']);assert.equal(result.library[0].private,undefined);
 await put('src/content/docs/ngon-ngu/missing.md');await assert.rejects(()=>releaseCatalog(root,sha),/ENOENT/);
 await assert.rejects(()=>releaseCatalog(root,'bad'),/Invalid release SHA/);
 }finally{await rm(root,{recursive:true,force:true})}
});
