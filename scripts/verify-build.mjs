import assert from 'node:assert/strict';
import {readFile,access,readdir} from 'node:fs/promises';
for(const path of ['index.html','ngon-ngu/index.html','ngon-ngu/hangul/index.html','techblog/index.html','pagefind']){
 await access('dist/'+path);
}
const home=await readFile('dist/index.html','utf8');
assert(home.includes('/khoahoctienghan/ngon-ngu/'),'Project-base topic URL missing');
assert(!/href=["']\/ngon-ngu\//.test(home),'Root-relative links would escape project base');
const tech=await readFile('dist/techblog/index.html','utf8');
assert(tech.includes('Engineering'),'Tech Blog did not render');
console.log('Static smoke checks passed (home, topic, article, search, Tech Blog).');
