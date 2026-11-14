import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {containsPotentialSecret} from './secret-patterns.mjs';
const files=execFileSync('git',['ls-files','-z']).toString().split('\0').filter(Boolean);
for(const f of files){
 if(f==='scripts/security-check.mjs')continue;
 if(/(^|\/)\.env(?:\..*)?$/.test(f)&&!f.endsWith('.example'))throw Error('Tracked environment file: '+f);
 let s;try{s=readFileSync(f,'utf8')}catch{continue}
 if(containsPotentialSecret(s))throw Error('Potential secret in '+f);
}
console.log('Basic tracked-file secret checks passed.');
